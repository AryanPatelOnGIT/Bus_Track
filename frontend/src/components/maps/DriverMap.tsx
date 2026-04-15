"use client";

import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { LocateFixed as GPS, Target, ArrowLeft } from "lucide-react";
import {
  Map as GoogleMap,
  AdvancedMarker,
  useMap,
  useMapsLibrary,
} from "@vis.gl/react-google-maps";
import { RouteData } from "@/hooks/useRoutes";
import { useGoogleDirections } from "@/hooks/useGoogleDirections";
import { formatDistance, formatETA, getDistanceMeters, distanceFromPolyline } from "@/lib/mapUtils";
import RoutePreviewCards from "@/components/maps/RoutePreviewCards";

export interface DriverMapProps {
  route: RouteData;
  driverLocation: { lat: number; lng: number; heading: number } | null;
  socketRef: React.RefObject<ReturnType<typeof import("socket.io-client").io> | null>;
  busId: string;
}

// ── Constants ──
const RIPPLE_KEYFRAMES = `
  @keyframes ripple {
    0% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.5); }
    70% { box-shadow: 0 0 0 30px rgba(249, 115, 22, 0); }
    100% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0); }
  }
`;

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


function DriverMapInner({ route, driverLocation, socketRef, busId }: DriverMapProps) {
  const map = useMap();
  const markerLib = useMapsLibrary("marker");

  // ── Stop Progression — purely local math, zero API calls ──
  const stops = route.stops || [];
  const [currentStopIndex, setCurrentStopIndex] = useState(0);
  const nextStop = stops[currentStopIndex] ?? stops[stops.length - 1];

  // Auto-advance when driver is within 80m of the next stop
  useEffect(() => {
    if (!driverLocation || !nextStop || currentStopIndex >= stops.length - 1) return;
    const dist = getDistanceMeters(
      { lat: driverLocation.lat, lng: driverLocation.lng },
      { lat: nextStop.lat, lng: nextStop.lng }
    );
    if (dist < 80) {
      setCurrentStopIndex(i => Math.min(i + 1, stops.length - 1));
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
  //  PREVIEW MODE — fetch full route
  // ═══════════════════════════════════════════════════════════════════

  const previewOrigin = useMemo(() => {
    if (driverLocation) return { lat: driverLocation.lat, lng: driverLocation.lng };
    if (stops.length) return { lat: stops[0].lat, lng: stops[0].lng };
    return null;
  }, [
    driverLocation ? Math.round(driverLocation.lat * 1000) : null,
    driverLocation ? Math.round(driverLocation.lng * 1000) : null,
    stops,
  ]);

  const apiDestination = nextStop ? { lat: nextStop.lat, lng: nextStop.lng } : null;

  const {
    allRoutes: previewRoutes,
    routeSummaries,
    selectedRouteIndex: previewSelectedIdx,
    selectRoute: selectPreviewRoute,
    isLoading: previewLoading,
  } = useGoogleDirections({
    origin: previewOrigin,
    destination: apiDestination,
    waypoints: [],
    enabled: navPhase === "preview",
    debounceMs: 8000,
    provideRouteAlternatives: true,
  });


  // ─── Local ETA — zero API calls ─────────────────────────────────
  // Distance = Haversine to nextStop. Speed uses driver's last GPS speed,
  // falling back to a typical urban bus speed of 25 km/h.
  useEffect(() => {
    if (navPhase !== "navigating" || !driverLocation || !nextStop) return;

    const distM = getDistanceMeters(
      { lat: driverLocation.lat, lng: driverLocation.lng },
      { lat: nextStop.lat, lng: nextStop.lng }
    );

    // Speed: derive from last two GPS updates or use 25 km/h fallback
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

  // Preview polylines — one per alternative route
  const previewPolylinesRef = useRef<google.maps.Polyline[]>([]);

  // Nav polylines — full route
  const fullPolyRef = useRef<google.maps.Polyline | null>(null);

  // Clean up all preview polylines
  const clearPreviewPolylines = useCallback(() => {
    previewPolylinesRef.current.forEach(p => p.setMap(null));
    previewPolylinesRef.current = [];
  }, []);

  // Clean up nav polylines
  const clearNavPolylines = useCallback(() => {
    fullPolyRef.current?.setMap(null);
    fullPolyRef.current = null;
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

  // Live segment navigation path
  const [navPath, setNavPath] = useState<google.maps.LatLng[]>([]);

  useEffect(() => {
    if (navPhase !== "navigating" || !nextStop) return;

    // Fetch the segment from current location to nextStop
    const ds = new google.maps.DirectionsService();
    const origin = driverLocation 
      ? new google.maps.LatLng(driverLocation.lat, driverLocation.lng)
      : new google.maps.LatLng(previewOrigin?.lat || 0, previewOrigin?.lng || 0);
      
    ds.route({
      origin,
      destination: new google.maps.LatLng(nextStop.lat, nextStop.lng),
      travelMode: google.maps.TravelMode.DRIVING,
    }, (res, status) => {
      if (status === google.maps.DirectionsStatus.OK && res && res.routes[0]) {
        setNavPath(res.routes[0].overview_path);
      }
    });
  }, [navPhase, nextStop?.id]); // Re-run when target stop changes

  // Draw full navigation route polyline (ZERO API calls, drawn from state)
  useEffect(() => {
    if (!map || navPhase !== "navigating" || !geometryLib) return;
    clearPreviewPolylines();

    if (!fullPolyRef.current) {
      fullPolyRef.current = new google.maps.Polyline({
        map,
        strokeColor: FULL_ROUTE_COLOR,
        strokeWeight: 6,
        strokeOpacity: 0.6,
        zIndex: 40,
      });
    }

    if (navPath.length > 0) {
      fullPolyRef.current.setPath(navPath);
    } else {
      const selected = previewRoutes[previewSelectedIdx];
      if (selected && selected.overview_path) {
        fullPolyRef.current.setPath(selected.overview_path);
      }
    }

    return () => {
      clearNavPolylines();
    };
  }, [map, navPhase, geometryLib, navPath, previewRoutes, previewSelectedIdx]);


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
  //  OFF-ROUTE DETECTION & RECALCULATION
  // ═══════════════════════════════════════════════════════════════════
  
  const [isRecalculating, setIsRecalculating] = useState(false);
  
  const finalStop = stops.length > 0 ? stops[stops.length - 1] : null;
  const fullWaypoints = useMemo(() => {
    if (!stops.length || currentStopIndex >= stops.length - 1) return [];
    const remaining = stops.slice(currentStopIndex, -1);
    if (remaining.length <= 25) return remaining.map(s => ({ lat: s.lat, lng: s.lng }));
    const sampled = [];
    const step = remaining.length / 25;
    for (let i = 0; i < 25; i++) {
        const s = remaining[Math.floor(i * step)];
        sampled.push({ lat: s.lat, lng: s.lng });
    }
    return sampled;
  }, [stops, currentStopIndex]);

  useEffect(() => {
    if (navPhase !== "navigating" || !driverLocation || !geometryLib || !route.polyline || isRecalculating) return;

    try {
      const decoded = geometryLib.encoding.decodePath(route.polyline);
      const polyCoords = decoded.map(p => ({ lat: p.lat(), lng: p.lng() }));
      
      const dist = distanceFromPolyline(
        { lat: driverLocation.lat, lng: driverLocation.lng },
        polyCoords
      );
      
      if (dist > 150) {
        setIsRecalculating(true);
        console.log(`Driver off-route by ${Math.round(dist)}m! Recalculating full route for passengers...`);
        
        const ds = new google.maps.DirectionsService();
        ds.route({
          origin: new google.maps.LatLng(driverLocation.lat, driverLocation.lng),
          destination: finalStop ? new google.maps.LatLng(finalStop.lat, finalStop.lng) : new google.maps.LatLng(driverLocation.lat, driverLocation.lng),
          waypoints: fullWaypoints.map(wp => ({ location: new google.maps.LatLng(wp.lat, wp.lng), stopover: true })),
          travelMode: google.maps.TravelMode.DRIVING
        }, async (res, status) => {
          if (status === google.maps.DirectionsStatus.OK && res && res.routes[0]) {
             try {
                const { doc, updateDoc } = await import("firebase/firestore");
                const { db } = await import("@/lib/firebase");
                
                await updateDoc(doc(db, "routes", route.id), {
                  polyline: res.routes[0].overview_polyline
                });
                console.log("Recalculation complete, automatically updated Firebase.");
             } catch (e) {
                console.error("Failed to save recalculated route to Firebase", e);
             }
          }
          // Wait briefly before allowing another recalculation check
          setTimeout(() => setIsRecalculating(false), 8000);
        });
      }
    } catch (err) {
      console.warn("Off-route math error", err);
    }
  }, [driverLocation?.lat, driverLocation?.lng, navPhase, geometryLib, route.polyline, isRecalculating, finalStop, fullWaypoints, route.id]);


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
  }, []);

  const handleBackToPreview = useCallback(() => {
    setNavPhase("preview");
    clearNavPolylines();
  }, [clearNavPolylines]);

  const hasArrived = displayDist < 80 && displayDist > 0 && currentStopIndex >= stops.length - 1;

  const defaultCenterRef = useRef(
    driverLocation || (stops.length ? { lat: stops[0].lat, lng: stops[0].lng } : { lat: 23.03, lng: 72.55 })
  );

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
          {/* All Stops - color coded and numbered */}
          {stops.map((stop, i) => (
            <AdvancedMarker key={`stop-${stop.id || i}`} position={{ lat: stop.lat, lng: stop.lng }} zIndex={i === currentStopIndex ? 100 : 50}>
              {i === currentStopIndex ? (
                // Next target stop — highlighted & animated
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
                // Already visited — dimmed orange
                <div className="flex items-center justify-center w-6 h-6 bg-orange-500/60 border-2 border-orange-400/50 rounded-full opacity-60 shadow-lg">
                  <span className="text-white font-black text-[10px]">{String.fromCharCode(65 + i)}</span>
                </div>
              ) : (
                // Upcoming — unreached
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
            {stops.length > 0 && (
              <div className="mb-2 text-center">
                <span className="text-[9px] font-black uppercase tracking-widest text-white/30">
                  Path {String.fromCharCode(65 + Math.max(0, currentStopIndex - (currentStopIndex === 0 ? 0 : 1)))} - {String.fromCharCode(65 + Math.max(1, currentStopIndex))} — 
                </span>
                <span className="text-[9px] font-black uppercase tracking-widest text-white/60">
                  {nextStop?.name || "Final Stop"}
                </span>
              </div>
            )}
            <InfoBar
              distRem={displayDist}
              durRem={displayDur}
              hasArrived={hasArrived}
              targetName={nextStop?.name || "Final Stop"}
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
