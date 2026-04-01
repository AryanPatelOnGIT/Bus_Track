"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { APIProvider, Map as GoogleMap, AdvancedMarker, useMap } from "@vis.gl/react-google-maps";
import { DirectionsRoute } from "@/components/DirectionsRoute";
import { useRoutes } from "@/hooks/useRoutes";
import { MapPolyline } from "@/components/MapPolyline";
import { useThrottledDirections } from "@/hooks/useThrottledDirections";
import BusIcon from "@/components/shared/BusIcon";
import DirectionsPanel from "@/components/shared/DirectionsPanel";

export interface BusLocation {
  busId: string;
  lat: number;
  lng: number;
  heading: number;
  speed: number;
  timestamp: number;
  status: "active" | "idle" | "maintenance";
  routeId?: string;
}

interface LiveMapProps {
  onMapClick?: (lat: number, lng: number) => void;
  selectedPin?: { lat: number; lng: number } | null;
}

// ... (local BusIcon removed) ...

function TrafficLayerActivator() {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    const trafficLayer = new google.maps.TrafficLayer();
    trafficLayer.setMap(map);
    return () => trafficLayer.setMap(null);
  }, [map]);
  return null;
}

function LiveMapInner({ onMapClick, selectedPin }: LiveMapProps) {
  const { routes } = useRoutes();
  const [buses, setBuses] = useState<Map<string, BusLocation>>(new Map());
  const socketRef = useRef<ReturnType<typeof import("socket.io-client").io> | null>(null);
  const [connected, setConnected] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Throttled ETA System
  const destination = useMemo(() => {
    return selectedPin ? { lat: selectedPin.lat, lng: selectedPin.lng } : null;
  }, [selectedPin]);
  
  const { cachedRoute, etaText, updateRoute } = useThrottledDirections(destination);

  // ── Socket: join passenger room to receive bus broadcasts ────────────────
  useEffect(() => {
    import("socket.io-client").then(({ io }) => {
      const socket = io(process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000", {
        transports: ["websocket"],
      });
      socketRef.current = socket;

      socket.on("connect", () => {
        setConnected(true);
        socket.emit("passenger:join");
      });
      socket.on("disconnect", () => setConnected(false));
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
    return () => { socketRef.current?.disconnect(); };
  }, []);

  // Update ETA logic based on first active bus
  useEffect(() => {
    const activeBus = Array.from(buses.values()).find(b => b.status === "active");
    if (activeBus && destination) {
       updateRoute({ lat: activeBus.lat, lng: activeBus.lng });
    }
  }, [buses, destination, updateRoute]);

  // ── Dynamic route tracking based on active buses ──────────────────
  const [predefinedRoute, setPredefinedRoute] = useState<google.maps.LatLngLiteral[]>([]);
  const [activeRouteId, setActiveRouteId] = useState<string | null>(null);

  useEffect(() => {
    // Only show route if a bus is actively broadcasting one
    const activeBus = Array.from(buses.values()).find(b => b.routeId);
    const newRouteId = activeBus?.routeId || "";
    
    if (newRouteId !== activeRouteId && newRouteId) {
      setActiveRouteId(newRouteId);
      const route = routes.find(r => r.id === newRouteId);
      if (route) {
        const coords = route.waypoints.map(w => ({ lat: w.lat, lng: w.lng }));
        setPredefinedRoute(coords);
      }
    } else if (!newRouteId && predefinedRoute.length > 0) {
      setPredefinedRoute([]);
      setActiveRouteId(null);
    }
  }, [buses, activeRouteId, routes, predefinedRoute.length]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <GoogleMap
        defaultCenter={{ lat: 23.0347, lng: 72.5483 }}
        defaultZoom={14}
        disableDefaultUI={true}
        mapId="e39665bc7f4bd9fc" 
        onClick={(e: any) => {
           if (e.detail?.latLng) {
               onMapClick?.(e.detail.latLng.lat, e.detail.latLng.lng);
           }
        }}
      >
        <TrafficLayerActivator />

        {/* Dynamic Predefined Route Line via Google Maps Directions API */}
        {predefinedRoute.length > 0 && (
          <DirectionsRoute waypoints={predefinedRoute} />
        )}

        {/* Live buses */}
        {Array.from(buses.values()).map(bus => (
          <AdvancedMarker key={bus.busId} position={{ lat: bus.lat, lng: bus.lng }}>
             <BusIcon heading={bus.heading} status={bus.status} size={48} />
          </AdvancedMarker>
        ))}

        {/* Selected Pin */}
        {selectedPin && (
          <AdvancedMarker position={selectedPin}>
             <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#f5a623", border: "3px solid white", boxShadow: "0 0 0 4px rgba(245,166,35,0.3)" }}></div>
          </AdvancedMarker>
        )}
      </GoogleMap>

      {/* Directions & ETA Panel */}
      <DirectionsPanel 
        result={cachedRoute} 
        isOpen={isPanelOpen} 
        onToggle={() => setIsPanelOpen(!isPanelOpen)} 
      />


      {/* Overlays */}
      <div style={{ position: "absolute", bottom: 16, right: 16, zIndex: 1000, display: "flex", alignItems: "center", gap: 8, background: "rgba(10,22,40,0.85)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "6px 12px", fontSize: 12, color: "white" }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: connected ? "#22c55e" : "#ef4444" }} />
        {connected ? "Live" : "Connecting…"}
      </div>

      {buses.size > 0 && (
        <div style={{ position: "absolute", top: 16, right: 16, zIndex: 1000, background: "rgba(10,22,40,0.85)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "6px 12px", fontSize: 12, color: "white" }}>
          🚌 {buses.size} bus{buses.size !== 1 ? "es" : ""} active
        </div>
      )}

      {/* Active Route Overlay */}
      {activeRouteId && (
        <div style={{ position: "absolute", bottom: 16, left: 16, zIndex: 1000, background: "rgba(10,22,40,0.85)", backdropFilter: "blur(8px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "6px 12px", fontSize: 12, color: "white" }}>
          <span style={{ color: "#3b82f6", fontWeight: "bold", marginRight: 4 }}>Route:</span>
          {routes.find(r => r.id === activeRouteId)?.name || "Unknown"}
        </div>
      )}
    </div>
  );
}

export default dynamic(() => Promise.resolve(LiveMapInner), { ssr: false });
