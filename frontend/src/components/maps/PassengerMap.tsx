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
import { interpolatePosition, getDistanceMeters } from "@/lib/mapUtils";
import { useGoogleDirections } from "@/hooks/useGoogleDirections";
import React from "react";

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

/** Only repaint React state at ~10fps — bus icon updates happen imperatively. */
const DIRECTIONS_UPDATE_THRESHOLD_M = 80;

const RIPPLE_KEYFRAMES = `
  @keyframes ripple {
    0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.5); }
    70% { box-shadow: 0 0 0 30px rgba(59, 130, 246, 0); }
    100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
  }
`;

/** Creates the DOM element for an imperative bus marker */
function createBusMarkerContent(status: string): HTMLDivElement {
  const colors: Record<string, string> = {
    active: "#10b981",
    maintenance: "#ef4444",
    idle: "#f59e0b",
  };
  const color = colors[status] || colors.idle;

  const el = document.createElement("div");
  el.style.cssText = "width:48px;height:48px;position:relative";
  el.innerHTML = `
    ${status === "active" ? `<div style="position:absolute;inset:0;border-radius:50%;background:${color}33;animation:ping 1s cubic-bezier(0,0,0.2,1) infinite;opacity:0.6"></div>` : ""}
    <div class="bus-arrow" style="position:relative;z-index:10;display:flex;align-items:center;justify-content:center;width:48px;height:48px;transition:transform 600ms cubic-bezier(0.4,0,0.2,1);will-change:transform">
      <svg width="34" height="34" viewBox="0 0 24 24" fill="none"><path d="M12 2L20 20L12 16L4 20L12 2Z" fill="${color}" stroke="white" stroke-width="1" stroke-linejoin="round"/></svg>
    </div>
    <div style="position:absolute;bottom:-4px;right:-4px;width:10px;height:10px;border-radius:50%;background:${color};border:2px solid #1a1a2e"></div>
  `;
  return el;
}

