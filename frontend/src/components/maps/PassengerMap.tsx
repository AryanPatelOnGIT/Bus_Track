"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import {
  Map as GoogleMap,
  AdvancedMarker,
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";
import ETACard from "@/components/maps/ETACard";
import { RouteStop, RouteData } from "@/hooks/useRoutes";
import { interpolatePosition } from "@/lib/mapUtils";
import { useGoogleDirections } from "@/hooks/useGoogleDirections";
import BusIcon from "@/components/shared/BusIcon";

export interface PassengerMapProps {
  targetStop: RouteStop;
  route: RouteData;
}

interface IncomingBusData {
  busId: string;
  routeId: string;
  lat: number;
  lng: number;
  heading: number;
  speed: number;
  timestamp: number;
  status: "active" | "maintenance" | "idle";
}

const INTERPOLATION_MS = 1600;

function TrafficLayer() {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const tl = new google.maps.TrafficLayer();
    tl.setMap(map);
    return () => tl.setMap(null);
  }, [map]);
  return null;
}

function PassengerMapInner({ targetStop, route }: PassengerMapProps) {
  const map = useMap();
  const routesLib = useMapsLibrary("routes");

  const socketRef = useRef<ReturnType<typeof import("socket.io-client").io> | null>(null);

  // Live bus tracking state natively mapped against interpolation frame array
  const rawBusesRef = useRef<Map<string, IncomingBusData>>(new Map());
  const frameRef = useRef<number>(0);
  const [buses, setBuses] = useState<Map<string, IncomingBusData & { displayLat: number; displayLng: number }>>(new Map());

  const [liveEtaMinutes, setLiveEtaMinutes] = useState<number>(0);
  const [liveDistKm, setLiveDistKm] = useState<string>("—");

  const activeBus = Array.from(buses.values())[0];

  /**
   * 1. FULL ROUTE ROAD-SNAP (The "Whole" Obviously)
   * This snaps the entire station-to-station route to roads once.
   */
  const fullRouteWaypoints = useMemo(() => {
    if (!route.stops || route.stops.length < 3) return [];
    // Waypoints for full snap: everything except first and last stop
    return route.stops.slice(1, -1).map(s => ({ lat: s.lat, lng: s.lng }));
  }, [route.stops]);

  const { directionsResult: fullRouteResult } = useGoogleDirections({
    origin: route.stops ? { lat: route.stops[0].lat, lng: route.stops[0].lng } : null,
    destination: route.stops ? { lat: route.stops[route.stops.length - 1].lat, lng: route.stops[route.stops.length - 1].lng } : null,
    waypoints: fullRouteWaypoints,
    enabled: !!route.stops && route.stops.length >= 2,
  });

  /**
   * 2. LIVE SEGMENT SNAP (Active Highlight)
   * Fastest traffic-aware path between the bus and the selected station.
   */
  const activeWaypoints = useMemo(() => {
    if (!route.stops) return [];
    const targetIndex = route.stops.findIndex(s => s.id === targetStop.id);
    if (targetIndex === -1) return [];
    return route.stops.filter((_, idx) => idx < targetIndex).map(s => ({ lat: s.lat, lng: s.lng }));
  }, [route.stops, targetStop.id]);

  const { directionsResult: activeResult, durationValue, distanceValue } = useGoogleDirections({
    origin: activeBus ? { lat: activeBus.displayLat, lng: activeBus.displayLng } : null,
    destination: { lat: targetStop.lat, lng: targetStop.lng },
    waypoints: activeWaypoints,
    enabled: true,
  });

  const fullPolyRef = useRef<google.maps.Polyline | null>(null);
  const activePolyRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!map) return;

    // Background Full Route (Shadow)
    fullPolyRef.current = new google.maps.Polyline({
      map,
      strokeColor: "#3b82f6",
      strokeWeight: 4,
      strokeOpacity: 0.2, // Semi-transparent "Whole" view
      zIndex: 40,
    });

    // Active Highlight Segment (Bright)
    activePolyRef.current = new google.maps.Polyline({
      map,
      strokeColor: "#3b82f6",
      strokeWeight: 7,
      strokeOpacity: 1.0, // Solid bright highlight
      zIndex: 50,
    });

    return () => {
      fullPolyRef.current?.setMap(null);
      activePolyRef.current?.setMap(null);
    };
  }, [map]);

  useEffect(() => {
    if (fullPolyRef.current && fullRouteResult) {
      fullPolyRef.current.setPath(fullRouteResult.routes[0]?.overview_path || []);
    }
  }, [fullRouteResult]);

  useEffect(() => {
    if (activePolyRef.current && activeResult) {
      activePolyRef.current.setPath(activeResult.routes[0]?.overview_path || []);
    }
  }, [activeResult]);

  // Socket Connection structured explicitly mapping room joins & destructured assignments
  useEffect(() => {
    let mounted = true;
    import("socket.io-client").then(({ io }) => {
      if (!mounted) return;
      const socket = io(
        process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000",
        { transports: ["websocket"] }
      );
      socketRef.current = socket;

      socket.on("connect", () => {
        socket.emit("passenger:join");
      });

      socket.on("bus:location-update", (payload: IncomingBusData) => {
        if (payload.routeId === route.id) {
          rawBusesRef.current.set(payload.busId, payload);
        }
      });
    });

    return () => {
      mounted = false;
      if (socketRef.current) {
        socketRef.current.emit("passenger:leaveRoute", { routeId: route.id });
        socketRef.current.disconnect();
      }
      cancelAnimationFrame(frameRef.current);
    };
  }, [route.id]);

  // Request Animation Frame exact specification implementation targeting mapUtils directly!
  useEffect(() => {
    const prevPos = new Map<string, { lat: number; lng: number; ts: number }>();

    const animate = () => {
      const now = Date.now();
      const updated = new Map<string, IncomingBusData & { displayLat: number; displayLng: number }>();

      rawBusesRef.current.forEach((bus, id) => {
        const prev = prevPos.get(id);
        if (!prev) {
          prevPos.set(id, { lat: bus.lat, lng: bus.lng, ts: now });
          updated.set(id, { ...bus, displayLat: bus.lat, displayLng: bus.lng });
          return;
        }

        const t = Math.min((now - prev.ts) / INTERPOLATION_MS, 1);
        const { lat, lng } = interpolatePosition(prev, { lat: bus.lat, lng: bus.lng }, t);

        if (t >= 0.99) {
          prevPos.set(id, { lat: bus.lat, lng: bus.lng, ts: now });
        }

        updated.set(id, { ...bus, displayLat: lat, displayLng: lng });
      });

      setBuses(new Map(updated));
      frameRef.current = requestAnimationFrame(animate);
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, []);

  // Update live ETA UI based on summed directions result (waypoint-aware)
  useEffect(() => {
    if (activeResult) {
      setLiveEtaMinutes(Math.ceil(durationValue / 60));
      setLiveDistKm((distanceValue / 1000).toFixed(1));
    }
  }, [activeResult, durationValue, distanceValue]);

  return (
    <>
      <style>{`
        @keyframes ripple {
          0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.5); }
          70% { box-shadow: 0 0 0 30px rgba(59, 130, 246, 0); }
          100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
        }
      `}</style>
      <GoogleMap
        defaultCenter={targetStop}
        zoom={15}
        disableDefaultUI={true}
        mapId="b1b1b1b1b1b1b1b1"
      >
        <TrafficLayer />

        {/* Live Buses mapping via smooth interpolation mapping */}
        {Array.from(buses.values()).map((bus) => (
          <AdvancedMarker
            key={bus.busId}
            position={{ lat: bus.displayLat, lng: bus.displayLng }}
            zIndex={100}
          >
            <BusIcon heading={bus.heading} status={bus.status} size={48} />
          </AdvancedMarker>
        ))}

        {/* Target Stop Marker pulsing dot label above securely styled */}
        <AdvancedMarker position={targetStop}>
          <div className="relative flex flex-col items-center">
            <span className="mb-3 px-4 py-1.5 bg-brand-surface border border-white/10 text-white rounded-xl text-[10px] whitespace-nowrap z-50 shadow-3xl font-black uppercase tracking-[0.2em]">
              {targetStop.shortName}
            </span>
            <div
              className="absolute w-6 h-6 bg-white/20 rounded-full"
              style={{ animation: "ripple 2s infinite" }}
            />
            <div className="flex items-center justify-center w-6 h-6 bg-white border-4 border-brand-dark rounded-full z-10 shadow-3xl" />
          </div>
        </AdvancedMarker>
      </GoogleMap>

      {/* Persistent ETA Details Card Native Injection */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-sm px-4 z-40">
        <ETACard
          stopName={targetStop.name}
          stopShortName={targetStop.shortName}
          etaMinutes={liveEtaMinutes || 0}
          distanceKm={liveDistKm}
          viaRoad={"Whole Subscribed Path"}
          isArriving={liveEtaMinutes <= 2 && liveEtaMinutes > 0}
          hasArrived={liveEtaMinutes === 0 && !!activeBus}
          isLoading={!activeBus}
        />
      </div>
    </>
  );
}

export default function PassengerMap(props: PassengerMapProps) {
  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <PassengerMapInner {...props} />
    </div>
  );
}
