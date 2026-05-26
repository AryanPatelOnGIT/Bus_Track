'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import {
  Map as GoogleMap,
  AdvancedMarker,
  useMap,
  useMapsLibrary,
} from '@vis.gl/react-google-maps';
import RouteTimelineSheet from '@/components/passenger/RouteTimelineSheet';
import { RouteStop, RouteData } from '@/hooks/useRoutes';
import { interpolatePosition, getDistanceMeters } from '@/lib/mapUtils';
import { rtdb } from '@/lib/firebase';
import { ref, onValue, off } from 'firebase/database';
import { buzzController } from '@/lib/audioUtils';
import { LocateFixed, MessageSquare } from 'lucide-react';
import ChatModal from './ChatModal';

export interface PassengerMapProps {
  targetStop: RouteStop;
  route: RouteData;
}

interface IncomingBusData {
  busId: string;
  rideSessionId?: string;
  routeId: string;
  lat: number;
  lng: number;
  heading: number;
  speed: number;
  timestamp: number;
  status: 'active' | 'maintenance' | 'idle';
  currentStopIndex?: number;
  delayMinutes?: number;
}

interface ActiveBusSnapshot {
  busId?: string;
  rideSessionId?: string;
  routeId?: string;
  lat?: number;
  lng?: number;
  heading?: number;
  speed?: number;
  timestamp?: number;
  status?: 'active' | 'maintenance' | 'idle';
  currentStopIndex?: number;
  delayMinutes?: number;
  online?: boolean;
  location?: {
    lat?: number;
    lng?: number;
    heading?: number | null;
    speed?: number | null;
    timestamp?: number;
  };
  route?: {
    routeId?: string;
    currentStopIndex?: number;
  };
  startedAt?: number;
}

const INTERPOLATION_MS = 1600;
const WALKING_KMH = 5;
const WALKING_M_PER_MIN = (WALKING_KMH * 1000) / 60;
const BUS_SPEED_FLOOR_KMH = 15;

function normalizeActiveBus(vehicleId: string, bus: ActiveBusSnapshot): IncomingBusData | null {
  const lat = bus.location?.lat ?? bus.lat;
  const lng = bus.location?.lng ?? bus.lng;
  const routeId = bus.route?.routeId ?? bus.routeId;
  const timestamp = bus.location?.timestamp ?? bus.timestamp ?? bus.startedAt;

  if (
    typeof lat !== 'number' ||
    typeof lng !== 'number' ||
    typeof routeId !== 'string' ||
    typeof timestamp !== 'number'
  ) {
    return null;
  }

  return {
    busId: bus.busId || vehicleId,
    rideSessionId: bus.rideSessionId,
    routeId,
    lat,
    lng,
    heading: bus.location?.heading ?? bus.heading ?? 0,
    speed: bus.location?.speed ?? bus.speed ?? 0,
    timestamp,
    status: bus.status || (bus.online === false ? 'idle' : 'active'),
    currentStopIndex: bus.route?.currentStopIndex ?? bus.currentStopIndex,
    delayMinutes: bus.delayMinutes,
  };
}

const RIPPLE_KEYFRAMES = `
  @keyframes ripple {
    0% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.5); }
    70% { box-shadow: 0 0 0 30px rgba(249, 115, 22, 0); }
    100% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0); }
  }
  @keyframes passengerPulse {
    0% { box-shadow: 0 0 0 0 rgba(41, 128, 185, 0.7); }
    70% { box-shadow: 0 0 0 18px rgba(41, 128, 185, 0); }
    100% { box-shadow: 0 0 0 0 rgba(41, 128, 185, 0); }
  }
`;

function createBusMarkerContent(status: string): HTMLDivElement {
  const colors: Record<string, string> = {
    active: '#27AE60',
    maintenance: '#C0392B',
    idle: '#F39C12',
  };
  const color = colors[status] || colors.idle;

  const el = document.createElement('div');
  el.style.cssText = 'width:48px;height:48px;position:relative';
  el.innerHTML = `
    ${status === 'active' ? `<div style="position:absolute;inset:0;border-radius:50%;background:${color}33;animation:ping 1s cubic-bezier(0,0,0.2,1) infinite;opacity:0.6"></div>` : ''}
    <div class="bus-arrow" style="position:relative;z-index:10;display:flex;align-items:center;justify-content:center;width:48px;height:48px;transition:transform 600ms cubic-bezier(0.4,0,0.2,1);will-change:transform">
      <svg width="34" height="34" viewBox="0 0 24 24" fill="none"><path d="M12 2L20 20L12 16L4 20L12 2Z" fill="${color}" stroke="#0A0A0A" stroke-width="1" stroke-linejoin="round"/></svg>
    </div>
    <div style="position:absolute;bottom:-4px;right:-4px;width:10px;height:10px;border-radius:50%;background:${color};border:2px solid #0A0A0A"></div>
  `;
  return el;
}

