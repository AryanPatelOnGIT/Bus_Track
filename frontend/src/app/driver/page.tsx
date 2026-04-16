"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import TransmitterControls from "@/components/driver/TransmitterControls";
import DriverMap from "@/components/maps/DriverMap";
import DriverProfileTab from "@/components/driver/DriverProfileTab";
import MessagingPanel from "@/components/shared/MessagingPanel";
import { useAuth } from "@/hooks/useAuth";
import { useRoutes } from "@/hooks/useRoutes";
import { useDrivers } from "@/hooks/useDrivers";
import { useBuses } from "@/hooks/useBuses";
import { Navigation, User, Radio } from "lucide-react";
import { rtdb } from "@/lib/firebase";
import { auth } from "@/lib/firebase";
import { getIdToken } from "firebase/auth";
import { ref, remove, onDisconnect } from "firebase/database";

// Mock location state — uses tiny increments instead of random jumps
let mockLat = 23.0347;
let mockLng = 72.5483;
let mockHeading = 45;

type Tab = "map" | "profile";

export default function DriverPage() {
  const { user } = useAuth();
  const { routes } = useRoutes();
  const { drivers } = useDrivers();
  const { buses } = useBuses();
  const [driverId, setDriverId] = useState("");
  const [selectedBusId, setSelectedBusId] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem("driverId");
    if (saved) setDriverId(saved);
  }, []);

  useEffect(() => {
     if (driverId) localStorage.setItem("driverId", driverId);
     setSelectedBusId("");
  }, [driverId]);

  const activeDriver = drivers.find(d => d.id === driverId);
  const busId = selectedBusId || activeDriver?.assignedBusId || "";
  
  const [selectedRouteIds, setSelectedRouteIds] = useState<string[]>([]);
  const [isTracking, setIsTracking] = useState(false);
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number; heading: number } | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("map");
  const [isMessagingOpen, setIsMessagingOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const busIdRef = useRef("");
  const routeIdsRef = useRef<string[]>([]);
  const currentStopIndexRef = useRef<number>(0);
  const handleStopIndexChange = useCallback((index: number) => {
    currentStopIndexRef.current = index;
  }, []);
  useEffect(() => { busIdRef.current = busId; }, [busId]);
  useEffect(() => { routeIdsRef.current = selectedRouteIds; }, [selectedRouteIds]);
  
  const socketRef = useRef<ReturnType<typeof import("socket.io-client").io> | null>(null);
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (routes.length > 0 && selectedRouteIds.length === 0) {
      setSelectedRouteIds([routes[0].id]);
    }
  }, [routes]);

  const activeRoute = routes.find(r => selectedRouteIds.includes(r.id)) || routes.find(r => r.id === selectedRouteIds[0]);

  useEffect(() => {
    const connectSocket = async () => {
      const currentUser = auth.currentUser;
      let token: string | undefined;
      try {
        if (currentUser) token = await getIdToken(currentUser);
      } catch {
        console.warn("[Socket] Failed to get ID token; connection may be rejected");
      }

      const { io } = await import("socket.io-client");
      const socket = io(process.env.NEXT_PUBLIC_BACKEND_URL || "https://bustrack-backend.onrender.com", {
        transports: ["websocket", "polling"],
        auth: token ? { token } : {},
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 2000,
      });
      socketRef.current = socket;

      socket.on("connect", () => {
        console.log("[Socket] Connected to backend:", socket.id);
      });
      socket.on("connect_error", (err) => {
        console.error("[Socket] Connection error:", err.message);
      });
    };

    connectSocket();

    return () => {
      socketRef.current?.disconnect();
      if (intervalIdRef.current) clearInterval(intervalIdRef.current);
    };
  }, []);

  const handleStartTracking = useCallback(() => {
    if (!busId) return;
    setIsTracking(true);

    socketRef.current?.emit("driver:start-tracking", {
      busId,
      driverId: driverId,
      routeIds: selectedRouteIds
    });

    const messagesRef = ref(rtdb, `messages/${busId}`);
    onDisconnect(messagesRef).remove().catch(() => {});

    const updateLocation = () => {
      const currentIndex = currentStopIndexRef.current;

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
            socketRef.current?.emit("driver:location-update", {
              busId, driverId,
              lat: newLoc.lat, lng: newLoc.lng, heading: newLoc.heading,
              speed, timestamp: pos.timestamp, status: "active",
              currentStopIndex: currentIndex
            });
          },
          () => {
            mockLat += (Math.random() - 0.4) * 0.0003;
            mockLng += (Math.random() - 0.3) * 0.0004;
            mockHeading = (mockHeading + (Math.random() - 0.5) * 15 + 360) % 360;
            const mockLoc = { lat: mockLat, lng: mockLng, heading: Math.round(mockHeading) };
            setDriverLocation(mockLoc);
            socketRef.current?.emit("driver:location-update", {
              busId, driverId,
              lat: mockLoc.lat, lng: mockLoc.lng, heading: mockLoc.heading,
              speed: 15, timestamp: Date.now(), status: "active",
              currentStopIndex: currentIndex
            });
          },
          { enableHighAccuracy: true, timeout: 5000 }
        );
      }
    };

    updateLocation();
    intervalIdRef.current = setInterval(updateLocation, 3000);
  }, [busId, selectedRouteIds, driverId]);

  const handleStopTracking = useCallback(() => {
    const currentBusId = busIdRef.current;
    setIsTracking(false);
    const messagesRef = ref(rtdb, `messages/${currentBusId}`);
    remove(messagesRef).catch(console.error);
    onDisconnect(messagesRef).cancel();
    socketRef.current?.emit("driver:stop-tracking", { busId: currentBusId });
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
    setDriverLocation(null);
  }, []);

  const handleRouteUpdate = useCallback((routeIds: string[]) => {
    if (socketRef.current && busId) {
      socketRef.current.emit("driver:route-update", { busId, routeIds });
    }
  }, [busId]);

  const handleOpenMessaging = () => {
    setIsMessagingOpen(true);
    setUnreadCount(0);
  };

  return (
    <div className="flex flex-col bg-brand-dark text-white overflow-hidden" style={{ height: "100dvh" }}>
      {/* View Container */}
      <div className="relative flex-1 flex flex-col overflow-hidden min-h-0">
        
        <div className={`absolute inset-0 z-0 flex flex-col ${activeTab === "map" ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>
          <div className="flex-1 relative z-0 min-h-0">
            {activeRoute && (
              <DriverMap 
                route={activeRoute} 
                driverLocation={driverLocation}
                socketRef={socketRef as any}
                busId={busId}
                onEndShift={handleStopTracking}
                isTracking={isTracking}
                selectedRouteIds={selectedRouteIds}
                onStopIndexChange={handleStopIndexChange}
              />
            )}
          </div>
          
          {!isTracking && (
            <div className="shrink-0 z-10 w-full">
              <TransmitterControls
                busId={busId}
                driverId={driverId}
                setDriverId={setDriverId}
                buses={buses}
                setSelectedBusId={setSelectedBusId}
                drivers={drivers}
                selectedRouteIds={selectedRouteIds}
                setSelectedRouteIds={setSelectedRouteIds}
                isTracking={isTracking}
                onStartTracking={handleStartTracking}
                onStopTracking={handleStopTracking}
                onRouteUpdate={handleRouteUpdate}
              />
            </div>
          )}
        </div>
        
        <div className={`absolute inset-0 z-10 flex flex-col bg-brand-dark transition-opacity duration-300 ${activeTab === "profile" ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>
          <DriverProfileTab driverId={driverId || "UNASSIGNED"} busId={busId || "UNASSIGNED"} onStopTracking={handleStopTracking} isTracking={isTracking} />
        </div>

        {/* Messaging FAB — top-right, always visible when on map tab */}
        {activeTab === "map" && !isMessagingOpen && (
          <div className="absolute top-4 right-4 z-50">
            <button 
              onClick={handleOpenMessaging}
              className="w-12 h-12 rounded-full bg-brand-surface/90 backdrop-blur-xl border border-white/10 text-white flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all relative"
              aria-label="Open live comms"
            >
              <Radio className="w-5 h-5 text-emerald-400" />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-red-500 rounded-full flex items-center justify-center text-[10px] font-black text-white px-1 shadow-lg border border-brand-dark">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
          </div>
        )}

        {/* Messaging Overlay */}
        {isMessagingOpen && (
          <div className="absolute inset-x-0 bottom-0 top-0 z-50 animate-slide-up">
            <MessagingPanel
              busId={busId}
              currentUserRole="driver"
              currentUserId={user?.uid || driverId || "operator"}
              currentUserName={user?.displayName || "Operator"}
              isOverlay={true}
              onClose={() => setIsMessagingOpen(false)}
              onUnreadCountChange={setUnreadCount}
            />
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <nav className="relative z-50 shrink-0 bg-brand-surface/80 border-t border-white/5 backdrop-blur-2xl pb-safe" style={{ height: "64px" }}>
        <div className="flex items-center justify-around px-4 h-full max-w-md mx-auto">
          <button
            onClick={() => setActiveTab("map")}
            className={`flex flex-col items-center justify-center py-2 flex-1 rounded-2xl transition-all duration-300 ${
              activeTab === "map" ? "text-white bg-white/5 transform scale-105" : "text-white/30 hover:text-white/60"
            }`}
          >
            <Navigation className={`w-5 h-5 mb-1 ${activeTab === "map" ? "text-white" : "opacity-40"}`} />
            <span className="text-[9px] font-black tracking-[0.15em] uppercase">Drive View</span>
          </button>
          
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex flex-col items-center justify-center py-2 flex-1 rounded-2xl transition-all duration-300 ${
              activeTab === "profile" ? "text-white bg-white/5 transform scale-105" : "text-white/30 hover:text-white/60"
            }`}
          >
            <User className={`w-5 h-5 mb-1 ${activeTab === "profile" ? "text-white" : "opacity-40"}`} />
            <span className="text-[9px] font-black tracking-[0.15em] uppercase">Profile</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
