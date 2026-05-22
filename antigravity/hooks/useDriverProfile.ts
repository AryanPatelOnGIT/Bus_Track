'use client';

import { useState, useEffect } from 'react';
import { UserData, Vehicle, RouteData } from '@/lib/db';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const useDriverProfile = (userData: UserData | null) => {
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfileData = async () => {
      setLoading(true);
      if (userData?.vehicleId) {
        try {
          const vehicleDoc = await getDoc(doc(db, 'vehicles', userData.vehicleId));
          if (vehicleDoc.exists()) {
            setVehicle({ id: vehicleDoc.id, ...vehicleDoc.data() } as Vehicle);
          }
        } catch (error) {
          console.error('Error fetching vehicle', error);
        }
      } else {
        setVehicle(null);
      }

      if (userData?.assignedRouteIds && userData.assignedRouteIds.length > 0) {
        try {
          const routePromises = userData.assignedRouteIds.map(async (routeId) => {
            const routeDoc = await getDoc(doc(db, 'routes', routeId));
            if (routeDoc.exists()) {
              return { id: routeDoc.id, ...routeDoc.data() } as RouteData;
            }
            return null;
          });
          const fetchedRoutes = await Promise.all(routePromises);
          setRoutes(fetchedRoutes.filter((r): r is RouteData => r !== null));
        } catch (error) {
          console.error('Error fetching routes', error);
        }
      } else {
        setRoutes([]);
      }
      setLoading(false);
    };

    if (userData) {
      fetchProfileData();
    } else {
      setVehicle(null);
      setRoutes([]);
      setLoading(false);
    }
  }, [userData]);

  return { vehicle, routes, loading };
};
