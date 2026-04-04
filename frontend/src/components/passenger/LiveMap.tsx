"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { APIProvider, Map as GoogleMap, AdvancedMarker, useMap } from "@vis.gl/react-google-maps";
import { DirectionsRoute } from "@/components/DirectionsRoute";
import { useRoutes } from "@/hooks/useRoutes";
import BusIcon from "@/components/shared/BusIcon";
import DirectionsPanel from "@/components/shared/DirectionsPanel";
import { Bus, Wifi, WifiOff, Map as MapIcon, Loader2 } from "lucide-react";

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

  const destination = useMemo(() => {
    return selectedPin ? { lat: selectedPin.lat, lng: selectedPin.lng } : null;
  }, [selectedPin]);

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

  const [predefinedRoute, setPredefinedRoute] = useState<google.maps.LatLngLiteral[]>([]);
  const [activeRoutePolyline, setActiveRoutePolyline] = useState<string>("");
  const [activeRouteId, setActiveRouteId] = useState<string | null>(null);

  useEffect(() => {
    const activeBus = Array.from(buses.values()).find(b => b.routeId);
    const newRouteId = activeBus?.routeId || "";
    
    if (newRouteId !== activeRouteId && newRouteId) {
      setActiveRouteId(newRouteId);
      const route = routes.find(r => r.id === newRouteId);
      if (route) {
        const coords = route.waypoints.map(w => ({ lat: w.lat, lng: w.lng }));
        setPredefinedRoute(coords);
        setActiveRoutePolyline(route.polyline || "");
      }
    } else if (!newRouteId && predefinedRoute.length > 0) {
      setPredefinedRoute([]);
      setActiveRoutePolyline("");
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

        {predefinedRoute.length > 0 && (
          <DirectionsRoute waypoints={predefinedRoute} encodedPolyline={activeRoutePolyline} />
        )}

        {Array.from(buses.values()).map(bus => (
          <AdvancedMarker key={bus.busId} position={{ lat: bus.lat, lng: bus.lng }}>
             <BusIcon heading={bus.heading} status={bus.status} size={48} />
          </AdvancedMarker>
        ))}

        {selectedPin && (
          <AdvancedMarker position={selectedPin}>
             <div className="w-5 h-5 rounded-full bg-white border-4 border-brand-dark shadow-2xl scale-125" />
          </AdvancedMarker>
        )}
      </GoogleMap>

      <DirectionsPanel 
        result={null} 
        isOpen={isPanelOpen} 
        onToggle={() => setIsPanelOpen(!isPanelOpen)} 
      />

      {/* Connection Status Overlay - Refined Block */}
      <div className="absolute bottom-6 right-6 z-[1000] flex items-center gap-2.5 bg-brand-dark/80 backdrop-blur-xl border border-white/5 rounded-2xl px-4 py-2.5 shadow-3xl overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-white/5 opacity-20 pointer-events-none" />
        {connected ? (
          <>
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Live Infrastructure</span>
          </>
        ) : (
          <>
            <Loader2 className="w-3 h-3 text-red-500 animate-spin" />
            <span className="text-[10px] font-black uppercase tracking-widest text-red-500">Reconnecting...</span>
          </>
        )}
      </div>

      {buses.size > 0 && (
        <div className="absolute top-24 right-6 z-[1000] bg-brand-surface/90 backdrop-blur-xl border border-white/5 rounded-2xl px-5 py-3 shadow-3xl flex items-center gap-3">
          <Bus className="w-4 h-4 text-white/40" />
          <span className="text-[10px] font-black uppercase tracking-widest text-white/80">
            {buses.size} Active Node{buses.size !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* Active Route Identifier */}
      {activeRouteId && (
        <div className="absolute bottom-6 left-6 z-[1000] bg-brand-surface/90 backdrop-blur-xl border border-white/5 rounded-2xl px-5 py-3 shadow-3xl flex items-center gap-3">
          <MapIcon className="w-4 h-4 text-white/20" />
          <span className="text-[10px] font-black uppercase tracking-widest text-white/80">
            Path: <span className="text-white ml-1">{routes.find(r => r.id === activeRouteId)?.name || "External"}</span>
          </span>
        </div>
      )}
    </div>
  );
}

export default dynamic(() => Promise.resolve(LiveMapInner), { ssr: false });
