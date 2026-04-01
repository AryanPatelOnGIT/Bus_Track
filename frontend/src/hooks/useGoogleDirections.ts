"use client";

import { useEffect, useState, useRef } from "react";
import { useMapsLibrary } from "@vis.gl/react-google-maps";

interface Props {
  origin: { lat: number; lng: number } | null;
  destination: { lat: number; lng: number } | null;
  waypoints?: { lat: number; lng: number }[];
  enabled: boolean;
}

export function useGoogleDirections({ origin, destination, waypoints = [], enabled }: Props) {
  const routesLib = useMapsLibrary("routes");

  const [directionsResult, setDirectionsResult] = useState<google.maps.DirectionsResult | null>(null);
  const [currentStep, setCurrentStep] = useState<google.maps.DirectionsStep | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (routesLib) {
      directionsServiceRef.current = new google.maps.DirectionsService();
    }
  }, [routesLib]);

  useEffect(() => {
    if (!enabled || !origin || !destination || !directionsServiceRef.current) return;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(async () => {
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
            optimizeWaypoints: false, // Follow the provided order (the "train")
            drivingOptions: {
              departureTime: new Date(),
              trafficModel: google.maps.TrafficModel.BEST_GUESS,
            },
          };

          directionsServiceRef.current!.route(request, (res, status) => {
            if (status === google.maps.DirectionsStatus.OK && res) {
              resolve(res);
            } else {
              reject(status);
            }
          });
        });

        setDirectionsResult(result);

        // Derive current step
        if (result.routes[0]?.legs[0]?.steps?.length > 0) {
          setCurrentStep(result.routes[0].legs[0].steps[0]);
        }
      } catch (err) {
        console.warn("Failed to fetch directions", err);
        setError("Routing failed");
      } finally {
        setIsLoading(false);
      }
    }, 800);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [
    enabled,
    origin?.lat,
    origin?.lng,
    destination?.lat,
    destination?.lng,
    JSON.stringify(waypoints), // Important: Depend on waypoint contents
  ]);

  // Total duration and distance across all legs (stops)
  const legs = directionsResult?.routes[0]?.legs || [];
  const durationValue = legs.reduce((acc, leg) => acc + (leg.duration_in_traffic?.value ?? leg.duration?.value ?? 0), 0);
  const distanceValue = legs.reduce((acc, leg) => acc + (leg.distance?.value ?? 0), 0);

  return {
    directionsResult,
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
