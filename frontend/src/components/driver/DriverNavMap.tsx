"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Map as GoogleMap, AdvancedMarker, useMap } from "@vis.gl/react-google-maps";
import { DirectionsRoute } from "@/components/DirectionsRoute";
import { useRoutes } from "@/hooks/useRoutes";
import BusIcon from "@/components/shared/BusIcon";
import DirectionsPanel from "@/components/shared/DirectionsPanel";

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

function TrafficLayer() {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const trafficLayer = new google.maps.TrafficLayer();
    trafficLayer.setMap(map);
    return () => trafficLayer.setMap(null);
  }, [map]);
  return null;
}

function DriverNavMapInner({ driverLocation, selectedRouteId }: Props) {
  const { routes } = useRoutes();
  const [assignedPath, setAssignedPath] = useState<google.maps.LatLngLiteral[]>([]);
  const [routeResult, setRouteResult] = useState<google.maps.DirectionsResult | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Fetch assigned path route
  useEffect(() => {
    if (selectedRouteId && routes.length > 0) {
      const route = routes.find((r) => r.id === selectedRouteId);
      if (route && route.waypoints.length >= 2) {
        setAssignedPath(route.waypoints.map(w => ({ lat: w.lat, lng: w.lng })));
      }
    } else {
      setAssignedPath([]);
      setRouteResult(null);
    }
  }, [selectedRouteId, routes]);

  return (
    <div className="relative h-full w-full">
      <GoogleMap
        defaultCenter={driverLocation ? { lat: driverLocation.lat, lng: driverLocation.lng } : { lat: 23.0225, lng: 72.5714 }}
        defaultZoom={16}
        disableDefaultUI={true}
        mapId="b1b1b1b1b1b1b1b1"
      >
        <TrafficLayer />
        
        {driverLocation && <Recenter location={driverLocation} />}

        {/* Driver Location */}
        {driverLocation && (
          <AdvancedMarker position={driverLocation}>
             <BusIcon heading={driverLocation.heading} status="active" size={48} />
          </AdvancedMarker>
        )}

        {/* Dynamic Route Rendering via Google Maps Directions API */}
        {assignedPath.length > 0 && (
            <DirectionsRoute 
              waypoints={assignedPath} 
              onRouteResultV2={(res) => setRouteResult(res)}
            />
        )}
      </GoogleMap>

      {/* Real-time Directions Panel */}
      <DirectionsPanel 
        result={routeResult} 
        isOpen={isPanelOpen} 
        onToggle={() => setIsPanelOpen(!isPanelOpen)} 
      />
    </div>
  );
}

export default dynamic(() => Promise.resolve(DriverNavMapInner), { ssr: false });
