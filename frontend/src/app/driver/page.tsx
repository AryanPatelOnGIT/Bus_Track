"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import TransmitterControls from "@/components/driver/TransmitterControls";
import DriverMap from "@/components/maps/DriverMap";
import DriverProfileTab from "@/components/driver/DriverProfileTab";
import { useRoutes } from "@/hooks/useRoutes";
import { Navigation, User } from "lucide-react";
import { rtdb } from "@/lib/firebase";
import { ref, set, remove, onDisconnect } from "firebase/database";

// Mock location state — uses tiny increments instead of random jumps
let mockLat = 23.0347;
let mockLng = 72.5483;
let mockHeading = 45;

type Tab = "map" | "profile";

export default function DriverPage() {
  const { routes } = useRoutes();
  const [busId, setBusId] = useState("BRTS-101");
  const [selectedRouteId, setSelectedRouteId] = useState("");
  const [isTracking, setIsTracking] = useState(false);
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number; heading: number } | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("map");
  
  const socketRef = useRef<ReturnType<typeof import("socket.io-client").io> | null>(null);
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (routes.length > 0 && !selectedRouteId) {
      setSelectedRouteId(routes[0].id);
    }
  }, [routes, selectedRouteId]);

  const activeRoute = routes.find(r => r.id === selectedRouteId);

  useEffect(() => {
    import("socket.io-client").then(({ io }) => {
      const socket = io(process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000", {
        transports: ["websocket"],
      });
      socketRef.current = socket;
    });

    return () => {
      socketRef.current?.disconnect();
      if (intervalIdRef.current) clearInterval(intervalIdRef.current);
    };
  }, []);

  const handleStartTracking = useCallback(() => {
    if (!busId) return;
    setIsTracking(true);

    // Tell the backend socket (if available) that tracking started
    socketRef.current?.emit("driver:start-tracking", {
      busId,
      driverId: "drv_1",
      routeId: selectedRouteId
    });

    const writeToFirebase = (loc: { lat: number; lng: number; heading: number; speed: number }) => {
      // Write directly to Firebase Realtime Database
      const busRef = ref(rtdb, `activeBuses/${busId}`);
      // If the driver closes the app/loses connection, remove the bus automatically
      onDisconnect(busRef).remove().catch(() => {});
      
      set(busRef, {
        busId,
        driverId: "drv_1",
        routeId: selectedRouteId,
        lat: loc.lat,
        lng: loc.lng,
        heading: loc.heading,
        speed: loc.speed,
        status: "active",
        timestamp: Date.now(),
      }).catch(console.error);
    };

    const updateLocation = () => {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const newLoc = {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              heading: pos.coords.heading || 0,
            };
            const speed = (pos.coords.speed || 0) * 3.6;
            setDriverLocation(newLoc);
            writeToFirebase({ ...newLoc, speed });
            // Also emit via socket if backend is available
            socketRef.current?.emit("driver:location-update", {
              busId, driverId: "drv_1",
              lat: newLoc.lat, lng: newLoc.lng, heading: newLoc.heading,
              speed, timestamp: pos.timestamp, status: "active",
            });
          },
          () => {
            // Mock drift fallback
            mockLat += (Math.random() - 0.4) * 0.0003;
            mockLng += (Math.random() - 0.3) * 0.0004;
            mockHeading = (mockHeading + (Math.random() - 0.5) * 15 + 360) % 360;
            const mockLoc = { lat: mockLat, lng: mockLng, heading: Math.round(mockHeading) };
            setDriverLocation(mockLoc);
            writeToFirebase({ ...mockLoc, speed: 15 });
            socketRef.current?.emit("driver:location-update", {
              busId, driverId: "drv_1",
              lat: mockLoc.lat, lng: mockLoc.lng, heading: mockLoc.heading,
              speed: 15, timestamp: Date.now(), status: "active",
            });
          },
          { enableHighAccuracy: true, timeout: 5000 }
        );
      }
    };

    updateLocation();
    intervalIdRef.current = setInterval(updateLocation, 3000);
  }, [busId, selectedRouteId]);

  const handleStopTracking = useCallback(() => {
    setIsTracking(false);
    // Remove from Firebase Realtime DB so passengers see bus as gone
    const busRef = ref(rtdb, `activeBuses/${busId}`);
    remove(busRef).catch(console.error);
    onDisconnect(busRef).cancel(); // Ensure we don't accidentally remove a future session
    
    socketRef.current?.emit("driver:stop-tracking", { busId });
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
    setDriverLocation(null);
  }, [busId]);

  const handleRouteUpdate = useCallback((routeId: string) => {
    if (socketRef.current && busId) {
      socketRef.current.emit("driver:route-update", { busId, routeId });
    }
  }, [busId]);

  return (
    <div className="flex flex-col h-screen bg-brand-dark text-white overflow-hidden">
      {/* View Container */}
      <div className="relative flex-1 flex flex-col overflow-hidden">
        
        <div className={`absolute inset-0 z-0 flex flex-col ${activeTab === "map" ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>
          <div className="flex-1 relative z-0">
            {activeRoute && (
              <DriverMap 
                route={activeRoute} 
                targetStop={activeRoute.stops?.[1] || activeRoute.stops?.[0]} 
                driverLocation={driverLocation}
                socketRef={socketRef as any}
                busId={busId}
              />
            )}
          </div>
          
          <div className="absolute bottom-0 w-full z-10">
            <TransmitterControls
              busId={busId}
              setBusId={setBusId}
              selectedRouteId={selectedRouteId}
              setSelectedRouteId={setSelectedRouteId}
              isTracking={isTracking}
              onStartTracking={handleStartTracking}
              onStopTracking={handleStopTracking}
              onRouteUpdate={handleRouteUpdate}
            />
          </div>
        </div>
        
        <div className={`absolute inset-0 z-10 flex flex-col bg-brand-dark transition-opacity duration-300 ${activeTab === "profile" ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>
          <DriverProfileTab driverId="drv_1" busId={busId} />
        </div>
      </div>

      {/* Bottom Navigation - Refined Charcoal Mono */}
      <nav className="shrink-0 bg-brand-surface/80 border-t border-white/5 backdrop-blur-2xl pb-safe z-30 relative">
        <div className="flex items-center justify-around px-4 py-2 max-w-md mx-auto">
          <button
            onClick={() => setActiveTab("map")}
            className={`flex flex-col items-center justify-center py-3 flex-1 rounded-2xl transition-all duration-300 ${
              activeTab === "map" ? "text-white bg-white/5 transform scale-105" : "text-white/30 hover:text-white/60"
            }`}
          >
            <Navigation className={`w-5 h-5 mb-1.5 ${activeTab === "map" ? "text-white" : "opacity-40"}`} />
            <span className="text-[9px] font-black tracking-[0.15em] uppercase">Drive View</span>
          </button>
          
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex flex-col items-center justify-center py-3 flex-1 rounded-2xl transition-all duration-300 ${
              activeTab === "profile" ? "text-white bg-white/5 transform scale-105" : "text-white/30 hover:text-white/60"
            }`}
          >
            <User className={`w-5 h-5 mb-1.5 ${activeTab === "profile" ? "text-white" : "opacity-40"}`} />
            <span className="text-[9px] font-black tracking-[0.15em] uppercase">Profile</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
