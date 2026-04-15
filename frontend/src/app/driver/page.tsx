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
import { Navigation, User, MessageSquare } from "lucide-react";
import { rtdb } from "@/lib/firebase";
import { auth } from "@/lib/firebase";
import { getIdToken } from "firebase/auth";
import { ref, set, remove, onDisconnect } from "firebase/database";

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
     // Clear manual bus selection when switching drivers
     setSelectedBusId("");
  }, [driverId]);

  const activeDriver = drivers.find(d => d.id === driverId);
  const busId = selectedBusId || activeDriver?.assignedBusId || "";
  
  const [selectedRouteIds, setSelectedRouteIds] = useState<string[]>([]);
  const [isTracking, setIsTracking] = useState(false);
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number; heading: number } | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("map");
  const [isMessagingOpen, setIsMessagingOpen] = useState(false);

  // Always-current refs — fixes stale-closure bug in handleStopTracking
  const busIdRef = useRef("");
  const routeIdsRef = useRef<string[]>([]);
  // ARCH-07 fix: replaces (window as any).__CURRENT_STOP_INDEX anti-pattern
  const currentStopIndexRef = useRef<number>(0);
  const handleStopIndexChange = useCallback((index: number) => {
    currentStopIndexRef.current = index;
  }, []);
  useEffect(() => { busIdRef.current = busId; }, [busId]);
  useEffect(() => { routeIdsRef.current = selectedRouteIds; }, [selectedRouteIds]);
  
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
    // SEC-04: Pass Firebase ID token so the backend socket middleware can verify identity.
    // If the user isn't signed in yet, we connect without a token and let the server
    // reject/re-attempt after sign-in — SocketRef stays null until auth resolves.
    const connectSocket = async () => {
      const currentUser = auth.currentUser;
      let token: string | undefined;
      try {
        if (currentUser) token = await getIdToken(currentUser);
      } catch {
        // Token fetch failed — socket will be rejected by server auth middleware
        console.warn("[Socket] Failed to get ID token; connection may be rejected");
      }

      const { io } = await import("socket.io-client");
      const socket = io(process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000", {
        transports: ["websocket"],
        auth: token ? { token } : {},
      });
      socketRef.current = socket;

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

    // Tell the backend socket (if available) that tracking started
    socketRef.current?.emit("driver:start-tracking", {
      busId,
      driverId: driverId,
      routeIds: selectedRouteIds
    });

    // Auto-clear messages when driver disconnects abruptly
    const messagesRef = ref(rtdb, `messages/${busId}`);
    onDisconnect(messagesRef).remove().catch(() => {});

    const updateLocation = () => {
      // ARCH-07 fix: read from ref instead of window global
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
            // Only emit via socket. Backend will update RTDB.
            socketRef.current?.emit("driver:location-update", {
              busId, driverId,
              lat: newLoc.lat, lng: newLoc.lng, heading: newLoc.heading,
              speed, timestamp: pos.timestamp, status: "active",
              currentStopIndex: currentIndex
            });
          },
          () => {
            // Mock drift fallback
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
  }, [busId, selectedRouteIds]);

  const handleStopTracking = useCallback(() => {
    // Read from refs so we always get the CURRENT busId/routeIds,
    // not the stale closure values captured when the function was created.
    const currentBusId = busIdRef.current;

    setIsTracking(false);

    // Clear comm messages
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
                onEndShift={handleStopTracking}
                isTracking={isTracking}
                selectedRouteIds={selectedRouteIds}
                onStopIndexChange={handleStopIndexChange}
              />
            )}
          </div>
          
          {!isTracking && (
            <div className="absolute bottom-0 w-full z-10">
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

        {/* Floating Messaging Button */}
        {activeTab === "map" && !isMessagingOpen && (
          <div className="absolute bottom-36 right-4 z-40">
            <button 
              onClick={() => setIsMessagingOpen(true)}
              className="w-14 h-14 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all"
            >
              <MessageSquare className="w-6 h-6" />
            </button>
          </div>
        )}

        {/* Messaging Overlay */}
        {isMessagingOpen && (
          <div className="absolute inset-x-0 bottom-0 top-32 z-50 animate-slide-up">
            <MessagingPanel
              busId={busId}
              currentUserRole="driver"
              currentUserId={user?.uid || driverId || "operator"}
              currentUserName={user?.displayName || "Operator"}
              isOverlay={true}
              onClose={() => setIsMessagingOpen(false)}
            />
          </div>
        )}
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
