"use client";

import { useEffect, useRef, useState } from "react";
import {
  Map as GoogleMap,
  AdvancedMarker,
  useMap,
  useMapsLibrary,
  APIProvider,
} from "@vis.gl/react-google-maps";
import ETACard from "@/components/maps/ETACard";
import { BRTSStop } from "@/config/brtsRoutes";
import { interpolatePosition } from "@/lib/mapUtils";
import { useGoogleDirections } from "@/hooks/useGoogleDirections";

export interface PassengerMapProps {
  targetStop: BRTSStop;
  routeId: string;
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

function PassengerMapInner({ targetStop, routeId }: PassengerMapProps) {
  const map = useMap();
  const routesLib = useMapsLibrary("routes");

  const socketRef = useRef<ReturnType<typeof import("socket.io-client").io> | null>(null);

  // Live bus tracking state natively mapped against interpolation frame array
  const rawBusesRef = useRef<Map<string, IncomingBusData>>(new Map());
  const frameRef = useRef<number>(0);
  const [buses, setBuses] = useState<Map<string, IncomingBusData & { displayLat: number; displayLng: number }>>(new Map());
  
  const [liveEtaMinutes, setLiveEtaMinutes] = useState<number>(0);
  const [liveDistKm, setLiveDistKm] = useState<string>("—");
  
  // Draw Polyline dynamically using useGoogleDirections natively debounced tracking real origins
  const activeBus = Array.from(buses.values())[0];

  const { directionsResult } = useGoogleDirections({
    origin: activeBus ? { lat: activeBus.displayLat, lng: activeBus.displayLng } : null,
    destination: { lat: targetStop.lat, lng: targetStop.lng },
    enabled: true,
  });

  const polyRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!map) return;
    polyRef.current = new google.maps.Polyline({
      map,
      strokeColor: "#3b82f6",
      strokeWeight: 6,
      strokeOpacity: 0.8,
      zIndex: 50,
    });
    return () => polyRef.current?.setMap(null);
  }, [map]);

  useEffect(() => {
    if (polyRef.current && directionsResult) {
      polyRef.current.setPath(
        directionsResult.routes[0]?.overview_path?.map(p => ({ lat: p.lat(), lng: p.lng() })) || []
      );
    }
  }, [directionsResult]);

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
        if (payload.routeId === routeId) {
          rawBusesRef.current.set(payload.busId, payload);
        }
      });
    });

    return () => {
      mounted = false;
      if (socketRef.current) {
        socketRef.current.emit("passenger:leaveRoute", { routeId });
        socketRef.current.disconnect();
      }
      cancelAnimationFrame(frameRef.current);
    };
  }, [routeId]);

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

  // DistanceMatrixService logic looping dynamically targeting bestguess traffic model
  useEffect(() => {
    if (!routesLib || !activeBus) return;

    const fetchETA = () => {
      const svc = new google.maps.DistanceMatrixService();
      svc.getDistanceMatrix(
        {
          origins: [{ lat: activeBus.displayLat, lng: activeBus.displayLng }],
          destinations: [targetStop],
          travelMode: google.maps.TravelMode.DRIVING,
          drivingOptions: {
            trafficModel: google.maps.TrafficModel.BEST_GUESS,
            departureTime: new Date(),
          },
        },
        (res, status) => {
          if (status === "OK" && res) {
            const el = res.rows[0]?.elements[0];
            if (el?.status === "OK") {
              const mins = Math.ceil((el.duration_in_traffic?.value ?? el.duration.value) / 60);
              const kms = ((el.distance.value ?? 0) / 1000).toFixed(1);
              setLiveEtaMinutes(mins);
              setLiveDistKm(kms);
            }
          }
        }
      );
    };

    fetchETA();
    const id = setInterval(fetchETA, 30_000);
    return () => clearInterval(id);
  }, [routesLib, targetStop, activeBus?.displayLat, activeBus?.displayLng]);

  return (
    <>
      {/* Skeleton / Initial loading state handled fully within ETACard naturally */}
        <style>{`
          @keyframes pulse-border {
            0%, 100% { border-color: rgba(59, 130, 246, 0.2); box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4); }
            50% { border-color: rgba(59, 130, 246, 1); box-shadow: 0 0 0 8px rgba(59, 130, 246, 0); }
          }
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
            <div
              style={{
                transform: `rotate(${bus.heading}deg)`,
                transition: "transform 0.1s linear",
              }}
            >
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                <rect x="6" y="2" width="12" height="20" rx="3" fill="#1A73E8" stroke="#ffffff" strokeWidth="1.5" />
                <rect x="8" y="4" width="8" height="4" rx="1" fill="#ffffff" />
                <rect x="8" y="10" width="8" height="8" rx="1" fill="#ffffff" />
              </svg>
            </div>
          </AdvancedMarker>
        ))}

        {/* Target Stop Marker pulsing blue dot label above securely styled */}
        <AdvancedMarker position={targetStop}>
          <div className="relative flex flex-col items-center">
            <span className="mb-2 px-3 py-1 bg-white border border-black/10 text-black rounded-full text-[10px] whitespace-nowrap z-50 shadow-xl font-bold uppercase tracking-widest">
              {targetStop.shortName}
            </span>
            <div 
              className="absolute w-6 h-6 bg-blue-500 rounded-full"
              style={{ animation: "ripple 2s infinite" }}
            />
            <div className="flex items-center justify-center w-6 h-6 bg-blue-600 border-[3px] border-white rounded-full z-10 shadow-lg" />
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
          viaRoad={"C.G. Road"}
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
