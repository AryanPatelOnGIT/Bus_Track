"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Map as GoogleMap, AdvancedMarker, useMap } from "@vis.gl/react-google-maps";
import { MapPolyline } from "@/components/MapPolyline";
import { PREDEFINED_ROUTES } from "@/lib/predefinedRoutes";

interface Props {
  driverLocation: { lat: number; lng: number; heading: number } | null;
  selectedRouteId?: string;
}

function Recenter({ location }: { location: { lat: number, lng: number } }) {
  const map = useMap();
  useEffect(() => {
    if (map) {
      map.panTo(location);
    }
  }, [map, location]);
  return null;
}

function DriverNavMapInner({ driverLocation, selectedRouteId }: Props) {
  const [assignedPath, setAssignedPath] = useState<google.maps.LatLngLiteral[]>([]);

  // Fetch assigned path route
  useEffect(() => {
    if (selectedRouteId) {
      const route = PREDEFINED_ROUTES.find((r: any) => r.id === selectedRouteId);
      if (route && route.waypoints.length >= 2) {
        setAssignedPath(route.waypoints.map(w => ({ lat: w[0], lng: w[1] })));
      }
    } else {
      setAssignedPath([]);
    }
  }, [selectedRouteId]);

  return (
    <GoogleMap
      defaultCenter={driverLocation ? { lat: driverLocation.lat, lng: driverLocation.lng } : { lat: 23.0225, lng: 72.5714 }}
      defaultZoom={16}
      disableDefaultUI={true}
      mapId="b1b1b1b1b1b1b1b1"
    >
      {driverLocation && <Recenter location={driverLocation} />}

      {/* Driver Location */}
      {driverLocation && (
        <AdvancedMarker position={driverLocation}>
          <div style={{ transform: `rotate(${driverLocation.heading}deg)` }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 32 32">
                 <path d="M16 4 L26 26 L16 22 L6 26 Z" fill="#3b82f6" stroke="white" strokeWidth="2"/>
              </svg>
          </div>
        </AdvancedMarker>
      )}

      {/* Assigned path (Bus Route) */}
      {assignedPath.length > 0 && (
        <MapPolyline 
           path={assignedPath} 
           strokeColor="#3b82f6" 
           strokeWeight={8} 
           strokeOpacity={0.4}
        />
      )}
    </GoogleMap>
  );
}

export default dynamic(() => Promise.resolve(DriverNavMapInner), { ssr: false });
