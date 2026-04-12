"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import TransmitterControls from "@/components/driver/TransmitterControls";
import DriverMap from "@/components/maps/DriverMap";
import DriverProfileTab from "@/components/driver/DriverProfileTab";
import MessagingPanel from "@/components/shared/MessagingPanel";
import { useAuth } from "@/hooks/useAuth";
import { useRoutes } from "@/hooks/useRoutes";
import { useDrivers } from "@/hooks/useDrivers";
import { Navigation, User, MessageSquare } from "lucide-react";
import { rtdb } from "@/lib/firebase";
import { ref, set, remove, onDisconnect } from "firebase/database";

// Mock location state — uses tiny increments instead of random jumps
let mockLat = 23.0347;
let mockLng = 72.5483;
let mockHeading = 45;

type Tab = "map" | "messages" | "profile";

export default function DriverPage() {
  const { user } = useAuth();
  const { routes } = useRoutes();
  const { drivers } = useDrivers();
  const [driverId, setDriverId] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("driverId");
    if (saved) setDriverId(saved);
  }, []);

  useEffect(() => {
     if (driverId) localStorage.setItem("driverId", driverId);
  }, [driverId]);

  const activeDriver = drivers.find(d => d.id === driverId);
  const busId = activeDriver?.assignedBusId || "";
  
  const [selectedRouteIds, setSelectedRouteIds] = useState<string[]>([]);
  const [isTracking, setIsTracking] = useState(false);
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number; heading: number } | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("map");
  
  const socketRef = useRef<ReturnType<typeof import("socket.io-client").io> | null>(null);
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Auto-select first route when routes load
    if (routes.length > 0 && selectedRouteIds.length === 0) {
      setSelectedRouteIds([routes[0].id]);
    }
  }, [routes]);

  // For the map, show the first selected route
  const activeRoute = routes.find(r => selectedRouteIds.includes(r.id)) || routes.find(r => r.id === selectedRouteIds[0]);

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
      driverId: driverId,
      routeIds: selectedRouteIds
    });

    const writeToFirebase = (loc: { lat: number; lng: number; heading: number; speed: number }) => {
      // Write one entry per selected route so passengers on any of these routes can see the bus
      selectedRouteIds.forEach((routeId) => {
        const busRef = ref(rtdb, `activeBuses/${busId}_${routeId}`);
        onDisconnect(busRef).remove().catch(() => {});
        set(busRef, {
          busId,
          driverId: driverId,
          routeId,
          lat: loc.lat,
          lng: loc.lng,
          heading: loc.heading,
          speed: loc.speed,
          status: "active",
          timestamp: Date.now(),
        }).catch(console.error);
      });
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
              busId, driverId,
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
              busId, driverId,
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
  }, [busId, selectedRouteIds]);

  const handleStopTracking = useCallback(() => {
    setIsTracking(false);
    // Remove all route entries for this bus from Firebase
    selectedRouteIds.forEach((routeId) => {
      const busRef = ref(rtdb, `activeBuses/${busId}_${routeId}`);
      remove(busRef).catch(console.error);
      onDisconnect(busRef).cancel();
    });
    
    socketRef.current?.emit("driver:stop-tracking", { busId });
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
    setDriverLocation(null);
  }, [busId, selectedRouteIds]);

  const handleRouteUpdate = useCallback((routeIds: string[]) => {
    if (socketRef.current && busId) {
      socketRef.current.emit("driver:route-update", { busId, routeIds });
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
                driverLocation={driverLocation}
                socketRef={socketRef as any}
                busId={busId}
              />
            )}
          </div>
          
          <div className="absolute bottom-0 w-full z-10">
            <TransmitterControls
              busId={busId}
              driverId={driverId}
              setDriverId={setDriverId}
              drivers={drivers}
              selectedRouteIds={selectedRouteIds}
              setSelectedRouteIds={setSelectedRouteIds}
              isTracking={isTracking}
              onStartTracking={handleStartTracking}
              onStopTracking={handleStopTracking}
              onRouteUpdate={handleRouteUpdate}
            />
          </div>
        </div>
        
        <div className={`absolute inset-0 z-10 flex flex-col bg-brand-dark transition-opacity duration-300 ${activeTab === "profile" ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>
          <DriverProfileTab driverId={driverId || "UNASSIGNED"} busId={busId || "UNASSIGNED"} />
        </div>

        <div className={`absolute inset-0 z-20 flex flex-col pt-10 bg-brand-dark transition-opacity duration-300 ${activeTab === "messages" ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>
          <div className="flex-1 pb-safe overflow-hidden">
            <MessagingPanel
              busId={busId}
              currentUserRole="driver"
              currentUserId={user?.uid || driverId || "operator"}
              currentUserName={user?.displayName || "Operator"}
            />
          </div>
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
            onClick={() => setActiveTab("messages")}
            className={`flex flex-col items-center justify-center py-3 flex-1 rounded-2xl transition-all duration-300 ${
              activeTab === "messages" ? "text-white bg-white/5 transform scale-105" : "text-white/30 hover:text-white/60"
            }`}
          >
            <MessageSquare className={`w-5 h-5 mb-1.5 ${activeTab === "messages" ? "text-white" : "opacity-40"}`} />
            <span className="text-[9px] font-black tracking-[0.15em] uppercase">Messages</span>
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
