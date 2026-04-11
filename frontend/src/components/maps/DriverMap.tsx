"use client";

import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { LocateFixed as GPS, Target, ArrowLeft } from "lucide-react";
import {
  Map as GoogleMap,
  AdvancedMarker,
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";
import { RouteData, RouteStop } from "@/hooks/useRoutes";
import { useRerouting } from "@/hooks/useRerouting";
import { useGoogleDirections } from "@/hooks/useGoogleDirections";
import { formatDistance, formatETA, getDistanceMeters } from "@/lib/mapUtils";
import NavInstructionBanner from "@/components/maps/NavInstructionBanner";
import RoutePreviewCards from "@/components/maps/RoutePreviewCards";

export interface DriverMapProps {
  route: RouteData;
  targetStop: RouteStop;
  driverLocation: { lat: number; lng: number; heading: number } | null;
  socketRef: React.RefObject<ReturnType<typeof import("socket.io-client").io> | null>;
  busId: string;
}

// ── Constants ──
const RIPPLE_KEYFRAMES = `
  @keyframes ripple {
    0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.5); }
    70% { box-shadow: 0 0 0 30px rgba(59, 130, 246, 0); }
    100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
  }
`;
const ACTIVE_ROUTE_THRESHOLD_M = 500;  // Increased from 100m to reduce API calls

// ── Route colors (Google Maps style) ──
const SELECTED_ROUTE_COLOR = "#4285F4";      // Google blue
const ALTERNATIVE_ROUTE_COLOR = "#9AA0A6";   // Google gray
const FULL_ROUTE_COLOR = "#4285F4";

type NavPhase = "preview" | "navigating";

// ── Memoized Info Bar ──
const InfoBar = React.memo(function InfoBar({
  distRem, durRem, hasArrived, targetName,
}: { distRem: number; durRem: number; hasArrived: boolean; targetName: string }) {
  if (hasArrived) {
    return (
      <div className="bg-emerald-500 border border-emerald-400 rounded-[1.5rem] px-8 py-5 shadow-3xl flex items-center justify-center gap-3">
        <span className="text-brand-dark font-black text-xs uppercase tracking-widest leading-none">
          Arrived at {targetName}
        </span>
      </div>
    );
  }
  return (
    <div className="bg-brand-surface/90 border border-white/5 shadow-3xl rounded-[2rem] p-6 flex justify-between items-center w-full">
      <div className="flex flex-col text-center w-1/2">
        <span className="text-white/30 text-[10px] font-black uppercase tracking-widest mb-1">Dist</span>
        <span className="text-white text-lg font-black tracking-tighter">{formatDistance(distRem)}</span>
      </div>
      <div className="w-px h-8 bg-white/5" />
      <div className="flex flex-col text-center w-1/2">
        <span className="text-white/30 text-[10px] font-black uppercase tracking-widest mb-1">Time</span>
        <span className="text-white text-lg font-black tracking-tighter">{formatETA(durRem / 60)}</span>
      </div>
    </div>
  );
});


function DriverMapInner({ route, targetStop, driverLocation, socketRef, busId }: DriverMapProps) {
  const map = useMap();
  const markerLib = useMapsLibrary("marker");

  // ── Navigation phase state machine ──
  const [navPhase, setNavPhase] = useState<NavPhase>("preview");
  const [directionsEnabled, setDirectionsEnabled] = useState(true);
  const [isCentered, setIsCentered] = useState(true);
  const [displayDist, setDisplayDist] = useState(0);
  const [displayDur, setDisplayDur] = useState(0);

  // ═══════════════════════════════════════════════════════════════════
  //  PREVIEW MODE — fetch alternatives (no waypoints for alternatives)
  // ═══════════════════════════════════════════════════════════════════

  const previewOrigin = useMemo(() => {
    if (driverLocation) return { lat: driverLocation.lat, lng: driverLocation.lng };
    if (route.stops?.length) return { lat: route.stops[0].lat, lng: route.stops[0].lng };
    return null;
  }, [
    driverLocation ? Math.round(driverLocation.lat * 1000) : null,
    driverLocation ? Math.round(driverLocation.lng * 1000) : null,
    route.stops,
  ]);

  const {
    allRoutes: previewRoutes,
    routeSummaries,
    selectedRouteIndex: previewSelectedIdx,
    selectRoute: selectPreviewRoute,
    isLoading: previewLoading,
  } = useGoogleDirections({
    origin: previewOrigin,
    destination: { lat: targetStop.lat, lng: targetStop.lng },
    waypoints: [],       // No waypoints → enables alternatives
    enabled: navPhase === "preview",
    debounceMs: 8000,    // 8s debounce to cut API calls during early movement
    provideRouteAlternatives: true,
  });

  // ═══════════════════════════════════════════════════════════════════
  //  NAVIGATING MODE — uses the active segment with waypoints
  // ═══════════════════════════════════════════════════════════════════

  // Full route polyline — from Firestore cache, ZERO API calls
  // The polyline was pre-computed during seed.ts and stored in Firestore.
  const geometryLib = useMapsLibrary("geometry");

  // Live segment — metered origin
  const activeOriginRef = useRef<{ lat: number; lng: number } | null>(null);
  const [activeOrigin, setActiveOrigin] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (navPhase !== "navigating" || !driverLocation) return;
    const newPos = { lat: driverLocation.lat, lng: driverLocation.lng };
    if (!activeOriginRef.current) {
      activeOriginRef.current = newPos;
      setActiveOrigin(newPos);
      return;
    }
    const dist = getDistanceMeters(activeOriginRef.current, newPos);
    if (dist > ACTIVE_ROUTE_THRESHOLD_M) {
      activeOriginRef.current = newPos;
      setActiveOrigin(newPos);
    }
  }, [navPhase, driverLocation?.lat, driverLocation?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeWaypoints = useMemo(() => {
    const targetIndex = route.stops?.findIndex(s => s.id === targetStop.id) ?? -1;
    if (targetIndex === -1) return [];
    return (route.stops || []).filter((_, idx) => idx < targetIndex).map(s => ({ lat: s.lat, lng: s.lng }));
  }, [route.stops, targetStop.id]);

  // Navigation mode: use server-side ETA from socket + pre-computed Firestore polyline.
  // Directions API is NOT called during navigation to save cost.
  // The full route polyline is already in `route.polyline` (decoded below).
  const {
    directionsResult: activeResult,
    durationValue, distanceValue,
    nextInstruction, distanceToNextTurn, maneuver,
    isLoading: navLoading,
  } = useGoogleDirections({
    origin: activeOrigin || (route.stops?.length ? { lat: route.stops[0].lat, lng: route.stops[0].lng } : null),
    destination: { lat: targetStop.lat, lng: targetStop.lng },
    waypoints: activeWaypoints,
    enabled: false, // DISABLED: use Firestore polyline + server ETA instead
    debounceMs: 10000,
  });

  useEffect(() => {
    if (navPhase !== "navigating") return;
    const roundedDist = Math.round(distanceValue / 10) * 10;
    const roundedDur = Math.round(durationValue / 10) * 10;
    setDisplayDist(prev => prev === roundedDist ? prev : roundedDist);
    setDisplayDur(prev => prev === roundedDur ? prev : roundedDur);
  }, [navPhase, distanceValue, durationValue]);

  // ═══════════════════════════════════════════════════════════════════
  //  IMPERATIVE POLYLINES
  // ═══════════════════════════════════════════════════════════════════

  // Preview polylines — one per alternative route
  const previewPolylinesRef = useRef<google.maps.Polyline[]>([]);

  // Nav polylines — full route + active segment
  const fullPolyRef = useRef<google.maps.Polyline | null>(null);
  const activePolyRef = useRef<google.maps.Polyline | null>(null);

  // Clean up all preview polylines
  const clearPreviewPolylines = useCallback(() => {
    previewPolylinesRef.current.forEach(p => p.setMap(null));
    previewPolylinesRef.current = [];
  }, []);

  // Clean up nav polylines
  const clearNavPolylines = useCallback(() => {
    fullPolyRef.current?.setMap(null);
    activePolyRef.current?.setMap(null);
    fullPolyRef.current = null;
    activePolyRef.current = null;
  }, []);

  // Draw preview polylines when routes change
  useEffect(() => {
    if (!map || navPhase !== "preview") return;
    clearPreviewPolylines();

    // Draw alternatives FIRST (behind), then selected LAST (on top)
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

      // Click listener — tap alternative to select it
      if (!isSelected) {
        polyline.addListener("click", () => {
          selectPreviewRoute(i);
        });
      }

      polylines.push(polyline);
    });

    previewPolylinesRef.current = polylines;

    // Fit bounds to show all routes
    if (previewRoutes.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      previewRoutes.forEach(r => {
        r.overview_path?.forEach(p => bounds.extend(p));
      });
      map.fitBounds(bounds, { top: 100, bottom: 280, left: 50, right: 50 });
    }

    return () => {
      polylines.forEach(p => p.setMap(null));
    };
  }, [map, navPhase, previewRoutes, previewSelectedIdx]); // eslint-disable-line react-hooks/exhaustive-deps

  // Draw navigation polylines
  useEffect(() => {
    if (!map || navPhase !== "navigating") return;
    clearPreviewPolylines();

    if (!fullPolyRef.current) {
      fullPolyRef.current = new google.maps.Polyline({
        map,
        strokeColor: FULL_ROUTE_COLOR,
        strokeWeight: 4,
        strokeOpacity: 0.15,
        zIndex: 40,
      });
    }
    if (!activePolyRef.current) {
      activePolyRef.current = new google.maps.Polyline({
        map,
        strokeColor: SELECTED_ROUTE_COLOR,
        strokeWeight: 7,
        strokeOpacity: 1.0,
        zIndex: 50,
      });
    }

    return () => {
      clearNavPolylines();
    };
  }, [map, navPhase]); // eslint-disable-line react-hooks/exhaustive-deps

  // Decode and display the pre-computed polyline from Firestore (ZERO API calls)
  useEffect(() => {
    if (!fullPolyRef.current || !geometryLib) return;
    if (route.polyline) {
      try {
        const decoded = geometryLib.encoding.decodePath(route.polyline);
        fullPolyRef.current.setPath(decoded);
      } catch {
        // Fallback: use waypoints as straight-line path
        if (route.waypoints?.length > 0) {
          fullPolyRef.current.setPath(route.waypoints.map(w => ({ lat: w.lat, lng: w.lng })));
        }
      }
    } else if (route.waypoints?.length > 0) {
      fullPolyRef.current.setPath(route.waypoints.map(w => ({ lat: w.lat, lng: w.lng })));
    }
  }, [geometryLib, route.polyline, route.waypoints]);

  useEffect(() => {
    if (activePolyRef.current && activeResult) {
      activePolyRef.current.setPath(activeResult.routes[0]?.overview_path || []);
    }
  }, [activeResult]);

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

  // Update bus marker position
  useEffect(() => {
    if (!busMarkerRef.current || !driverLocation) return;
    busMarkerRef.current.position = { lat: driverLocation.lat, lng: driverLocation.lng };
    const arrow = busMarkerContentRef.current?.querySelector(".bus-arrow") as HTMLElement | null;
    if (arrow) {
      const snapped = Math.round(driverLocation.heading / 5) * 5;
      arrow.style.transform = `rotate(${snapped}deg)`;
    }
  }, [driverLocation?.lat, driverLocation?.lng, driverLocation?.heading]);

  // Show/hide marker based on location availability
  useEffect(() => {
    if (!busMarkerRef.current) return;
    busMarkerRef.current.map = driverLocation ? (map ?? null) : null;
  }, [map, !!driverLocation]); // eslint-disable-line react-hooks/exhaustive-deps

  // ═══════════════════════════════════════════════════════════════════
  //  REROUTING (navigating mode only)
  // ═══════════════════════════════════════════════════════════════════

  const onReroute = useCallback(() => {
    setDirectionsEnabled(false);
    setTimeout(() => setDirectionsEnabled(true), 100);
  }, []);

  const routePolylineRef = useRef<{ lat: number; lng: number }[]>([]);
  useEffect(() => {
    if (activeResult) {
      routePolylineRef.current = activeResult.routes[0]?.overview_path?.map(p => ({ lat: p.lat(), lng: p.lng() })) || [];
    }
  }, [activeResult]);

  const { isRerouting } = useRerouting({
    currentPosition: navPhase === "navigating" ? driverLocation : null,
    routePolyline: routePolylineRef.current,
    onReroute,
  });

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

  const handleStartNavigation = useCallback(() => {
    setNavPhase("navigating");
    // Reset active origin so it picks up current position
    activeOriginRef.current = null;
    setActiveOrigin(null);
    setIsCentered(true);
  }, []);

  const handleBackToPreview = useCallback(() => {
    setNavPhase("preview");
    clearNavPolylines();
    activeOriginRef.current = null;
    setActiveOrigin(null);
  }, [clearNavPolylines]);

  const hasArrived = displayDist < 50 && displayDist > 0;

  const defaultCenterRef = useRef(
    driverLocation || (route.stops ? { lat: route.stops[0].lat, lng: route.stops[0].lng } : { lat: 23.03, lng: 72.55 })
  );

  return (
    <>
      <style>{RIPPLE_KEYFRAMES}</style>

      {/* Nav Instruction Banner — only in navigating mode */}
      {navPhase === "navigating" && (
        <NavInstructionBanner
          instruction={nextInstruction}
          distanceToTurn={distanceToNextTurn}
          maneuver={maneuver}
          isRerouting={isRerouting || navLoading}
        />
      )}

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
          {/* Target stop marker & All Stops */}
          {route.stops?.map((stop, i) => (
            <AdvancedMarker key={`stop-${stop.id || i}`} position={{ lat: stop.lat, lng: stop.lng }}>
              {stop.id === targetStop.id ? (
                <div className="relative flex flex-col items-center">
                  <div
                    className="absolute w-5 h-5 bg-blue-500 rounded-full"
                    style={{ animation: "ripple 2s infinite" }}
                  />
                  <div className="w-5 h-5 bg-white border-4 border-brand-dark rounded-full z-10" />
                  <span className="mt-2 px-3 py-1 bg-brand-surface border border-white/10 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest z-20 shadow-3xl">
                    {stop.shortName}
                  </span>
                </div>
              ) : (
                <div className="relative flex flex-col items-center opacity-70 scale-75">
                   <div className="flex items-center justify-center w-4 h-4 bg-white border-4 border-brand-dark rounded-full shadow-lg" />
                   <span className="mt-1 px-2 py-0.5 bg-brand-dark/80 text-white rounded-[4px] text-[8px] whitespace-nowrap opacity-60 font-black uppercase tracking-widest">
                    {stop.shortName}
                  </span>
                </div>
              )}
            </AdvancedMarker>
          ))}

          {!route.stops?.find(s => s.id === targetStop.id) && (
            <AdvancedMarker position={targetStop}>
              <div className="relative flex flex-col items-center">
                <div
                  className="absolute w-5 h-5 bg-blue-500 rounded-full"
                  style={{ animation: "ripple 2s infinite" }}
                />
                <div className="w-5 h-5 bg-white border-4 border-brand-dark rounded-full z-10" />
                <span className="mt-2 px-3 py-1 bg-brand-surface border border-white/10 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest z-20 shadow-3xl">
                  {targetStop.shortName}
                </span>
              </div>
            </AdvancedMarker>
          )}
        </GoogleMap>
      </div>

      {/* ── Top-left: Back button (navigating → preview) ── */}
      {navPhase === "navigating" && (
        <div className="absolute left-6 top-32 z-40">
          <button
            onClick={handleBackToPreview}
            className="p-4 rounded-full shadow-2xl bg-brand-surface border border-white/10 text-white active:scale-95 transition-all"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* ── Top-right: Recenter button ── */}
      <div className={`absolute right-6 z-40 ${navPhase === "navigating" ? "top-32" : "top-8"}`}>
        <button
          onClick={handleRecenter}
          className={`p-4 rounded-full shadow-2xl transition-all duration-300 ${isCentered
            ? "bg-blue-500 text-white scale-90 opacity-40 hover:opacity-100"
            : "bg-white text-slate-900 scale-100 hover:bg-slate-100"
          } border border-white/20 active:scale-95`}
        >
          {isCentered ? <GPS /> : <Target />}
        </button>
      </div>

      {/* ── Bottom Panel ── */}
      <div className="absolute bottom-6 left-0 right-0 z-50">
        {navPhase === "preview" ? (
          /* Route Preview Cards — Google Maps style */
          <RoutePreviewCards
            routes={routeSummaries}
            selectedIndex={previewSelectedIdx}
            onSelect={selectPreviewRoute}
            onStart={handleStartNavigation}
            isLoading={previewLoading && previewRoutes.length === 0}
          />
        ) : (
          /* Navigation Info Bar */
          <div className="px-6 max-w-sm mx-auto">
            <InfoBar
              distRem={displayDist}
              durRem={displayDur}
              hasArrived={hasArrived}
              targetName={targetStop.name}
            />
          </div>
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
