"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";

interface Props {
  origin: { lat: number; lng: number } | null;
  destination: { lat: number; lng: number } | null;
  waypoints?: { lat: number; lng: number }[];
  enabled: boolean;
  /** Debounce delay in ms before firing an API request. Default: 1500ms. */
  debounceMs?: number;
  /** Request alternative routes from the API. Default: false. */
  provideRouteAlternatives?: boolean;
}

export interface RouteSummary {
  index: number;
  summary: string;       // e.g. "via University Rd"
  duration: number;       // seconds
  distance: number;       // meters
  durationText: string;   // e.g. "12 min"
  distanceText: string;   // e.g. "4.2 km"
}

/** Stable waypoint hash that doesn't create a new string every render. */
function waypointHash(wps: { lat: number; lng: number }[]): string {
  return wps.map(w => `${w.lat.toFixed(5)},${w.lng.toFixed(5)}`).join("|");
}

// ═══════════════════════════════════════════════════════════════════
//  GLOBAL IN-MEMORY CACHE — survives component re-mounts
//  Prevents redundant API calls when switching tabs or re-rendering
// ═══════════════════════════════════════════════════════════════════

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes (was 5 min)

interface CachedResult {
  result: google.maps.DirectionsResult;
  timestamp: number;
}

const directionsCache = new Map<string, CachedResult>();

function getCached(key: string): google.maps.DirectionsResult | null {
  const entry = directionsCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    directionsCache.delete(key);
    return null;
  }
  return entry.result;
}

function setCache(key: string, result: google.maps.DirectionsResult): void {
  directionsCache.set(key, { result, timestamp: Date.now() });
  // Evict oldest entries if cache grows too large
  if (directionsCache.size > 50) {
    const firstKey = directionsCache.keys().next().value;
    if (firstKey) directionsCache.delete(firstKey);
  }
}

