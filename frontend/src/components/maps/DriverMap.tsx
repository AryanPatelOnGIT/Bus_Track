"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { LocateFixed as GPS, Target } from "lucide-react";
import {
  Map as GoogleMap,
  AdvancedMarker,
  useMap,
} from "@vis.gl/react-google-maps";
import { RouteData, RouteStop } from "@/hooks/useRoutes";
import { useRerouting } from "@/hooks/useRerouting";
import { useGoogleDirections } from "@/hooks/useGoogleDirections";
import { formatDistance, formatETA } from "@/lib/mapUtils";
import NavInstructionBanner from "@/components/maps/NavInstructionBanner";
import BusIcon from "@/components/shared/BusIcon";

export interface DriverMapProps {
  route: RouteData;
  targetStop: RouteStop;
  driverLocation: { lat: number; lng: number; heading: number } | null;
  socketRef: React.RefObject<ReturnType<typeof import("socket.io-client").io> | null>;
  busId: string;
}

const DARK_MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#746855" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
];

function DriverMapInner({ route, targetStop, driverLocation, socketRef, busId }: DriverMapProps) {
  const map = useMap();
  const [directionsEnabled, setDirectionsEnabled] = useState(true);
  const [isCentered, setIsCentered] = useState(true);

  /**
   * 1. FULL ROUTE ROAD-SNAP (The "Whole" Obviously)
   */
  const fullRouteWaypoints = useMemo(() => {
    if (!route.stops || route.stops.length < 3) return [];
    return route.stops.slice(1, -1).map(s => ({ lat: s.lat, lng: s.lng }));
  }, [route.stops]);

  const { directionsResult: fullRouteResult } = useGoogleDirections({
    origin: route.stops ? { lat: route.stops[0].lat, lng: route.stops[0].lng } : null,
    destination: route.stops ? { lat: route.stops[route.stops.length-1].lat, lng: route.stops[route.stops.length-1].lng } : null,
    waypoints: fullRouteWaypoints,
    enabled: !!route.stops && route.stops.length >= 2,
  });

  /**
   * 2. LIVE SEGMENT SNAP (Active Highlight)
   */
  const activeWaypoints = useMemo(() => {
    const targetIndex = route.stops?.findIndex(s => s.id === targetStop.id) ?? -1;
    if (targetIndex === -1) return [];
    return (route.stops || []).filter((_, idx) => idx < targetIndex).map(s => ({ lat: s.lat, lng: s.lng }));
  }, [route.stops, targetStop.id]);

  const { directionsResult: activeResult, durationValue, distanceValue, nextInstruction, distanceToNextTurn, maneuver, isLoading } = useGoogleDirections({
    origin: driverLocation || (route.stops && route.stops.length > 0 ? { lat: route.stops[0].lat, lng: route.stops[0].lng } : null),
    destination: { lat: targetStop.lat, lng: targetStop.lng },
    waypoints: activeWaypoints,
    enabled: directionsEnabled,
  });

  const fullPolyRef = useRef<google.maps.Polyline | null>(null);
  const activePolyRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!map) return;
    
    fullPolyRef.current = new google.maps.Polyline({
      map,
      strokeColor: "#3b82f6",
      strokeWeight: 4,
      strokeOpacity: 0.15,
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

  const onReroute = useCallback(() => {
    setDirectionsEnabled(false);
    setTimeout(() => setDirectionsEnabled(true), 100);
  }, []);

  const { isRerouting } = useRerouting({
    currentPosition: driverLocation,
    routePolyline: activeResult?.routes[0]?.overview_path?.map(p => ({ lat: p.lat(), lng: p.lng() })) || [],
    onReroute,
  });

  useEffect(() => {
    if (map && driverLocation && isCentered) {
      map.setCenter({ lat: driverLocation.lat, lng: driverLocation.lng });
      map.setHeading(driverLocation.heading);
    }
  }, [map, driverLocation?.lat, driverLocation?.lng, driverLocation?.heading, isCentered]);

  const handleRecenter = () => {
    if (map && driverLocation) {
      map.setCenter({ lat: driverLocation.lat, lng: driverLocation.lng });
      map.setHeading(driverLocation.heading);
      setIsCentered(true);
    }
  };

  const distRem = distanceValue || 0;
  const durRem = durationValue || 0;
  const hasArrived = distRem < 50 && distRem > 0;

  return (
    <>
      <style>{`
        @keyframes ripple {
          0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.5); }
          70% { box-shadow: 0 0 0 30px rgba(59, 130, 246, 0); }
          100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
        }
      `}</style>

      <NavInstructionBanner
        instruction={nextInstruction}
        distanceToTurn={distanceToNextTurn}
        maneuver={maneuver}
        isRerouting={isRerouting || isLoading}
      />

      <div 
        className="absolute inset-0 z-0"
        onPointerDown={() => setIsCentered(false)}
        onTouchStart={() => setIsCentered(false)}
      >
        <GoogleMap
          defaultCenter={driverLocation || (route.stops ? { lat: route.stops[0].lat, lng: route.stops[0].lng } : undefined)}
          zoom={hasArrived ? 15 : 18}
          tilt={60}
          disableDefaultUI={true}
          mapId={"b1b1b1b1b1b1b1b1"}
          styles={DARK_MAP_STYLE}
          gestureHandling="greedy"
        >
        {driverLocation && (
          <AdvancedMarker position={driverLocation}>
            <BusIcon heading={driverLocation.heading} status="active" size={48} />
          </AdvancedMarker>
        )}

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
      </GoogleMap>
      </div>

      <div className="absolute right-6 top-32 z-40">
        <button
          onClick={handleRecenter}
          className={`p-4 rounded-full shadow-2xl transition-all duration-300 ${isCentered
              ? "bg-blue-500 text-white scale-90 opacity-40 hover:opacity-100"
              : "bg-white text-slate-900 scale-100 hover:bg-slate-100"
            } border border-white/20 backdrop-blur-md active:scale-95`}
        >
          {isCentered ? <GPS /> : <Target />}
        </button>
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-sm px-6 z-40">
        {hasArrived ? (
          <div className="bg-emerald-500 border border-emerald-400 rounded-[1.5rem] px-8 py-5 shadow-3xl flex items-center justify-center gap-3">
            <span className="text-brand-dark font-black text-xs uppercase tracking-widest leading-none">
              Arrived at {targetStop.name}
            </span>
          </div>
        ) : (
          <div className="bg-brand-surface/90 backdrop-blur-2xl border border-white/5 shadow-3xl rounded-[2rem] p-6 flex justify-between items-center w-full">
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