function PassengerMapInnerGoogle({ targetStop, route }: PassengerMapProps) {
  const map = useMap();
  const markerLib = useMapsLibrary('marker');
  const geometryLib = useMapsLibrary('geometry');

  const rawBusesRef = useRef<Map<string, IncomingBusData>>(new Map());
  const frameRef = useRef<number>(0);
  const prevPosRef = useRef<Map<string, { lat: number; lng: number; ts: number }>>(new Map());
  const busMarkersRef = useRef<Map<string, google.maps.marker.AdvancedMarkerElement>>(new Map());
  const busMarkerContentsRef = useRef<Map<string, HTMLDivElement>>(new Map());

  const [liveEtaMinutes, setLiveEtaMinutes] = useState<number>(0);
  const [hasBus, setHasBus] = useState(false);
  const [stopETAs, setStopETAs] = useState<Record<string, number>>({});
  const lastBuzzedStopIdRef = useRef<string | null>(null);

  const [passengerLocation, setPassengerLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isCentered, setIsCentered] = useState(false);
  const passengerMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);

  // Chat state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeChatSessionId, setActiveChatSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setPassengerLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const walkMinutesToTarget = useMemo(() => {
    if (!passengerLocation) return undefined;
    const dist = getDistanceMeters(passengerLocation, targetStop);
    return Math.ceil(dist / WALKING_M_PER_MIN);
  }, [passengerLocation, targetStop]);

  const handleRecenter = useCallback(() => {
    if (!map) return;
    if (passengerLocation) {
      map.panTo(passengerLocation);
      map.setZoom(16);
      setIsCentered(true);
    }
  }, [map, passengerLocation]);

  // Passenger dot
  useEffect(() => {
    if (!map || !markerLib || !passengerLocation) return;

    if (!passengerMarkerRef.current) {
      const content = document.createElement('div');
      content.style.cssText = 'width:20px;height:20px;position:relative';
      content.innerHTML = `
        <div style="position:absolute;inset:0;width:20px;height:20px;border-radius:50%;background:#2980B9;border:3px solid #F5F5F5;z-index:10;animation:passengerPulse 2s infinite;box-shadow:0 0 0 0 rgba(41,128,185,0.7)"></div>
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

  // Route polylines
  const fullPolyRef = useRef<google.maps.Polyline | null>(null);
  const activePolyRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!map) return;
    fullPolyRef.current = new google.maps.Polyline({
      map,
      strokeColor: '#333333',
      strokeWeight: 6,
      strokeOpacity: 0.8,
      zIndex: 40,
    });
    activePolyRef.current = new google.maps.Polyline({
      map,
      strokeColor: '#2980B9',
      strokeWeight: 6,
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
      path = route.stops?.map((s) => ({ lat: s.lat, lng: s.lng })) || [];
    }

    fullPolyRef.current.setPath(path);

    if (map && route.stops?.length) {
      const bounds = new google.maps.LatLngBounds();
      route.stops.forEach((s) => bounds.extend({ lat: s.lat, lng: s.lng }));
      map.fitBounds(bounds, { top: 80, bottom: 220, left: 40, right: 40 });
    }
  }, [geometryLib, route.polyline, route.waypoints, map]); // eslint-disable-line react-hooks/exhaustive-deps

  // Firebase RTDB bus tracking
  useEffect(() => {
    const busesRef = ref(rtdb, 'activeBuses');

    const unsubscribe = onValue(busesRef, (snapshot) => {
      const data = snapshot.val() as Record<string, IncomingBusData>;
      if (!data) {
        rawBusesRef.current.clear();
        setLiveEtaMinutes(0);
        setHasBus(false);
        setActiveChatSessionId(null);
        return;
      }

      let closestDist = Infinity;
      let closestEta = 0;
      let foundBusOnRoute = false;
      let foundChatSessionId: string | null = null;
      const currentIds = new Set<string>();

      Object.entries(data as Record<string, ActiveBusSnapshot>).forEach(([vehicleId, busSnapshot]) => {
        const bus = normalizeActiveBus(vehicleId, busSnapshot);
        if (!bus) return;

        const isFresh = Date.now() - bus.timestamp < 300000;
        if (bus.routeId === route.id && bus.status === 'active' && isFresh) {
          foundBusOnRoute = true;
          foundChatSessionId = bus.rideSessionId || bus.busId;
          currentIds.add(bus.busId);
          rawBusesRef.current.set(bus.busId, bus);

          if (route.stops && route.stops.length > 0) {
            let closestStopIndex = bus.currentStopIndex !== undefined ? bus.currentStopIndex : 0;
            if (bus.currentStopIndex === undefined) {
              let minD = Infinity;
              route.stops.forEach((stop, idx) => {
                const d = getDistanceMeters({ lat: bus.lat, lng: bus.lng }, stop);
                if (d < minD) { minD = d; closestStopIndex = idx; }
              });
            }

            const busSpeedKmh = bus.speed > 0 ? bus.speed : BUS_SPEED_FLOOR_KMH;
            const mPerMin = (busSpeedKmh * 1000) / 60;

            if (activePolyRef.current && fullPolyRef.current) {
              const fullPathArray = fullPolyRef.current.getPath()?.getArray();
              if (fullPathArray && fullPathArray.length > 0) {
                let minVertDist = Infinity;
                let closestVertIdx = 0;
                fullPathArray.forEach((pt, vIdx) => {
                  const d = getDistanceMeters({ lat: bus.lat, lng: bus.lng }, { lat: pt.lat(), lng: pt.lng() });
                  if (d < minVertDist) { minVertDist = d; closestVertIdx = vIdx; }
                });
                const newPath = [
                  new google.maps.LatLng(bus.lat, bus.lng),
                  ...fullPathArray.slice(closestVertIdx),
                ];
                activePolyRef.current.setPath(newPath);
              }
            }

            const distToNextStop = getDistanceMeters(
              { lat: bus.lat, lng: bus.lng },
              route.stops[closestStopIndex]
            ) * 1.3;

            const busDelay = bus.delayMinutes || 0;
            const newStopETAs: Record<string, number> = {};

            let accumDistM = distToNextStop;
            newStopETAs[route.stops[closestStopIndex].id] = Math.ceil(accumDistM / mPerMin) + busDelay;

            for (let i = closestStopIndex + 1; i < route.stops.length; i++) {
              const segDist = getDistanceMeters(route.stops[i - 1], route.stops[i]) * 1.3;
              accumDistM += segDist + 125;
              newStopETAs[route.stops[i].id] = Math.ceil(accumDistM / mPerMin) + busDelay;
            }

            setStopETAs(newStopETAs);

            const myEta = newStopETAs[targetStop.id];
            const myDist = accumDistM;
            if (typeof myEta === 'number' && myDist < closestDist) {
              closestDist = myDist;
              closestEta = myEta;
            }

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
      setActiveChatSessionId(foundChatSessionId);
      if (foundBusOnRoute && closestDist !== Infinity) {
        setLiveEtaMinutes(closestEta);
      } else {
        setLiveEtaMinutes(0);
        setStopETAs({});
      }
    });

    return () => {
      off(busesRef, 'value', unsubscribe);
      cancelAnimationFrame(frameRef.current);
    };
  }, [route.id, targetStop]); // eslint-disable-line react-hooks/exhaustive-deps

  // Animation loop
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
          const arrow = busMarkerContentsRef.current.get(id)?.querySelector('.bus-arrow') as HTMLElement | null;
          if (arrow) {
            const snapped = Math.round(bus.heading / 5) * 5;
            arrow.style.transform = `rotate(${snapped}deg)`;
          }
        }
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
      busMarkersRef.current.forEach((m) => { m.map = null; });
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
          mapId="bustrack-hw-passenger"
          gestureHandling="greedy"
        >
          {/* Stop markers */}
          {route.stops?.map((stop, i) => (
            <AdvancedMarker key={`stop-${stop.id || i}`} position={{ lat: stop.lat, lng: stop.lng }}>
              {stop.id === targetStop.id ? (
                <div className="relative flex flex-col items-center">
                  <div className="absolute w-8 h-8 bg-orange-500 rounded-full" style={{ animation: 'ripple 2s infinite' }} />
                  <div className="w-8 h-8 bg-orange-500 border-4 border-orange-400 rounded-full z-10 flex items-center justify-center shadow-2xl">
                    <span className="text-white font-[family-name:var(--font-dm-mono)] font-bold text-xs">{String.fromCharCode(65 + i)}</span>
                  </div>
                  <span className="mt-2 px-3 py-1 bg-[#0A0A0A]/90 border border-[#333333] text-[#F5F5F5] rounded-xl text-[10px] whitespace-nowrap z-50 shadow-2xl font-[family-name:var(--font-dm-mono)] font-bold uppercase tracking-[0.2em]">
                    {stop.shortName}
                  </span>
                </div>
              ) : (
                <div className="relative flex flex-col items-center opacity-70 scale-90">
                  <div className="flex items-center justify-center w-6 h-6 bg-orange-500 border-2 border-orange-400 rounded-full shadow-lg">
                    <span className="text-white font-[family-name:var(--font-dm-mono)] font-bold text-[10px]">{String.fromCharCode(65 + i)}</span>
                  </div>
                  <span className="mt-1 px-2 py-0.5 bg-[#0A0A0A]/80 text-[#888888] rounded text-[8px] whitespace-nowrap font-[family-name:var(--font-dm-mono)] font-bold uppercase tracking-widest">
                    {stop.shortName}
                  </span>
                </div>
              )}
            </AdvancedMarker>
          ))}
        </GoogleMap>
      </div>

      {/* Recenter button */}
      {passengerLocation && (
        <div className="absolute bottom-[80px] right-4 z-40">
          <button
            onClick={handleRecenter}
            className={`flex items-center gap-2 px-4 py-3 rounded-2xl shadow-2xl transition-all duration-300 border active:scale-95 ${
              isCentered
                ? 'bg-[#2980B9] text-[#F5F5F5] border-[#2980B9] opacity-70 scale-95'
                : 'bg-[#141414] text-[#F5F5F5] border-[#333333]'
            }`}
          >
            <LocateFixed className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Chat Bubble FAB */}
      {!isChatOpen && (
        <div className="absolute bottom-[154px] right-4 z-[9999]">
          <button
            onClick={() => {
              if (!activeChatSessionId) return;
              buzzController.unlock();
              setIsChatOpen(true);
            }}
            disabled={!activeChatSessionId}
            className={`group relative flex h-14 items-center gap-3 rounded-2xl border px-4 shadow-[0_10px_28px_rgba(0,0,0,0.75)] backdrop-blur-md transition-all active:scale-95 ${
              activeChatSessionId
                ? 'bg-[#141414]/95 border-[#333333] text-[#F5F5F5] hover:border-[#2980B9] hover:bg-[#1A1A1A]'
                : 'bg-[#141414]/80 border-[#222222] text-[#555555] cursor-not-allowed'
            }`}
            aria-label={activeChatSessionId ? 'Open chat with driver' : 'Driver chat unavailable until a live bus is found'}
          >
            <span className={`relative flex h-9 w-9 items-center justify-center rounded-xl border ${
              activeChatSessionId
                ? 'bg-[#2980B9]/15 border-[#2980B9]/40 text-[#F5F5F5]'
                : 'bg-[#1A1A1A] border-[#333333] text-[#555555]'
            }`}>
              <MessageSquare className="w-5 h-5" />
              {activeChatSessionId && (
                <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-[#27AE60] ring-2 ring-[#141414]" />
              )}
            </span>
            <span className="flex flex-col items-start leading-none">
              <span className="font-[family-name:var(--font-dm-mono)] text-[10px] font-bold uppercase tracking-[0.18em]">
                Driver
              </span>
              <span className="mt-1 font-[family-name:var(--font-inter)] text-[10px] text-[#888888]">
                {activeChatSessionId ? 'Chat live' : 'No live bus'}
              </span>
            </span>
          </button>
        </div>
      )}

      {/* Chat Modal */}
      <ChatModal
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        rideSessionId={activeChatSessionId}
      />

      {/* Route Timeline Sheet */}
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
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <PassengerMapInnerGoogle {...props} />
    </div>
  );
}