function PassengerMapInner({ targetStop, route }: PassengerMapProps) {
  const map = useMap();
  const markerLib = useMapsLibrary("marker");
  const socketRef = useRef<ReturnType<typeof import("socket.io-client").io> | null>(null);

  // Raw bus data — written by socket, read by RAF loop. Never triggers React state.
  const rawBusesRef = useRef<Map<string, IncomingBusData>>(new Map());
  const frameRef = useRef<number>(0);

  // Interpolation state — stored in ref, not React state
  const prevPosRef = useRef<Map<string, { lat: number; lng: number; ts: number }>>(new Map());

  // Imperative markers — keyed by busId
  const busMarkersRef = useRef<Map<string, google.maps.marker.AdvancedMarkerElement>>(new Map());
  const busMarkerContentsRef = useRef<Map<string, HTMLDivElement>>(new Map());

  // For directions — only update origin when bus moves significantly
  const directionsOriginRef = useRef<{ lat: number; lng: number } | null>(null);
  const [directionsOrigin, setDirectionsOrigin] = useState<{ lat: number; lng: number } | null>(null);

  // ETA display state — only changes when directions result changes
  const [liveEtaMinutes, setLiveEtaMinutes] = useState<number>(0);
  const [liveDistKm, setLiveDistKm] = useState<string>("—");

  // Track whether any bus exists (for the ETA card loading state)
  const [hasBus, setHasBus] = useState(false);

  /**
   * 1. FULL ROUTE ROAD-SNAP — fires once when route loads, result is cached.
   */
  const fullRouteWaypoints = useMemo(() => {
    if (!route.stops || route.stops.length < 3) return [];
    return route.stops.slice(1, -1).map(s => ({ lat: s.lat, lng: s.lng }));
  }, [route.stops]);

  const { directionsResult: fullRouteResult } = useGoogleDirections({
    origin: route.stops ? { lat: route.stops[0].lat, lng: route.stops[0].lng } : null,
    destination: route.stops ? { lat: route.stops[route.stops.length - 1].lat, lng: route.stops[route.stops.length - 1].lng } : null,
    waypoints: fullRouteWaypoints,
    enabled: !!route.stops && route.stops.length >= 2,
    debounceMs: 1000,
  });

  /**
   * 2. LIVE SEGMENT SNAP — uses metered origin so it's nicely throttled.
   */
  const activeWaypoints = useMemo(() => {
    if (!route.stops) return [];
    const targetIndex = route.stops.findIndex(s => s.id === targetStop.id);
    if (targetIndex === -1) return [];
    return route.stops.filter((_, idx) => idx < targetIndex).map(s => ({ lat: s.lat, lng: s.lng }));
  }, [route.stops, targetStop.id]);

  const { directionsResult: activeResult, durationValue, distanceValue } = useGoogleDirections({
    origin: directionsOrigin,
    destination: { lat: targetStop.lat, lng: targetStop.lng },
    waypoints: activeWaypoints,
    enabled: !!directionsOrigin,
    debounceMs: 2000,
  });

  // ── Polyline drawing — imperative ──
  const fullPolyRef = useRef<google.maps.Polyline | null>(null);
  const activePolyRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!map) return;
    fullPolyRef.current = new google.maps.Polyline({
      map,
      strokeColor: "#3b82f6",
      strokeWeight: 4,
      strokeOpacity: 0.2,
      zIndex: 40,
    });
    activePolyRef.current = new google.maps.Polyline({
      map,
      strokeColor: "#3b82f6",
      strokeWeight: 7,
      strokeOpacity: 1.0,
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

  // ── Socket connection ──
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

  // ── IMPERATIVE animation loop — updates Google Maps markers directly, no React ──
  // Store the AdvancedMarkerElement class ref for use inside RAF
  const MarkerClassRef = useRef<typeof google.maps.marker.AdvancedMarkerElement | null>(null);
  useEffect(() => {
    if (markerLib) {
      MarkerClassRef.current = google.maps.marker.AdvancedMarkerElement;
    }
  }, [markerLib]);

  useEffect(() => {
    if (!map || !markerLib) return;

    let lastDirectionsCheck = 0;

    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);

      const now = Date.now();
      let anyBus = false;

      rawBusesRef.current.forEach((bus, id) => {
        anyBus = true;
        const prev = prevPosRef.current.get(id);

        let displayLat: number, displayLng: number;

        if (!prev) {
          prevPosRef.current.set(id, { lat: bus.lat, lng: bus.lng, ts: now });
          displayLat = bus.lat;
          displayLng = bus.lng;
        } else {
          const t = Math.min((now - prev.ts) / INTERPOLATION_MS, 1);
          const interp = interpolatePosition(prev, { lat: bus.lat, lng: bus.lng }, t);
          displayLat = interp.lat;
          displayLng = interp.lng;

          if (t >= 0.99) {
            prevPosRef.current.set(id, { lat: bus.lat, lng: bus.lng, ts: now });
          }
        }

        // Update or create the imperative marker
        let marker = busMarkersRef.current.get(id);
        if (!marker && MarkerClassRef.current) {
          const content = createBusMarkerContent(bus.status);
          marker = new MarkerClassRef.current({
            map,
            content,
            zIndex: 100,
          });
          busMarkersRef.current.set(id, marker);
          busMarkerContentsRef.current.set(id, content);
        }

        if (marker) {
          // Move marker (no React re-render)
          marker.position = { lat: displayLat, lng: displayLng };

          // Rotate arrow
          const arrow = busMarkerContentsRef.current.get(id)?.querySelector(".bus-arrow") as HTMLElement | null;
          if (arrow) {
            const snapped = Math.round(bus.heading / 5) * 5;
            arrow.style.transform = `rotate(${snapped}deg)`;
          }
        }

        // Throttle directions origin update — check every 500ms of wall-clock time
        if (now - lastDirectionsCheck > 500) {
          lastDirectionsCheck = now;
          const newPos = { lat: displayLat, lng: displayLng };
          if (!directionsOriginRef.current) {
            directionsOriginRef.current = newPos;
            setDirectionsOrigin(newPos);
            setHasBus(true);
          } else {
            const dist = getDistanceMeters(directionsOriginRef.current, newPos);
            if (dist > DIRECTIONS_UPDATE_THRESHOLD_M) {
              directionsOriginRef.current = newPos;
              setDirectionsOrigin(newPos);
            }
          }
          if (!hasBus) {
            setHasBus(true);
          }
        }
      });

      // Clean up markers for buses that no longer exist
      busMarkersRef.current.forEach((marker, id) => {
        if (!rawBusesRef.current.has(id)) {
          marker.map = null;
          busMarkersRef.current.delete(id);
          busMarkerContentsRef.current.delete(id);
        }
      });
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => {
      cancelAnimationFrame(frameRef.current);
      // Cleanup markers
      busMarkersRef.current.forEach(m => { m.map = null; });
      busMarkersRef.current.clear();
      busMarkerContentsRef.current.clear();
    };
  }, [map, markerLib]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update ETA display
  useEffect(() => {
    if (activeResult) {
      setLiveEtaMinutes(Math.ceil(durationValue / 60));
      setLiveDistKm((distanceValue / 1000).toFixed(1));
    }
  }, [activeResult, durationValue, distanceValue]);

  return (
    <>
      <style>{RIPPLE_KEYFRAMES}</style>
      <GoogleMap
        defaultCenter={targetStop}
        defaultZoom={15}
        disableDefaultUI={true}
        mapId="b1b1b1b1b1b1b1b1"
        gestureHandling="greedy"
      >
        {/* Target Stop Marker — static position, minimal re-renders */}
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
        {/* Bus markers are imperative — NOT rendered via React */}
      </GoogleMap>

      {/* ETA Card */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-sm px-4 z-40">
        <ETACard
          stopName={targetStop.name}
          stopShortName={targetStop.shortName}
          etaMinutes={liveEtaMinutes || 0}
          distanceKm={liveDistKm}
          viaRoad={"Whole Subscribed Path"}
          isArriving={liveEtaMinutes <= 2 && liveEtaMinutes > 0}
          hasArrived={liveEtaMinutes === 0 && hasBus}
          isLoading={!hasBus}
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