export function useGoogleDirections({
  origin,
  destination,
  waypoints = [],
  enabled,
  debounceMs = 5000,  // Increased default: fewer API calls
  provideRouteAlternatives = false,
}: Props) {
  const routesLib = useMapsLibrary("routes");

  const [directionsResult, setDirectionsResult] = useState<google.maps.DirectionsResult | null>(null);
  const [selectedRouteIndex, setSelectedRouteIndex] = useState(0);
  const [currentStep, setCurrentStep] = useState<google.maps.DirectionsStep | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastKeyRef = useRef<string>("");

  useEffect(() => {
    if (routesLib) {
      directionsServiceRef.current = new google.maps.DirectionsService();
    }
  }, [routesLib]);

  // Round origin to ~111m precision so interpolation jitter doesn't trigger re-fetches
  const originLat = origin ? Math.round(origin.lat * 1000) / 1000 : null;
  const originLng = origin ? Math.round(origin.lng * 1000) / 1000 : null;

  const waypointKey = useMemo(() => waypointHash(waypoints), [waypoints]);

  useEffect(() => {
    if (!enabled || !origin || !destination || !directionsServiceRef.current) return;

    const cacheKey = `${originLat},${originLng}|${destination.lat.toFixed(5)},${destination.lng.toFixed(5)}|${waypointKey}|alt=${provideRouteAlternatives}`;
    if (cacheKey === lastKeyRef.current) return;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(async () => {
      if (!directionsServiceRef.current) return;

      // Check global cache first — avoid API call entirely
      const cached = getCached(cacheKey);
      if (cached) {
        lastKeyRef.current = cacheKey;
        setDirectionsResult(cached);
        setSelectedRouteIndex(0);
        if (cached.routes[0]?.legs[0]?.steps?.length > 0) {
          setCurrentStep(cached.routes[0].legs[0].steps[0]);
        }
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await new Promise<google.maps.DirectionsResult>((resolve, reject) => {
          const request: google.maps.DirectionsRequest = {
            origin: new google.maps.LatLng(origin.lat, origin.lng),
            destination: new google.maps.LatLng(destination.lat, destination.lng),
            travelMode: google.maps.TravelMode.DRIVING,
            waypoints: waypoints.map(wp => ({
              location: new google.maps.LatLng(wp.lat, wp.lng),
              stopover: true,
            })),
            optimizeWaypoints: false,
            provideRouteAlternatives,
            // NOTE: drivingOptions/trafficModel intentionally omitted.
            // Adding it upgrades billing to "Advanced" tier (more expensive).
            // Server-side ETA via socket already handles live traffic ETA.
          };

          directionsServiceRef.current!.route(request, (res, status) => {
            if (status === google.maps.DirectionsStatus.OK && res) {
              resolve(res);
            } else {
              reject(status);
            }
          });
        });

        lastKeyRef.current = cacheKey;
        setCache(cacheKey, result); // Store in global cache
        setDirectionsResult(result);
        // Reset selected route when new results arrive
        setSelectedRouteIndex(0);

        if (result.routes[0]?.legs[0]?.steps?.length > 0) {
          setCurrentStep(result.routes[0].legs[0].steps[0]);
        }
      } catch (err) {
        console.warn("Failed to fetch directions", err);
        setError("Routing failed");
      } finally {
        setIsLoading(false);
      }
    }, debounceMs);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [
    enabled,
    originLat,
    originLng,
    destination?.lat,
    destination?.lng,
    waypointKey,
    debounceMs,
    provideRouteAlternatives,
  ]);

  // ── All routes array ──
  const allRoutes = directionsResult?.routes || [];

  // ── Route summaries for each alternative ──
  const routeSummaries: RouteSummary[] = useMemo(() => {
    return allRoutes.map((route, index) => {
      const legs = route.legs || [];
      const totalDuration = legs.reduce(
        (acc, leg) => acc + (leg.duration_in_traffic?.value ?? leg.duration?.value ?? 0),
        0
      );
      const totalDistance = legs.reduce(
        (acc, leg) => acc + (leg.distance?.value ?? 0),
        0
      );

      const mins = Math.ceil(totalDuration / 60);
      const durationText = mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)} hr ${mins % 60} min`;
      const distKm = totalDistance / 1000;
      const distanceText = distKm < 1 ? `${totalDistance} m` : `${distKm.toFixed(1)} km`;

      return {
        index,
        summary: route.summary || `Route ${index + 1}`,
        duration: totalDuration,
        distance: totalDistance,
        durationText,
        distanceText,
      };
    });
  }, [allRoutes]);

  // ── Selected route data ──
  const selectedRoute = allRoutes[selectedRouteIndex] || allRoutes[0];
  const legs = selectedRoute?.legs || [];
  const durationValue = legs.reduce(
    (acc, leg) => acc + (leg.duration_in_traffic?.value ?? leg.duration?.value ?? 0),
    0
  );
  const distanceValue = legs.reduce(
    (acc, leg) => acc + (leg.distance?.value ?? 0),
    0
  );

  // Update currentStep when selection changes
  useEffect(() => {
    if (selectedRoute?.legs?.[0]?.steps?.length > 0) {
      setCurrentStep(selectedRoute.legs[0].steps[0]);
    }
  }, [selectedRouteIndex, selectedRoute]);

  const selectRoute = useCallback((idx: number) => {
    if (idx >= 0 && idx < allRoutes.length) {
      setSelectedRouteIndex(idx);
    }
  }, [allRoutes.length]);

  return {
    directionsResult,
    allRoutes,
    routeSummaries,
    selectedRouteIndex,
    selectRoute,
    currentStep,
    nextInstruction: currentStep?.instructions ?? "",
    distanceToNextTurn: currentStep?.distance?.text ?? "",
    maneuver: currentStep?.maneuver ?? "",
    durationValue,
    distanceValue,
    isLoading,
    error,
  };
}
