import { useState, useRef, useCallback, useEffect } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';

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
  const routesLib = useMapsLibrary('routes');
  const [cachedRoute, setCachedRoute] = useState<google.maps.DirectionsResult | null>(null);
  const [etaText, setEtaText] = useState<string>('');
  
  const lastFetchTime = useRef<number>(0);
  const lastFetchLocation = useRef<google.maps.LatLngLiteral | null>(null);
  const directionsService = useRef<google.maps.DirectionsService | null>(null);

  useEffect(() => {
    if (routesLib && !directionsService.current) {
      directionsService.current = new routesLib.DirectionsService();
    }
  }, [routesLib]);

  const updateRoute = useCallback((currentLocation: google.maps.LatLngLiteral) => {
    if (!directionsService.current || !destination) return;

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
      
      directionsService.current.route({
        origin: currentLocation,
        destination: destination,
        travelMode: google.maps.TravelMode.DRIVING,
        drivingOptions: {
          departureTime: new Date(), // Crucial for duration_in_traffic
          trafficModel: google.maps.TrafficModel.BEST_GUESS
        }
      }, (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          setCachedRoute(result);
          
          // Get traffic ETA
          const leg = result.routes[0].legs[0];
          if (leg.duration_in_traffic) {
            setEtaText(leg.duration_in_traffic.text);
          } else if (leg.duration) {
             setEtaText(leg.duration.text);
          }
          
          lastFetchTime.current = Date.now();
          lastFetchLocation.current = currentLocation;
        }
      });
    }
  }, [destination]);

  return { cachedRoute, etaText, updateRoute };
}
