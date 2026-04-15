"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import {
  Map as GoogleMap,
  AdvancedMarker,
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";
import RouteTimelineSheet from "@/components/passenger/RouteTimelineSheet";
import { RouteStop, RouteData } from "@/hooks/useRoutes";
import { interpolatePosition, getDistanceMeters } from "@/lib/mapUtils";
import React from "react";
import { rtdb } from "@/lib/firebase";
import { ref, onValue, off } from "firebase/database";
import { buzzController } from "@/lib/audioUtils";
import { LocateFixed } from "lucide-react";

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
  speed: number; // km/h, real from GPS
  timestamp: number;
  status: "active" | "maintenance" | "idle";
  currentStopIndex?: number;
  delayMinutes?: number;
}

const INTERPOLATION_MS = 1600;
// Walking speed assumption (km/h)
const WALKING_KMH = 5;
// metres per minute at walking pace
const WALKING_M_PER_MIN = (WALKING_KMH * 1000) / 60;
// Bus speed floor (km/h) — used when GPS reports 0 or missing
const BUS_SPEED_FLOOR_KMH = 15;

const RIPPLE_KEYFRAMES = `
  @keyframes ripple {
    0% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.5); }
    70% { box-shadow: 0 0 0 30px rgba(249, 115, 22, 0); }
    100% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0); }
  }
  @keyframes passengerPulse {
    0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7); }
    70% { box-shadow: 0 0 0 18px rgba(59, 130, 246, 0); }
    100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
  }
`;

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

  const rawBusesRef = useRef<Map<string, IncomingBusData>>(new Map());
  const frameRef = useRef<number>(0);
  const prevPosRef = useRef<Map<string, { lat: number; lng: number; ts: number }>>(new Map());
  const busMarkersRef = useRef<Map<string, google.maps.marker.AdvancedMarkerElement>>(new Map());
  const busMarkerContentsRef = useRef<Map<string, HTMLDivElement>>(new Map());

  const [liveEtaMinutes, setLiveEtaMinutes] = useState<number>(0);
  const [liveDistKm, setLiveDistKm] = useState<string>("—");
  const [hasBus, setHasBus] = useState(false);
  const [stopETAs, setStopETAs] = useState<Record<string, number>>({});
  const lastBuzzedStopIdRef = useRef<string | null>(null);

  // ── Passenger geolocation ──
  const [passengerLocation, setPassengerLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isCentered, setIsCentered] = useState(false);
  const passengerMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setPassengerLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Walk-to-stop ETA in minutes
  const walkMinutesToTarget = useMemo(() => {
    if (!passengerLocation) return undefined;
    const dist = getDistanceMeters(passengerLocation, targetStop);
    return Math.ceil(dist / WALKING_M_PER_MIN);
  }, [passengerLocation, targetStop]);

  // Recenter handler
  const handleRecenter = useCallback(() => {
    if (!map) return;
    if (passengerLocation) {
      map.panTo(passengerLocation);
      map.setZoom(16);
      setIsCentered(true);
    }
  }, [map, passengerLocation]);

  // ══════════════════════════════════════════════════════════════════
  //  IMPERATIVE PASSENGER DOT
  // ══════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (!map || !markerLib || !passengerLocation) return;

    if (!passengerMarkerRef.current) {
      const content = document.createElement("div");
      content.style.cssText = "width:20px;height:20px;position:relative";
      content.innerHTML = `
        <div style="position:absolute;inset:0;width:20px;height:20px;border-radius:50%;background:#3b82f6;border:3px solid white;z-index:10;animation:passengerPulse 2s infinite;box-shadow:0 0 0 0 rgba(59,130,246,0.7)"></div>
      `;
      const marker = new google.maps.marker.AdvancedMarkerElement({ map, content, zIndex: 200 });
      passengerMarkerRef.current = marker;
    }
    passengerMarkerRef.current.position = passengerLocation;

    return () => {
      if (passengerMarkerRef.current) {
        passengerMarkerRef.current.map = null;
        passengerMarkerRef.current = null;
      }
    };
  }, [map, markerLib, passengerLocation?.lat, passengerLocation?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  // ══════════════════════════════════════════════════════════════════
  //  1. STATIC FULL ROUTE POLYLINE (A→Z, from Firestore)
  // ══════════════════════════════════════════════════════════════════
  const fullPolyRef = useRef<google.maps.Polyline | null>(null);
  const activePolyRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!map) return;
    fullPolyRef.current = new google.maps.Polyline({
      map,
      strokeColor: "#3b82f6",
      strokeWeight: 7,
      strokeOpacity: 0.8,
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
    if (!fullPolyRef.current || !geometryLib) return;
    let path: google.maps.LatLng[] | { lat: number; lng: number }[] | null = null;

    if (route.polyline) {
      try {
        path = geometryLib.encoding.decodePath(route.polyline);
      } catch {
        path = null;
      }
    }

    if (!path) {
      path = route.stops?.map(s => ({ lat: s.lat, lng: s.lng })) || [];
    }

    fullPolyRef.current.setPath(path);

    // Fit map to A→Z stops
    if (map && route.stops?.length) {
      const bounds = new google.maps.LatLngBounds();
      route.stops.forEach(s => bounds.extend({ lat: s.lat, lng: s.lng }));
      map.fitBounds(bounds, { top: 80, bottom: 220, left: 40, right: 40 });
    }
  }, [geometryLib, route.polyline, route.waypoints, map]); // eslint-disable-line react-hooks/exhaustive-deps

  // ══════════════════════════════════════════════════════════════════
  //  2. FIREBASE REALTIME — bus positions + speed-based ETA
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
      const currentIds = new Set<string>();

      Object.values(data).forEach((bus) => {
        const isFresh = Date.now() - bus.timestamp < 300000;
        if (bus.routeId === route.id && bus.status === "active" && isFresh) {
          foundBusOnRoute = true;
          currentIds.add(bus.busId);
          rawBusesRef.current.set(bus.busId, bus);

          if (route.stops && route.stops.length > 0) {
            // Prefer the driver's explicit stop index; fall back to proximity
            let closestStopIndex = bus.currentStopIndex !== undefined ? bus.currentStopIndex : 0;
            if (bus.currentStopIndex === undefined) {
              let minD = Infinity;
              route.stops.forEach((stop, idx) => {
                const d = getDistanceMeters({ lat: bus.lat, lng: bus.lng }, stop);
                if (d < minD) { minD = d; closestStopIndex = idx; }
              });
            }

            // ── Speed-aware ETA (matches driver's formula) ──
            // Use bus's real GPS speed; fall back to floor
            const busSpeedKmh = bus.speed > 0 ? bus.speed : BUS_SPEED_FLOOR_KMH;
            // metres/minute
            const mPerMin = (busSpeedKmh * 1000) / 60;

            const distToNextStop = getDistanceMeters(
              { lat: bus.lat, lng: bus.lng },
              route.stops[closestStopIndex]
            ) * 1.3; // road factor

            const busDelay = bus.delayMinutes || 0;
            const newStopETAs: Record<string, number> = {};

            // Time (minutes) to reach the immediate next stop at current speed
            let accumDistM = distToNextStop;
            newStopETAs[route.stops[closestStopIndex].id] = Math.ceil(accumDistM / mPerMin) + busDelay;

            // Subsequent stops: assume same road-speed for now (driver's GPS speed propagated)
            for (let i = closestStopIndex + 1; i < route.stops.length; i++) {
              const segDist = getDistanceMeters(route.stops[i - 1], route.stops[i]) * 1.3;
              // Add 30-second dwell per stop (same as driver)
              accumDistM += segDist + 125;
              newStopETAs[route.stops[i].id] = Math.ceil(accumDistM / mPerMin) + busDelay;
            }

            setStopETAs(newStopETAs);

            const myEta = newStopETAs[targetStop.id];
            const myDist = accumDistM; // rough total dist
            if (typeof myEta === "number" && myDist < closestDist) {
              closestDist = myDist;
              closestEta = myEta;
            }

            // Buzz when bus within 200m of passenger's target stop
            const busDist = getDistanceMeters({ lat: bus.lat, lng: bus.lng }, targetStop);
            if (busDist < 200 && lastBuzzedStopIdRef.current !== targetStop.id) {
              buzzController.playBuzz([300, 150, 300, 150, 500]);
              lastBuzzedStopIdRef.current = targetStop.id;
            }
          }
        }
      });

      for (const key of rawBusesRef.current.keys()) {
        if (!currentIds.has(key)) rawBusesRef.current.delete(key);
      }

      setHasBus(foundBusOnRoute);
      if (foundBusOnRoute && closestDist !== Infinity) {
        setLiveEtaMinutes(closestEta);
        setLiveDistKm((closestDist / 1000).toFixed(1));
      } else {
        setLiveEtaMinutes(0);
        setLiveDistKm("—");
        setStopETAs({});
      }
    });

    return () => {
      off(busesRef, "value", unsubscribe);
      cancelAnimationFrame(frameRef.current);
    };
  }, [route.id, targetStop]); // eslint-disable-line react-hooks/exhaustive-deps

  // ══════════════════════════════════════════════════════════════════
  //  3. ANIMATION LOOP — updates Google Maps markers imperatively
  // ══════════════════════════════════════════════════════════════════
  const MarkerClassRef = useRef<typeof google.maps.marker.AdvancedMarkerElement | null>(null);
  useEffect(() => {
    if (markerLib) MarkerClassRef.current = google.maps.marker.AdvancedMarkerElement;
  }, [markerLib]);

  useEffect(() => {
    if (!map || !markerLib) return;

    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      const now = Date.now();

      rawBusesRef.current.forEach((bus, id) => {
        const prev = prevPosRef.current.get(id);
        let displayLat: number, displayLng: number;

        if (!prev) {
          prevPosRef.current.set(id, { lat: bus.lat, lng: bus.lng, ts: now });
          displayLat = bus.lat; displayLng = bus.lng;
        } else {
          const t = Math.min((now - prev.ts) / INTERPOLATION_MS, 1);
          const interp = interpolatePosition(prev, { lat: bus.lat, lng: bus.lng }, t);
          displayLat = interp.lat; displayLng = interp.lng;
          if (t >= 0.99) prevPosRef.current.set(id, { lat: bus.lat, lng: bus.lng, ts: now });
        }

        let marker = busMarkersRef.current.get(id);
        if (!marker && MarkerClassRef.current) {
          const content = createBusMarkerContent(bus.status);
          marker = new MarkerClassRef.current({ map, content, zIndex: 100 });
          busMarkersRef.current.set(id, marker);
          busMarkerContentsRef.current.set(id, content);
        }

        if (marker) {
          marker.position = { lat: displayLat, lng: displayLng };
          const arrow = busMarkerContentsRef.current.get(id)?.querySelector(".bus-arrow") as HTMLElement | null;
          if (arrow) {
            const snapped = Math.round(bus.heading / 5) * 5;
            arrow.style.transform = `rotate(${snapped}deg)`;
          }
        }

        setHasBus(prev => { if (!prev) return true; return prev; });
      });

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
      busMarkersRef.current.forEach(m => { m.map = null; });
      busMarkersRef.current.clear();
      busMarkerContentsRef.current.clear();
    };
  }, [map, markerLib]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <style>{RIPPLE_KEYFRAMES}</style>
      <div className="absolute inset-0 z-0" onPointerDown={() => setIsCentered(false)}>
        <GoogleMap
          defaultCenter={targetStop}
          defaultZoom={15}
          disableDefaultUI={true}
          mapId="b1b1b1b1b1b1b1b1"
          gestureHandling="greedy"
        >
          {/* All Route Stops */}
          {route.stops?.map((stop, i) => (
            <AdvancedMarker key={`stop-${stop.id || i}`} position={{ lat: stop.lat, lng: stop.lng }}>
              {stop.id === targetStop.id ? (
                <div className="relative flex flex-col items-center">
                  <div className="absolute w-8 h-8 bg-orange-500 rounded-full" style={{ animation: "ripple 2s infinite" }} />
                  <div className="w-8 h-8 bg-orange-500 border-4 border-orange-400 rounded-full z-10 flex items-center justify-center shadow-3xl">
                    <span className="text-white font-black text-xs">{String.fromCharCode(65 + i)}</span>
                  </div>
                  <span className="mt-2 px-4 py-1.5 bg-brand-surface border border-white/10 text-white rounded-xl text-[10px] whitespace-nowrap z-50 shadow-3xl font-black uppercase tracking-[0.2em]">
                    {stop.shortName}
                  </span>
                </div>
              ) : (
                <div className="relative flex flex-col items-center opacity-70 scale-90">
                  <div className="flex items-center justify-center w-6 h-6 bg-orange-500 border-2 border-orange-400 rounded-full shadow-lg">
                    <span className="text-white font-black text-[10px]">{String.fromCharCode(65 + i)}</span>
                  </div>
                  <span className="mt-1 px-2 py-0.5 bg-brand-dark/80 text-white rounded-[4px] text-[8px] whitespace-nowrap opacity-60 font-black uppercase tracking-widest">
                    {stop.shortName}
                  </span>
                </div>
              )}
            </AdvancedMarker>
          ))}
        </GoogleMap>
      </div>

      {/* Recenter button — bottom right, above timeline */}
      {passengerLocation && (
        <div className="absolute bottom-[80px] right-4 z-40">
          <button
            onClick={handleRecenter}
            className={`flex items-center gap-2 px-4 py-3 rounded-2xl shadow-2xl transition-all duration-300 border active:scale-95 ${
              isCentered
                ? "bg-blue-500 text-white border-blue-400 opacity-70 scale-95"
                : "bg-brand-surface text-white border-white/10"
            }`}
          >
            <LocateFixed className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Navigation Timeline */}
      <RouteTimelineSheet
        route={route}
        targetStopId={targetStop.id}
        activeBusId={null}
        stopETAs={stopETAs}
        walkMinutesToTarget={walkMinutesToTarget}
      />
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
