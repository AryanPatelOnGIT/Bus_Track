'use client';

import { useState, useEffect } from 'react';
import { BusLocation, subscribeToBusLocation, subscribeToAllBuses } from '@/lib/rtdb';

export const useBusLocation = (vehicleId: string | null) => {
  const [location, setLocation] = useState<BusLocation | null>(null);

  useEffect(() => {
    if (!vehicleId) return;
    const unsubscribe = subscribeToBusLocation(vehicleId, (loc) => {
      setLocation(loc);
    });
    return () => unsubscribe();
  }, [vehicleId]);

  return location;
};

export const useAllBusLocations = () => {
  const [locations, setLocations] = useState<Record<string, { location: BusLocation }>>({});

  useEffect(() => {
    const unsubscribe = subscribeToAllBuses((locs) => {
      setLocations(locs);
    });
    return () => unsubscribe();
  }, []);

  return locations;
};
