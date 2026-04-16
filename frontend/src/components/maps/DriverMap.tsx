"use client";

import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { LocateFixed as GPS, ArrowLeft, ChevronRight } from "lucide-react";
import {
  Map as GoogleMap,
  AdvancedMarker,
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";
import { RouteData } from "@/hooks/useRoutes";
import { useGoogleDirections } from "@/hooks/useGoogleDirections";
import { getDistanceMeters, distanceFromPolyline } from "@/lib/mapUtils";
import RoutePreviewCards from "@/components/maps/RoutePreviewCards";
import RouteTimelineSheet from "@/components/passenger/RouteTimelineSheet";
import { rtdb } from "@/lib/firebase";
import { ref, update } from "firebase/database";

export interface DriverMapProps {
  route: RouteData;
  socketRef: React.RefObject<ReturnType<typeof import("socket.io-client").io> | null>;
  busId: string;
  driverLocation: { lat: number; lng: number; heading: number } | null;
  onEndShift?: () => void;
  isTracking?: boolean;
  selectedRouteIds?: string[];
  onStopIndexChange?: (index: number) => void;
}

// ── Constants ──
const RIPPLE_KEYFRAMES = `
  @keyframes ripple {
    0% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.5); }
    70% { box-shadow: 0 0 0 30px rgba(249, 115, 22, 0); }
    100% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0); }
  }
`;

const SELECTED_ROUTE_COLOR = "#4285F4";
const ALTERNATIVE_ROUTE_COLOR = "#9AA0A6";
const FULL_ROUTE_COLOR = "#4285F4";

// Off-route threshold — 150m from the current polyline triggers a reroute
const OFF_ROUTE_THRESHOLD_M = 150;
// Minimum time between reroutes (ms)
const REROUTE_COOLDOWN_MS = 20000;

type NavPhase = "preview" | "navigating";


function DriverMapInner({ route, driverLocation, socketRef, busId, onEndShift, isTracking, selectedRouteIds, onStopIndexChange }: DriverMapProps) {
  const map = useMap();
  const markerLib = useMapsLibrary("marker");

  // ── Stop Progression — purely local math, zero API calls ──
  const stops = route.stops || [];
  const [currentStopIndex, setCurrentStopIndex] = useState(0);
  const nextStop = stops[currentStopIndex] ?? stops[stops.length - 1];
  const finalStop = stops[stops.length - 1];

  // ── Manual delay buffer (driver can add +1/+2 min for traffic) ──
  const [delayMinutes, setDelayMinutes] = useState(0);
  const lastDelayPushRef = useRef(0);

  const pushDelay = useCallback((addMin: number) => {
    setDelayMinutes(prev => {
      const next = Math.max(0, prev + addMin); // never go below 0
      const now = Date.now();
      if (now - lastDelayPushRef.current > 500) {
        lastDelayPushRef.current = now;
        const routesToUpdate = selectedRouteIds?.length ? selectedRouteIds : [route.id];
        routesToUpdate.forEach(routeId => {
          const busRef = ref(rtdb, `activeBuses/${busId}_${routeId}`);
          update(busRef, { delayMinutes: next }).catch(console.error);
        });
      }
      return next;
    });
  }, [busId, selectedRouteIds, route.id]);

  // ── Manual next-stop override ──
  const handleManualNextStop = useCallback(() => {
    setCurrentStopIndex(i => {
      const nextIdx = Math.min(i + 1, stops.length - 1);
      if (onStopIndexChange) onStopIndexChange(nextIdx);
      return nextIdx;
    });
  }, [stops.length]);

  // Auto-advance when driver is within 80m of the next stop
  useEffect(() => {
    if (!driverLocation || !nextStop || currentStopIndex >= stops.length - 1) return;
    const dist = getDistanceMeters(
      { lat: driverLocation.lat, lng: driverLocation.lng },
      { lat: nextStop.lat, lng: nextStop.lng }
    );
    if (dist < 80) {
      setCurrentStopIndex(i => {
        const nextIdx = Math.min(i + 1, stops.length - 1);
        if (onStopIndexChange) onStopIndexChange(nextIdx);
        return nextIdx;
      });
    }
  }, [driverLocation?.lat, driverLocation?.lng, nextStop?.lat, nextStop?.lng, currentStopIndex, stops.length]);

  // ── Navigation phase state machine ──
  const [navPhase, setNavPhase] = useState<NavPhase>("preview");
  const [isCentered, setIsCentered] = useState(true);
  const [displayDist, setDisplayDist] = useState(0);
  const [displayDur, setDisplayDur] = useState(0);

  // Full route polyline decoder (Firestore-stored, ZERO API calls)
  const geometryLib = useMapsLibrary("geometry");

  // ═══════════════════════════════════════════════════════════════════
  //  PREVIEW MODE — fetch full route (called exactly ONCE per session)
  // ═══════════════════════════════════════════════════════════════════

  // Origin snaps to first stop (not live location) to prevent re-fetches as bus moves
  const previewOrigin = useMemo(() => {
    if (stops.length) return { lat: stops[0].lat, lng: stops[0].lng };
    if (driverLocation) return { lat: driverLocation.lat, lng: driverLocation.lng };
    return null;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stops]); // intentionally stable — only depends on static stops array

  const apiDestination = finalStop ? { lat: finalStop.lat, lng: finalStop.lng } : null;

  // Waypoints: a sampled set of all intermediate stops (max 23, Google's free limit)
  const apiWaypoints = useMemo(() => {
    if (stops.length <= 2) return [];
    const mid = stops.slice(1, -1);
    if (mid.length <= 23) return mid.map(s => ({ lat: s.lat, lng: s.lng }));
    // Sample evenly
    const step = mid.length / 23;
    return Array.from({ length: 23 }, (_, k) => {
      const s = mid[Math.floor(k * step)];
      return { lat: s.lat, lng: s.lng };
    });
  }, [stops]);

  const {
    allRoutes: previewRoutes,
    routeSummaries,
    selectedRouteIndex: previewSelectedIdx,
    selectRoute: selectPreviewRoute,
    isLoading: previewLoading,
  } = useGoogleDirections({
    origin: previewOrigin,
    destination: apiDestination,
    waypoints: apiWaypoints,
    enabled: navPhase === "preview",
    debounceMs: 3000,
    provideRouteAlternatives: true,
  });

  // ─── Local ETA — zero API calls ─────────────────────────────────
  useEffect(() => {
    if (navPhase !== "navigating" || !driverLocation || !nextStop) return;

    const distM = getDistanceMeters(
      { lat: driverLocation.lat, lng: driverLocation.lng },
      { lat: nextStop.lat, lng: nextStop.lng }
    );

    const speedKmh = (driverLocation as any).speed > 0 ? (driverLocation as any).speed : 25;
    const speedMs = speedKmh / 3.6;
    const durationSec = speedMs > 0 ? distM / speedMs : 0;

    const roundedDist = Math.round(distM / 10) * 10;
    const roundedDur  = Math.round(durationSec / 10) * 10;

    setDisplayDist(prev => prev === roundedDist ? prev : roundedDist);
    setDisplayDur(prev  => prev === roundedDur  ? prev : roundedDur);
  }, [navPhase, driverLocation?.lat, driverLocation?.lng, nextStop?.lat, nextStop?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  // ═══════════════════════════════════════════════════════════════════
  //  IMPERATIVE POLYLINES
  // ═══════════════════════════════════════════════════════════════════

  const previewPolylinesRef = useRef<google.maps.Polyline[]>([]);
  const fullPolyRef = useRef<google.maps.Polyline | null>(null);

  const clearPreviewPolylines = useCallback(() => {
    previewPolylinesRef.current.forEach(p => p.setMap(null));
    previewPolylinesRef.current = [];
  }, []);

  const clearNavPolylines = useCallback(() => {
    fullPolyRef.current?.setMap(null);
    fullPolyRef.current = null;
  }, []);

  // Draw preview polylines when routes change
  useEffect(() => {
    if (!map || navPhase !== "preview") return;
    clearPreviewPolylines();

    const sortedIndices = previewRoutes
      .map((_, i) => i)
      .sort((a, b) => (a === previewSelectedIdx ? 1 : b === previewSelectedIdx ? -1 : 0));

    const polylines: google.maps.Polyline[] = [];

    sortedIndices.forEach(i => {
      const routeData = previewRoutes[i];
      if (!routeData) return;
      const isSelected = i === previewSelectedIdx;

      const polyline = new google.maps.Polyline({
        map,
        path: routeData.overview_path,
        strokeColor: isSelected ? SELECTED_ROUTE_COLOR : ALTERNATIVE_ROUTE_COLOR,
        strokeWeight: isSelected ? 7 : 5,
        strokeOpacity: isSelected ? 1.0 : 0.5,
        zIndex: isSelected ? 60 : 40,
        clickable: !isSelected,
      });

      if (!isSelected) {
        polyline.addListener("click", () => selectPreviewRoute(i));
      }

      polylines.push(polyline);
    });

    previewPolylinesRef.current = polylines;

    // Fit bounds to show all stops (not just the route preview)
    if (stops.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      stops.forEach(s => bounds.extend({ lat: s.lat, lng: s.lng }));
      if (previewRoutes.length > 0) {
        previewRoutes.forEach(r => r.overview_path?.forEach(p => bounds.extend(p)));
      }
      map.fitBounds(bounds, { top: 100, bottom: 280, left: 50, right: 50 });
    }

    return () => {
      polylines.forEach(p => p.setMap(null));
    };
  }, [map, navPhase, previewRoutes, previewSelectedIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  // ──────────────────────────────────────────────────────────────────
  //  ACTIVE ROUTE PATH — cached from preview selection, drawn once
  // ──────────────────────────────────────────────────────────────────
  const [activePath, setActivePath] = useState<google.maps.LatLng[]>([]);
  const lastRerouteRef = useRef(0);
  const [isRecalculating, setIsRecalculating] = useState(false);

  // Draw nav polyline (uses activePath state — updated on start + reroutes)
  useEffect(() => {
    if (!map || navPhase !== "navigating" || !geometryLib) return;
    clearPreviewPolylines();

    if (!fullPolyRef.current) {
      fullPolyRef.current = new google.maps.Polyline({
        map,
        strokeColor: FULL_ROUTE_COLOR,
        strokeWeight: 6,
        strokeOpacity: 0.9,
        zIndex: 40,
      });
    }

    if (activePath.length > 0) {
      fullPolyRef.current.setPath(activePath);
    } else {
      // Fallback: draw straight lines between stops
      const fallbackPath = stops.map(s => new google.maps.LatLng(s.lat, s.lng));
      fullPolyRef.current.setPath(fallbackPath);
    }

    return () => { clearNavPolylines(); };
  }, [map, navPhase, geometryLib, activePath]); // eslint-disable-line react-hooks/exhaustive-deps

  // ══════════════════════════════════════════════════════════════════
  //  OFF-ROUTE AUTO-REROUTE (called on GPS updates in navigating mode)
  // ══════════════════════════════════════════════════════════════════
  const activePathRef = useRef<{ lat: number; lng: number }[]>([]);

  useEffect(() => {
    // Keep a ref copy of activePath for use inside async callbacks
    activePathRef.current = activePath.map(p => ({ lat: p.lat(), lng: p.lng() }));
  }, [activePath]);

  useEffect(() => {
    if (navPhase !== "navigating" || !driverLocation || !finalStop || isRecalculating) return;
    const pathCoords = activePathRef.current;
    if (pathCoords.length === 0) return;

    const now = Date.now();
    if (now - lastRerouteRef.current < REROUTE_COOLDOWN_MS) return;

    const dist = distanceFromPolyline(
      { lat: driverLocation.lat, lng: driverLocation.lng },
      pathCoords
    );

    if (dist > OFF_ROUTE_THRESHOLD_M) {
      lastRerouteRef.current = now;
      setIsRecalculating(true);
      console.log(`Driver off-route by ${Math.round(dist)}m — rerouting…`);

      // Build remaining waypoints from currentStopIndex
      const remainingStops = stops.slice(currentStopIndex, -1);
      const waypointsForReroute = remainingStops.length <= 23
        ? remainingStops.map(s => ({ location: new google.maps.LatLng(s.lat, s.lng), stopover: false }))
        : Array.from({ length: 23 }, (_, k) => {
            const s = remainingStops[Math.floor(k * remainingStops.length / 23)];
            return { location: new google.maps.LatLng(s.lat, s.lng), stopover: false };
          });

      const ds = new google.maps.DirectionsService();
      ds.route({
        origin: new google.maps.LatLng(driverLocation.lat, driverLocation.lng),
        destination: new google.maps.LatLng(finalStop.lat, finalStop.lng),
        waypoints: waypointsForReroute,
        travelMode: google.maps.TravelMode.DRIVING,
      }, async (res, status) => {
        if (status === google.maps.DirectionsStatus.OK && res?.routes[0]) {
          const newPath = res.routes[0].overview_path;
          setActivePath(newPath);

          // Sync new polyline to Firestore so passengers see the corrected route
          try {
            const { doc, updateDoc } = await import("firebase/firestore");
            const { db } = await import("@/lib/firebase");
            await updateDoc(doc(db, "routes", route.id), {
              polyline: res.routes[0].overview_polyline
            });
            console.log("Rerouted + synced to Firebase.");
          } catch (e) {
            console.error("Failed to sync reroute polyline", e);
          }
        }
        setTimeout(() => setIsRecalculating(false), REROUTE_COOLDOWN_MS / 2);
      });
    }
  }, [driverLocation?.lat, driverLocation?.lng, navPhase, isRecalculating, currentStopIndex, finalStop, stops, route.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync selected polyline to Firebase when navigation starts
  useEffect(() => {
    if (navPhase === "navigating" && previewRoutes[previewSelectedIdx]?.overview_polyline) {
      const path = previewRoutes[previewSelectedIdx].overview_path;
      if (path) setActivePath(path);

      const syncPolyline = async () => {
        try {
          const { doc, updateDoc } = await import("firebase/firestore");
          const { db } = await import("@/lib/firebase");
          await updateDoc(doc(db, "routes", route.id), {
            polyline: previewRoutes[previewSelectedIdx].overview_polyline
          });
        } catch (e) {
          console.error("Failed to sync initial polyline", e);
        }
      };
      syncPolyline();
    }
  }, [navPhase, previewSelectedIdx, previewRoutes, route.id]);


  // ═══════════════════════════════════════════════════════════════════
  //  IMPERATIVE BUS MARKER
  // ═══════════════════════════════════════════════════════════════════

  const busMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const busMarkerContentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!map || !markerLib) return;

    const content = document.createElement("div");
    content.style.width = "48px";
    content.style.height = "48px";
    content.style.position = "relative";
    content.innerHTML = `
      <div style="position:absolute;inset:0;border-radius:50%;background:rgba(66,133,244,0.2);animation:ping 1s cubic-bezier(0,0,0.2,1) infinite;opacity:0.6"></div>
      <div class="bus-arrow" style="position:relative;z-index:10;display:flex;align-items:center;justify-content:center;width:48px;height:48px;transition:transform 600ms cubic-bezier(0.4,0,0.2,1);will-change:transform">
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none"><path d="M12 2L20 20L12 16L4 20L12 2Z" fill="${SELECTED_ROUTE_COLOR}" stroke="white" stroke-width="1.5" stroke-linejoin="round"/></svg>
      </div>
      <div style="position:absolute;bottom:-4px;right:-4px;width:10px;height:10px;border-radius:50%;background:${SELECTED_ROUTE_COLOR};border:2px solid #1a1a2e"></div>
    `;
    busMarkerContentRef.current = content;

    const marker = new google.maps.marker.AdvancedMarkerElement({
      map,
      content,
      zIndex: 100,
    });
    busMarkerRef.current = marker;

    return () => {
      marker.map = null;
      busMarkerRef.current = null;
    };
  }, [map, markerLib]);

  useEffect(() => {
    if (!busMarkerRef.current || !driverLocation) return;
    busMarkerRef.current.position = { lat: driverLocation.lat, lng: driverLocation.lng };
    const arrow = busMarkerContentRef.current?.querySelector(".bus-arrow") as HTMLElement | null;
    if (arrow) {
      const snapped = Math.round(driverLocation.heading / 5) * 5;
      arrow.style.transform = `rotate(${snapped}deg)`;
    }
  }, [driverLocation?.lat, driverLocation?.lng, driverLocation?.heading]);

  useEffect(() => {
    if (!busMarkerRef.current) return;
    busMarkerRef.current.map = driverLocation ? (map ?? null) : null;
  }, [map, !!driverLocation]); // eslint-disable-line react-hooks/exhaustive-deps


  // ═══════════════════════════════════════════════════════════════════
  //  MAP CENTERING — only in navigating mode
  // ═══════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (!map || !driverLocation || !isCentered || navPhase !== "navigating") return;
    map.panTo({ lat: driverLocation.lat, lng: driverLocation.lng });
    map.setHeading(driverLocation.heading);
    map.setTilt(60);
    if (map.getZoom()! < 16) map.setZoom(18);
  }, [map, navPhase, driverLocation?.lat, driverLocation?.lng, driverLocation?.heading, isCentered]);

  // ═══════════════════════════════════════════════════════════════════
  //  HANDLERS
  // ═══════════════════════════════════════════════════════════════════

  const handleRecenter = useCallback(() => {
    if (map && driverLocation) {
      map.panTo({ lat: driverLocation.lat, lng: driverLocation.lng });
      map.setHeading(driverLocation.heading);
      setIsCentered(true);
    }
  }, [map, driverLocation]);

  const handlePointerDown = useCallback(() => setIsCentered(false), []);

  const handleStartNavigation = useCallback(async () => {
    setNavPhase("navigating");
    setIsCentered(true);
    setDelayMinutes(0);
  }, []);

  const handleBackToPreview = useCallback(() => {
    setNavPhase("preview");
    clearNavPolylines();
  }, [clearNavPolylines]);

  const defaultCenterRef = useRef(
    driverLocation || (stops.length ? { lat: stops[0].lat, lng: stops[0].lng } : { lat: 23.03, lng: 72.55 })
  );

  // ── Build upstream ETAs for all stops ──
  const upcomingETAs = useMemo(() => {
    const etaMap: Record<string, number> = {};
    let accumTime = displayDur;
    if (nextStop?.id) {
      etaMap[nextStop.id] = Math.round((accumTime / 60) + delayMinutes);
      for (let i = currentStopIndex + 1; i < stops.length; i++) {
        const dist = (getDistanceMeters(stops[i - 1], stops[i]) * 1.3) + 125;
        accumTime += (dist / 250) * 60;
        etaMap[stops[i].id] = Math.round((accumTime / 60) + delayMinutes);
      }
    }
    return etaMap;
  }, [displayDur, delayMinutes, nextStop?.id, currentStopIndex, stops]);

  return (
    <>
      <style>{RIPPLE_KEYFRAMES}</style>

      <div
        className="absolute inset-0 z-0"
        onPointerDown={handlePointerDown}
        onTouchStart={handlePointerDown}
      >
        <GoogleMap
          defaultCenter={defaultCenterRef.current}
          defaultZoom={14}
          disableDefaultUI={true}
          mapId={"b1b1b1b1b1b1b1b1"}
          gestureHandling="greedy"
        >
          {/* Render ALL stops — always visible regardless of phase */}
          {stops.map((stop, i) => (
            <AdvancedMarker key={`stop-${stop.id || i}`} position={{ lat: stop.lat, lng: stop.lng }} zIndex={i === currentStopIndex ? 100 : 50}>
              {i === currentStopIndex ? (
                <div className="relative flex flex-col items-center">
                  <div
                    className="absolute w-8 h-8 bg-orange-500 rounded-full"
                    style={{ animation: "ripple 2s infinite" }}
                  />
                  <div className="w-8 h-8 bg-orange-500 border-4 border-orange-400 rounded-full z-10 flex items-center justify-center">
                    <span className="text-white font-black text-xs">{String.fromCharCode(65 + i)}</span>
                  </div>
                  <span className="mt-2 px-3 py-1 bg-brand-surface border border-brand-dark text-white rounded-xl text-[10px] font-bold uppercase tracking-widest z-20 shadow-3xl">
                    {stop.shortName}
                  </span>
                </div>
              ) : i < currentStopIndex ? (
                <div className="flex items-center justify-center w-6 h-6 bg-orange-500/60 border-2 border-orange-400/50 rounded-full opacity-60 shadow-lg">
                  <span className="text-white font-black text-[10px]">{String.fromCharCode(65 + i)}</span>
                </div>
              ) : (
                <div className="relative flex flex-col items-center">
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

      {/* ── Top-LEFT: Back button ── */}
      {navPhase === "navigating" && (
        <div className="absolute left-4 top-10 z-40">
          <button
            onClick={handleBackToPreview}
            className="p-4 rounded-full shadow-2xl bg-brand-surface border border-white/10 text-white active:scale-95 transition-all"
            title="Back to route preview"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* ── Top-RIGHT: Recenter ── */}
      <div className="absolute right-4 top-10 z-40">
        <button
          onClick={handleRecenter}
          className={`p-4 rounded-full shadow-2xl transition-all duration-300 border active:scale-95 ${
            isCentered
              ? "bg-blue-500 text-white border-blue-400 opacity-60"
              : "bg-brand-surface text-white border-white/10 hover:bg-white/10"
          }`}
          title="Recenter map on bus"
        >
          <GPS className="w-5 h-5" />
        </button>
      </div>

      {/* ── Bottom Panel — fixed above nav bar so nothing is clipped ── */}
      <div className="absolute bottom-[70px] left-0 right-0 z-50">
        {navPhase === "preview" ? (
          <RoutePreviewCards
            routes={routeSummaries}
            selectedIndex={previewSelectedIdx}
            onSelect={selectPreviewRoute}
            onStart={handleStartNavigation}
            isLoading={previewLoading && previewRoutes.length === 0}
          />
        ) : (
          <RouteTimelineSheet
            route={route}
            targetStopId={stops[stops.length - 1]?.id || ""}
            activeBusId={busId}
            stopETAs={upcomingETAs}
            headerContent={
              <div className="flex items-center w-full justify-between mt-2 pl-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest leading-none">
                    Transmitting
                  </span>
                  {delayMinutes > 0 && (
                    <span className="ml-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[9px] font-black uppercase tracking-widest">
                      +{delayMinutes} MIN
                    </span>
                  )}
                </div>
                {onEndShift && isTracking && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onEndShift(); }}
                    className="h-8 px-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-[9px] font-black uppercase tracking-[0.2em] hover:bg-red-500 hover:text-white transition-all pointer-events-auto"
                  >
                    End Shift
                  </button>
                )}
              </div>
            }
            bottomControls={
              <div className="flex items-center gap-2 justify-between w-full">
                {/* Left: delay controls */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-black text-white/30 uppercase tracking-widest mr-1">Delay</span>
                  <button onClick={() => pushDelay(-2)} className="h-9 w-12 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black hover:bg-blue-500/30 active:scale-90 transition-all flex items-center justify-center">-2</button>
                  <button onClick={() => pushDelay(-1)} className="h-9 w-12 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black hover:bg-blue-500/30 active:scale-90 transition-all flex items-center justify-center">-1</button>
                  <div className="px-2 min-w-[36px] text-center">
                    <span className={`text-sm font-black ${delayMinutes > 0 ? 'text-amber-400' : 'text-white/20'}`}>{delayMinutes > 0 ? `+${delayMinutes}` : '0'}</span>
                    <div className="text-[7px] text-white/20 uppercase tracking-widest">min</div>
                  </div>
                  <button onClick={() => pushDelay(1)} className="h-9 w-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black hover:bg-amber-500/30 active:scale-90 transition-all flex items-center justify-center">+1</button>
                  <button onClick={() => pushDelay(2)} className="h-9 w-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black hover:bg-amber-500/30 active:scale-90 transition-all flex items-center justify-center">+2</button>
                </div>
                {/* Right: manual next-stop */}
                {currentStopIndex < stops.length - 1 && (
                  <button
                    onClick={handleManualNextStop}
                    className="flex items-center gap-1.5 h-9 px-3 rounded-xl bg-white/5 border border-white/10 text-white/60 text-[9px] font-black uppercase tracking-widest hover:bg-white/10 active:scale-90 transition-all"
                  >
                    Next Stop
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            }
          />
        )}
      </div>
    </>
  );
}

export default function DriverMap(props: DriverMapProps) {
  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <DriverMapInner {...props} />
    </div>
  );
}
