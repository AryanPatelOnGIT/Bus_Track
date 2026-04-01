"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { LocateFixed as GPS, Target } from "lucide-react";
import {
  Map as GoogleMap,
  AdvancedMarker,
  useMap,
  APIProvider,
} from "@vis.gl/react-google-maps";
import { BRTSRoute, BRTSStop } from "@/config/brtsRoutes";
import { useRerouting } from "@/hooks/useRerouting";
import { useGoogleDirections } from "@/hooks/useGoogleDirections";
import { formatDistance, formatETA } from "@/lib/mapUtils";
import NavInstructionBanner from "@/components/maps/NavInstructionBanner";

export interface DriverMapProps {
  route: BRTSRoute;
  targetStop: BRTSStop;
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
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#263c3f" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#38414e" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#212a37" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#9ca5b3" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#746855" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1f2835" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#f3d19c" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#2f3948" }] },
  { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: "#d59563" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#17263c" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#515c6d" }] },
  { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#17263c" }] },
];

function DriverMapInner({ route, targetStop, driverLocation, socketRef, busId }: DriverMapProps) {
  const map = useMap();
  const [directionsEnabled, setDirectionsEnabled] = useState(true);
  const [isCentered, setIsCentered] = useState(true); // Toggle for auto-centering

  // Polyline extraction using REAL origin
  const { directionsResult, nextInstruction, distanceToNextTurn, maneuver, isLoading } = useGoogleDirections({
    origin: driverLocation || route.waypoints[0],
    destination: { lat: targetStop.lat, lng: targetStop.lng },
    enabled: directionsEnabled,
  });

  const fullPath = useMemo(() => {
    return directionsResult?.routes[0]?.overview_path?.map(p => ({ lat: p.lat(), lng: p.lng() })) || [];
  }, [directionsResult]);

  // Rerouting fallback strictly evaluating distances manually using mathematical node edge mapping
  const onReroute = useCallback(() => {
    // Re-trigger google directions using currentPosition securely!
    setDirectionsEnabled(false);
    setTimeout(() => setDirectionsEnabled(true), 100);
  }, []);

  const { isRerouting } = useRerouting({
    currentPosition: driverLocation,
    routePolyline: fullPath,
    onReroute,
  });

  // Initial Center: Snap once when driverLocation is first found
  const hasInitializedCenter = useRef(false);
  useEffect(() => {
    if (map && driverLocation && !hasInitializedCenter.current) {
      map.setCenter({ lat: driverLocation.lat, lng: driverLocation.lng });
      map.setHeading(driverLocation.heading);
      hasInitializedCenter.current = true;
    }
  }, [map, !!driverLocation]);

  // Reactive Re-centering: Only if isCentered is true
  useEffect(() => {
    if (!map || !driverLocation || !isCentered) return;
    
    map.setCenter({ lat: driverLocation.lat, lng: driverLocation.lng });
    map.setHeading(driverLocation.heading);
  }, [map, driverLocation?.lat, driverLocation?.lng, driverLocation?.heading, isCentered]);

  const handleRecenter = () => {
    if (map && driverLocation) {
      map.setCenter({ lat: driverLocation.lat, lng: driverLocation.lng });
      map.setHeading(driverLocation.heading);
      setIsCentered(true);
    }
  };

  // Use a fallback or derived values for stats
  const distRem = directionsResult?.routes[0]?.legs[0]?.distance?.value || 0;
  const durRem = directionsResult?.routes[0]?.legs[0]?.duration?.value || 0;
  const hasArrived = distRem < 50 && distRem > 0; // Arrived if within 50m

  // Derive polylines natively splitting based on step progression
  // For now we show the whole path since real-time step splitting requires more complex logic
  const completedPath: { lat: number, lng: number }[] = [];
  const remainingPath = fullPath;

  // Bind Maps components via hooks dynamically (rendering layers effectively)
  useEffect(() => {
    if (!map || fullPath.length === 0) return;

    const mutedPoly = new google.maps.Polyline({
      map,
      path: completedPath,
      strokeColor: "#9AA0A6",
      strokeWeight: 4,
      strokeOpacity: 0.8,
      zIndex: 40,
    });

    const activePoly = new google.maps.Polyline({
      map,
      path: remainingPath,
      strokeColor: "#4285F4",
      strokeWeight: 6,
      strokeOpacity: 1.0,
      zIndex: 50,
    });

    return () => {
      mutedPoly.setMap(null);
      activePoly.setMap(null);
    };
  }, [map, fullPath]);

  const mapId = process.env.NEXT_PUBLIC_DARK_MAP_ID || "b1b1b1b1b1b1b1b1";

  // Calculate speed km/h purely from fixed SIMULATION_SPEED_MS distance steps 
  // ~25km/h flat rate fallback if not strictly tracked over timing
  const currentSpeed = 25;

  return (
    <>
      <style>{`
        @keyframes ripple {
          0% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.5); }
          70% { box-shadow: 0 0 0 30px rgba(59, 130, 246, 0); }
          100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0); }
        }
      `}</style>

      {/* Embedded strictly defined Instruction Banner Layout */}
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
        onWheel={() => setIsCentered(false)}
      >
        <GoogleMap
          defaultCenter={route.waypoints[0]}
          zoom={hasArrived ? 15 : 18}
          tilt={60}
          disableDefaultUI={true}
          mapId={mapId}
          styles={!process.env.NEXT_PUBLIC_DARK_MAP_ID ? DARK_MAP_STYLE : undefined}
          gestureHandling="greedy"
        >
        {/* Dynamic Bus Marker */}
        {driverLocation && (
          <AdvancedMarker position={driverLocation}>
            <div
              style={{
                transform: `rotate(${driverLocation.heading}deg)`,
                transition: "transform 0.3s ease",
              }}
            >
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                <rect x="6" y="2" width="12" height="20" rx="3" fill="#1A73E8" stroke="#ffffff" strokeWidth="1.5" />
                <rect x="8" y="4" width="8" height="4" rx="1" fill="#ffffff" />
                <rect x="8" y="10" width="8" height="8" rx="1" fill="#ffffff" />
              </svg>
            </div>
          </AdvancedMarker>
        )}

        {/* Pulsing Target Point A */}
        <AdvancedMarker position={targetStop}>
          <div className="relative flex flex-col items-center">
            <div
              className="absolute w-5 h-5 bg-blue-500 rounded-full"
              style={{ animation: "ripple 2s infinite" }}
            />
            <div className="w-5 h-5 bg-blue-600 border-2 border-white rounded-full z-10" />
            <span className="mt-2 px-3 py-1 bg-slate-900 border border-white/20 text-white rounded text-xs whitespace-nowrap z-20 font-bold shadow-2xl">
              {targetStop.name}
            </span>
          </div>
        </AdvancedMarker>
      </GoogleMap>
      </div>

      {/* Manual Re-center Button */}
      <div className="absolute right-6 top-32 z-40">
        <button
          onClick={handleRecenter}
          className={`p-4 rounded-full shadow-2xl transition-all duration-300 ${isCentered
              ? "bg-blue-500 text-white scale-90 opacity-40 hover:opacity-100"
              : "bg-white text-slate-900 scale-100 hover:bg-slate-100"
            } border border-white/20 backdrop-blur-md active:scale-95`}
          title="Re-center onto Bus"
        >
          {isCentered ? <GPS /> : <Target />}
        </button>
      </div>

      {/* Driver Bottom Tracking Navigation HUD */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-sm px-4 z-40">
        {hasArrived ? (
          <div className="backdrop-blur-xl bg-green-500 shadow-2xl rounded-2xl p-4 flex justify-between items-center w-full">
            <span className="text-white font-bold text-lg w-full text-center tracking-wide">
              ✅ Arrived at {targetStop.name}
            </span>
          </div>
        ) : (
          <div className="backdrop-blur-xl bg-slate-900/90 border border-white/20 shadow-2xl rounded-2xl p-4 flex justify-between items-center w-full">
            <div className="flex flex-col text-center w-1/3">
              <span className="text-white text-lg font-black">{formatDistance(distRem)}</span>
            </div>
            <div className="w-px h-8 bg-white/20" />
            <div className="flex flex-col text-center w-1/3">
              <span className="text-white text-xl font-black">{formatETA(durRem / 60)}</span>
            </div>
            <div className="w-px h-8 bg-white/20" />
            <div className="flex flex-col text-center w-1/3 text-white/90">
              <span className="text-lg font-black">-- <span className="text-xs">km/h</span></span>
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
