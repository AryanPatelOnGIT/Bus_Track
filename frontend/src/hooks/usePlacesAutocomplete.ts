import { useState, useRef, useCallback } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';

export function usePlacesAutocomplete() {
  const placesLib = useMapsLibrary('places');
  const [sessionToken, setSessionToken] = useState<google.maps.places.AutocompleteSessionToken | null>(null);
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);

  // Initialize service and token
  const initService = useCallback(() => {
    if (!placesLib) return;
    if (!autocompleteService.current) {
      autocompleteService.current = new placesLib.AutocompleteService();
    }
    if (!sessionToken) {
      setSessionToken(new placesLib.AutocompleteSessionToken());
    }
  }, [placesLib, sessionToken]);

  const fetchPredictions = useCallback((input: string) => {
    initService();
    if (!autocompleteService.current || !input || !sessionToken) {
      setPredictions([]);
      return;
    }

    autocompleteService.current.getPlacePredictions(
      { input, sessionToken: sessionToken },
      (results, status) => {
        if (status === placesLib?.PlacesServiceStatus.OK && results) {
          setPredictions(results);
        } else {
          setPredictions([]);
        }
      }
    );
  }, [initService, sessionToken, placesLib]);

  const onPlaceSelected = useCallback((placeId: string) => {
    // When a place is selected and details are fetched, clear the token to start a new session next time
    setSessionToken(null);
  }, []);

  return { predictions, fetchPredictions, onPlaceSelected };
}
