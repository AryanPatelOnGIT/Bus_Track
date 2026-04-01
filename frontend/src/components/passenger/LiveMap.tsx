"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { APIProvider, Map as GoogleMap, AdvancedMarker, useMap } from "@vis.gl/react-google-maps";
import { PREDEFINED_ROUTES } from "@/lib/predefinedRoutes";
import { MapPolyline } from "@/components/MapPolyline";
import { useThrottledDirections } from "@/hooks/useThrottledDirections";

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

// ── SVG Bus Icon Factory ─────────────────────────────────────────────────────
function BusIcon({ heading, status }: { heading: number; status: string }) {
  const color = status === "active" ? "#22c55e" : status === "idle" ? "#f59e0b" : "#ef4444";
  return (
    <div style={{ transform: `rotate(${heading}deg)` }}>
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
        <rect x="8" y="6" width="16" height="20" rx="3" fill={color} opacity="0.9"/>
        <rect x="10" y="8" width="12" height="8" rx="1" fill="white" opacity="0.3"/>
        <circle cx="11" cy="27" r="2.5" fill="#0a1628"/>
        <circle cx="21" cy="27" r="2.5" fill="#0a1628"/>
        <rect x="14" y="4" width="4" height="3" rx="1" fill={color}/>
      </svg>
    </div>
  );
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
  const [buses, setBuses] = useState<Map<string, BusLocation>>(new Map());
  const socketRef = useRef<ReturnType<typeof import("socket.io-client").io> | null>(null);
  const [connected, setConnected] = useState(false);

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
    const firstBusWithRoute = Array.from(buses.values()).find(b => b.routeId);
    const newRouteId = firstBusWithRoute?.routeId || PREDEFINED_ROUTES[0].id;
    
    if (newRouteId !== activeRouteId) {
      setActiveRouteId(newRouteId);
      const route = PREDEFINED_ROUTES.find(r => r.id === newRouteId);
      if (route) {
        // Map points directly
        const coords: google.maps.LatLngLiteral[] = route.waypoints.map(w => ({ lat: w[0], lng: w[1] }));
        setPredefinedRoute(coords);
      }
    }
  }, [buses, activeRouteId]);

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

        {/* Predefined Route Line */}
        {predefinedRoute.length > 0 && (
          <>
            <MapPolyline
              path={predefinedRoute}
              strokeColor="#3b82f6"
              strokeWeight={6}
              strokeOpacity={0.8}
            />
            <AdvancedMarker position={predefinedRoute[0]}>
               <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#22c55e", border: "3px solid white", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: "bold" }}>A</div>
            </AdvancedMarker>
            <AdvancedMarker position={predefinedRoute[predefinedRoute.length - 1]}>
               <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#ef4444", border: "3px solid white", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: "bold" }}>B</div>
            </AdvancedMarker>
          </>
        )}

        {/* Live buses */}
        {Array.from(buses.values()).map(bus => (
          <AdvancedMarker key={bus.busId} position={{ lat: bus.lat, lng: bus.lng }}>
             <BusIcon heading={bus.heading} status={bus.status} />
          </AdvancedMarker>
        ))}

        {/* Selected Pin */}
        {selectedPin && (
          <AdvancedMarker position={selectedPin}>
             <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#f5a623", border: "3px solid white", boxShadow: "0 0 0 4px rgba(245,166,35,0.3)" }}></div>
          </AdvancedMarker>
        )}
      </GoogleMap>

      {/* ETA Overview Panel */}
      {selectedPin && etaText && (
         <div style={{
            position: "absolute",
             top: 16,
             left: "50%",
             transform: "translateX(-50%)",
             zIndex: 1000,
             background: "rgba(10,22,40,0.95)",
             backdropFilter: "blur(8px)",
             border: "1px solid rgba(255,255,255,0.1)",
             borderRadius: 12,
             padding: "12px 24px",
             fontSize: 14,
             color: "white",
             boxShadow: "0 4px 12px rgba(0,0,0,0.3)"
         }}>
            <span style={{ color: "#9ca3af" }}>ETA to destination:</span> <strong style={{ color: "#22c55e", fontSize: 16 }}>{etaText}</strong>
         </div>
      )}

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
          {PREDEFINED_ROUTES.find(r => r.id === activeRouteId)?.name || "Unknown"}
        </div>
      )}
    </div>
  );
}

export default dynamic(() => Promise.resolve(LiveMapInner), { ssr: false });
