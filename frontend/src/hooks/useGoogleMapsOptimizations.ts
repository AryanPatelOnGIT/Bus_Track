import { useState, useEffect, useRef, useCallback } from 'react';

// ============================================================================
// 1. AUTOCOMPLETE WITH SESSION TOKENS
// ============================================================================
// Purpose: Groups keystrokes into a single session. 
// You only pay for 1 Place Details request per session instead of per-character.
export const useAutocompleteWithSession = (inputRef: React.RefObject<HTMLInputElement>) => {
  const [sessionToken, setSessionToken] = useState<any>(null);
  const autocompleteRef = useRef<any>(null);
  const [selectedPlace, setSelectedPlace] = useState<any>(null);

  useEffect(() => {
    if (!inputRef.current || !window.google) return;

    // 1. Initialize a new session token
    const token = new window.google.maps.places.AutocompleteSessionToken();
    setSessionToken(token);

    autocompleteRef.current = new window.google.maps.places.Autocomplete(inputRef.current, {
      // COST SAVING: Select strictly the fields you need. Default is 'ALL'.
      fields: ['geometry', 'name', 'place_id'], 
    });

    // 2. Attach the session token to the widget
    autocompleteRef.current.setOptions({ sessionToken: token });

    const listener = autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current.getPlace();
      setSelectedPlace(place);
      
      // 3. Once a user selects a place, the session terminates.
      // Generate a new token immediately in case they search again.
      const newToken = new window.google.maps.places.AutocompleteSessionToken();
      setSessionToken(newToken);
      autocompleteRef.current.setOptions({ sessionToken: newToken });
      
      console.log('Place successfully retrieved without per-keystroke billing:', place.name);
    });

    return () => {
      if (window.google) {
         window.google.maps.event.removeListener(listener);
      }
    };
  }, [inputRef]);

  return { autocomplete: autocompleteRef.current, selectedPlace };
};

// ============================================================================
// 2. THROTTLED ETA & ROUTE GEOMETRY CACHING
// ============================================================================
export const useThrottledDirections = (driverLocation: {lat: number, lng: number} | null, destination: {lat: number, lng: number} | null) => {
  // We use React state to "cache" the DirectionsResult.
  // Because it's held in state, unmounting/remounting child components 
  // won't force a network request as long as this hook's parent persists.
  const [cachedDirections, setCachedDirections] = useState<any>(null);
  const [etaInfo, setEtaInfo] = useState<{ duration_in_traffic?: string; distance?: string } | null>(null);
  
  const lastUpdateRef = useRef({ time: 0, location: null as any });
  const directionsService = useRef<any>(null);

  useEffect(() => {
    if (!window.google) return;
    directionsService.current = new window.google.maps.DirectionsService();
  }, []);

  const fetchDirections = useCallback(async () => {
    if (!driverLocation || !destination || !directionsService.current) return;

    const request = {
      origin: driverLocation,
      destination: destination,
      travelMode: window.google.maps.TravelMode.DRIVING,
      // ACCURATE ETA: Requires drivingOptions and an explicit departure time
      drivingOptions: {
        departureTime: new Date(), // Forces evaluation of live traffic
        trafficModel: 'bestguess'
      }
    };

    try {
      const response = await directionsService.current.route(request);
      
      // Cache geometry locally in React State
      setCachedDirections(response);

      // Extract accurate duration
      const leg = response.routes[0].legs[0];
      setEtaInfo({
        duration_in_traffic: leg.duration_in_traffic?.text,
        distance: leg.distance?.text,
      });

      // Update the reference point for our throttler
      lastUpdateRef.current = { time: Date.now(), location: driverLocation };

    } catch (error) {
      console.error("Directions request failed:", error);
    }
  }, [driverLocation, destination]);

  useEffect(() => {
    if (!driverLocation || !window.google) return;

    const now = Date.now();
    const lastUpdate = lastUpdateRef.current;
    
    // THROTTLING CONFIGURATION
    const TIME_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes
    const DISTANCE_THRESHOLD_METERS = 300;   // 300 meters

    let distanceMoved = 0;
    if (lastUpdate.location) {
      // Measure spherical distance between last payload and current payload
      distanceMoved = window.google.maps.geometry.spherical.computeDistanceBetween(
        new window.google.maps.LatLng(lastUpdate.location),
        new window.google.maps.LatLng(driverLocation)
      );
    }

    const isFirstLoad = !lastUpdate.location;
    const isSignificantDistance = distanceMoved > DISTANCE_THRESHOLD_METERS;
    const isStaleTime = (now - lastUpdate.time) > TIME_THRESHOLD_MS;

    // We only execute `fetchDirections` if one of our throttled thresholds is broken
    if (isFirstLoad || isSignificantDistance || isStaleTime) {
      fetchDirections();
    }

  }, [driverLocation, fetchDirections]);

  return { cachedDirections, etaInfo };
};
