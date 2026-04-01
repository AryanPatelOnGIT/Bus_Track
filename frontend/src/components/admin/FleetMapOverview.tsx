"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Map as GoogleMap, AdvancedMarker, useMap } from "@vis.gl/react-google-maps";
import { DirectionsRoute } from "@/components/DirectionsRoute";
import { useRoutes } from "@/hooks/useRoutes";
import BusIcon from "@/components/shared/BusIcon";
import DirectionsPanel from "@/components/shared/DirectionsPanel";

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

function FleetMapOverviewInner() {
  const { routes } = useRoutes();
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
  const [selectedBusId, setSelectedBusId] = useState<string | null>(null);
  const [routeResult, setRouteResult] = useState<any>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  useEffect(() => {
    // Sync only when a bus is selected or if we are explicitly tracking
    const targetBus = selectedBusId ? buses.get(selectedBusId) : null;
    const newRouteId = targetBus?.routeId || "";

    if (newRouteId !== activeRouteId && newRouteId) {
      setActiveRouteId(newRouteId);
      const route = routes.find(r => r.id === newRouteId);
      if (route) {
         setPredefinedRoute(route.waypoints.map(w => ({ lat: w.lat, lng: w.lng })));
      }
    } else if (!newRouteId && predefinedRoute.length > 0) {
      setPredefinedRoute([]);
      setActiveRouteId(null);
    }
  }, [buses, selectedBusId, activeRouteId, routes, predefinedRoute.length]);

  return (
    <div className="relative w-full h-full">
      <GoogleMap
        defaultCenter={{ lat: 23.0347, lng: 72.5483 }}
        defaultZoom={14}
        disableDefaultUI={true}
        mapId="d1d1d1d1d1d1d1"
        onClick={() => setSelectedBusId(null)}
      >
        <TrafficLayer />
        
        {/* Dynamic Route Line */}
        {predefinedRoute.length > 0 && (
           <DirectionsRoute 
             waypoints={predefinedRoute} 
             onRouteResultV2={(res) => setRouteResult(res)}
           />
        )}

        {Array.from(buses.values()).map((bus) => (
          <AdvancedMarker 
            key={bus.busId} 
            position={{ lat: bus.lat, lng: bus.lng }}
            onClick={(e) => {
              setSelectedBusId(bus.busId);
              setIsPanelOpen(true);
            }}
          >
             <div className={`transition-transform duration-300 ${selectedBusId === bus.busId ? 'scale-125' : ''}`}>
               <BusIcon heading={bus.heading} status={bus.status} size={selectedBusId === bus.busId ? 48 : 40} />
               {selectedBusId === bus.busId && (
                 <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg whitespace-nowrap">
                   Selected: {bus.busId}
                 </div>
               )}
             </div>
          </AdvancedMarker>
        ))}
      </GoogleMap>

      {/* Admin Side Directions View */}
      {selectedBusId && routeResult && (
        <DirectionsPanel 
          result={routeResult} 
          isOpen={isPanelOpen} 
          onToggle={() => setIsPanelOpen(!isPanelOpen)} 
        />
      )}
    </div>
  );
}

export default dynamic(() => Promise.resolve(FleetMapOverviewInner), { ssr: false });
