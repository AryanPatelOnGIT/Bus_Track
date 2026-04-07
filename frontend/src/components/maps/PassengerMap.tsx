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
import React from "react";
import { rtdb } from "@/lib/firebase";
import { ref, onValue, off } from "firebase/database";

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

/** ETA update from server (replaces per-client Google Maps calls) */
interface ETAUpdatePayload {
  busId: string;
  routeId: string;
  etaSeconds: number;
  etaMinutes: number;
  distanceMeters: number;
  distanceKm: string;
  polyline: string;
  timestamp: number;
}

const INTERPOLATION_MS = 1600;

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
  const geometryLib = useMapsLibrary("geometry");
  const socketRef = useRef<ReturnType<typeof import("socket.io-client").io> | null>(null);

  // Raw bus data — written by socket, read by RAF loop. Never triggers React state.
  const rawBusesRef = useRef<Map<string, IncomingBusData>>(new Map());
  const frameRef = useRef<number>(0);

  // Interpolation state — stored in ref, not React state
  const prevPosRef = useRef<Map<string, { lat: number; lng: number; ts: number }>>(new Map());

  // Imperative markers — keyed by busId
  const busMarkersRef = useRef<Map<string, google.maps.marker.AdvancedMarkerElement>>(new Map());
  const busMarkerContentsRef = useRef<Map<string, HTMLDivElement>>(new Map());

  // ETA display state — fed by server socket, NOT by Google Maps calls
  const [liveEtaMinutes, setLiveEtaMinutes] = useState<number>(0);
  const [liveDistKm, setLiveDistKm] = useState<string>("—");

  // Track whether any bus exists (for the ETA card loading state)
  const [hasBus, setHasBus] = useState(false);

  // ══════════════════════════════════════════════════════════════════
  //  1. STATIC ROUTE POLYLINE — from Firestore, ZERO API calls
  // ══════════════════════════════════════════════════════════════════

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

  // Decode and display the pre-computed polyline from Firestore
  useEffect(() => {
    if (!fullPolyRef.current || !geometryLib || !route.polyline) return;
    try {
      const decoded = geometryLib.encoding.decodePath(route.polyline);
      fullPolyRef.current.setPath(decoded);
    } catch (err) {
      console.warn("Failed to decode route polyline from Firestore:", err);
      // Fallback: use waypoints as straight-line path
      if (route.waypoints?.length > 0) {
        fullPolyRef.current.setPath(
          route.waypoints.map(w => ({ lat: w.lat, lng: w.lng }))
        );
      }
    }
  }, [geometryLib, route.polyline, route.waypoints]);

  // ══════════════════════════════════════════════════════════════════
  //  2. FIREBASE DB CONNECTION — Receives bus positions & computes ETA
  // ══════════════════════════════════════════════════════════════════

  useEffect(() => {
    const busesRef = ref(rtdb, "activeBuses");

    const unsubscribe = onValue(busesRef, (snapshot) => {
      const data = snapshot.val() as Record<string, IncomingBusData>;
      if (!data) {
        rawBusesRef.current.clear();
        setLiveEtaMinutes(0);
        setLiveDistKm("—");
        setHasBus(false);
        return;
      }

      let closestDist = Infinity;
      let closestEta = 0;
      let foundBusOnRoute = false;

      // Update bus markers list
      const currentIds = new Set<string>();

      Object.values(data).forEach((bus) => {
        // 5 minute buffer to avoid mobile clock drift hiding buses. OnDisconnect handles real disconnects.
        const isFresh = Date.now() - bus.timestamp < 300000; 
        if (bus.routeId === route.id && bus.status === "active" && isFresh) {
          foundBusOnRoute = true;
          currentIds.add(bus.busId);
          rawBusesRef.current.set(bus.busId, bus);

          // Compute Client-Side ETA (Cheap Haversine, 15 km/h average)
          const distMeters = getDistanceMeters({ lat: bus.lat, lng: bus.lng }, targetStop);
          if (distMeters < closestDist) {
            closestDist = distMeters;
            closestEta = Math.ceil(distMeters / 250); // 15 km/h = 250m/min
          }
        }
      });

      // Cleanup stale buses
      for (const key of rawBusesRef.current.keys()) {
        if (!currentIds.has(key)) {
          rawBusesRef.current.delete(key);
        }
      }

      setHasBus(foundBusOnRoute);

      if (foundBusOnRoute && closestDist !== Infinity) {
        setLiveEtaMinutes(closestEta);
        setLiveDistKm((closestDist / 1000).toFixed(1));
      } else {
        setLiveEtaMinutes(0);
        setLiveDistKm("—");
      }
    });

    return () => {
      off(busesRef, "value", unsubscribe);
      cancelAnimationFrame(frameRef.current);
    };
  }, [route.id, targetStop]); // Re-bind if route or target changes

  // ══════════════════════════════════════════════════════════════════
  //  3. IMPERATIVE ANIMATION LOOP — updates Google Maps markers
  //     directly, no React re-renders, no API calls
  // ══════════════════════════════════════════════════════════════════

  const MarkerClassRef = useRef<typeof google.maps.marker.AdvancedMarkerElement | null>(null);
  useEffect(() => {
    if (markerLib) {
      MarkerClassRef.current = google.maps.marker.AdvancedMarkerElement;
    }
  }, [markerLib]);

  useEffect(() => {
    if (!map || !markerLib) return;

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

        // Mark that we have a bus
        if (!hasBus) {
          setHasBus(true);
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
