import { useState, useRef, useCallback, useEffect } from 'react';
import { computeRouteV2 } from '@/lib/googleMapsRoutes';

// Helper to calculate Haversine distance in meters
function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * rad) * Math.cos(lat2 * rad) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

const UPDATE_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes
const DISTANCE_THRESHOLD_METERS = 250; // Update if bus moves 250+ meters

export function useThrottledDirections(destination: google.maps.LatLngLiteral | null) {
  const [cachedRoute, setCachedRoute] = useState<any>(null);
  const [etaText, setEtaText] = useState<string>('');
  
  const lastFetchTime = useRef<number>(0);
  const lastFetchLocation = useRef<google.maps.LatLngLiteral | null>(null);

  const updateRoute = useCallback((currentLocation: google.maps.LatLngLiteral) => {
    if (!destination) return;

    const now = Date.now();
    const timeElapsed = now - lastFetchTime.current;
    
    let distanceMoved = 0;
    if (lastFetchLocation.current) {
      distanceMoved = getDistanceInMeters(
        lastFetchLocation.current.lat, lastFetchLocation.current.lng,
        currentLocation.lat, currentLocation.lng
      );
    }

    // Only fetch if initial fetch, time threshold met, or distance threshold met
    if (!lastFetchLocation.current || timeElapsed >= UPDATE_INTERVAL_MS || distanceMoved >= DISTANCE_THRESHOLD_METERS) {
      
      const fetchRoute = async () => {
        try {
          const result = await computeRouteV2({
             origin: currentLocation,
             destination: destination
          });

          setCachedRoute(result);
          
          if (result.routes && result.routes[0]) {
            const route = result.routes[0];
            const durationSeconds = parseInt(route.duration || "0");
            setEtaText(durationSeconds > 0 ? `${Math.round(durationSeconds / 60)} mins` : "N/A");
          }
          
          lastFetchTime.current = Date.now();
          lastFetchLocation.current = currentLocation;
        } catch (err) {
          console.error("Throttled Routes V2 failed:", err);
        }
      };

      fetchRoute();
    }
  }, [destination]);

  return { cachedRoute, etaText, updateRoute };
}
