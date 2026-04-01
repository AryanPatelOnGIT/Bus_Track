"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Map as GoogleMap, AdvancedMarker } from "@vis.gl/react-google-maps";
import { MapPolyline } from "@/components/MapPolyline";
import { PREDEFINED_ROUTES } from "@/lib/predefinedRoutes";

interface BusLocation {
  busId: string;
  driverId: string;
  lat: number;
  lng: number;
  heading: number;
  speed: number;
  timestamp: number;
  status: "active" | "idle" | "maintenance";
  routeId?: string;
}

function BusIcon({ heading, status }: { heading: number; status: string }) {
  const color = status === "active" ? "#22c55e" : status === "idle" ? "#f59e0b" : "#ef4444";
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
      <circle cx="14" cy="14" r="14" fill={color} opacity="0.15" />
      <g transform={`rotate(${heading}, 14, 14)`}>
        <path d="M14 4 L22 22 L14 18 L6 22 Z" fill={color} stroke="white" strokeWidth="1.5"/>
      </g>
    </svg>
  );
}

function FleetMapOverviewInner() {
  const [buses, setBuses] = useState<Map<string, BusLocation>>(new Map());

  useEffect(() => {
    let socket: ReturnType<typeof import("socket.io-client").io> | null = null;
    import("socket.io-client").then(({ io }) => {
      socket = io(process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000", {
        transports: ["websocket"],
      });

      socket.emit("admin:join");
      socket.on("bus:location-update", (data: BusLocation) => {
        setBuses((prev) => new Map(prev).set(data.busId, data));
      });
      socket.on("bus:stop-tracking", ({ busId }) => {
        setBuses((prev) => {
          const next = new Map(prev);
          next.delete(busId);
          return next;
        });
      });
    });

    return () => { socket?.disconnect(); };
  }, []);

  const [predefinedRoute, setPredefinedRoute] = useState<google.maps.LatLngLiteral[]>([]);
  const [activeRouteId, setActiveRouteId] = useState<string | null>(null);

  useEffect(() => {
    // Sync with the first active bus's route selection
    const firstBusWithRoute = Array.from(buses.values()).find(b => b.routeId);
    const newRouteId = firstBusWithRoute?.routeId || PREDEFINED_ROUTES[0].id;

    if (newRouteId !== activeRouteId) {
      setActiveRouteId(newRouteId);
      const route = PREDEFINED_ROUTES.find(r => r.id === newRouteId);
      if (route) {
         setPredefinedRoute(route.waypoints.map(w => ({ lat: w[0], lng: w[1] })));
      }
    }
  }, [buses, activeRouteId]);

  return (
    <GoogleMap
      defaultCenter={{ lat: 23.0347, lng: 72.5483 }}
      defaultZoom={14}
      disableDefaultUI={true}
      mapId="d1d1d1d1d1d1d1"
    >
      {predefinedRoute.length > 0 && (
        <MapPolyline 
          path={predefinedRoute} 
          strokeColor="#3b82f6" 
          strokeWeight={6} 
          strokeOpacity={0.8}
        />
      )}
      
      {Array.from(buses.values()).map((bus) => (
        <AdvancedMarker key={bus.busId} position={{ lat: bus.lat, lng: bus.lng }}>
           <BusIcon heading={bus.heading} status={bus.status} />
        </AdvancedMarker>
      ))}
    </GoogleMap>
  );
}

export default dynamic(() => Promise.resolve(FleetMapOverviewInner), { ssr: false });
