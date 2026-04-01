"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import TransmitterControls from "@/components/driver/TransmitterControls";
import DriverNavMap from "@/components/driver/DriverNavMap";
import DriverProfileTab from "@/components/driver/DriverProfileTab";
import { useRoutes } from "@/hooks/useRoutes";

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

  // Setup Socket
  // Auto-select first route when routes load
  useEffect(() => {
    if (routes.length > 0 && !selectedRouteId) {
      setSelectedRouteId(routes[0].id);
    }
  }, [routes, selectedRouteId]);

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
    if (!busId || !socketRef.current) return;
    setIsTracking(true);
    socketRef.current.emit("driver:start-tracking", { 
      busId, 
      driverId: "drv_1", 
      routeId: selectedRouteId 
    });

    const updateLocation = () => {
      if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const newLoc = {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              heading: pos.coords.heading || 0,
            };
            const speed = (pos.coords.speed || 0) * 3.6; // m/s to km/h
            
            setDriverLocation(newLoc);
            
            socketRef.current?.emit("driver:location-update", {
              busId,
              driverId: "drv_1",
              lat: newLoc.lat,
              lng: newLoc.lng,
              heading: newLoc.heading,
              speed,
              timestamp: pos.timestamp,
              status: "active",
            });
          },
          (err) => {
            console.warn("Geolocation failed/denied. Using mock location for testing.", err);
            // Fallback for desktop testing where GPS might be unavailable
            const mockLoc = {
               lat: 23.0347 + (Math.random() * 0.005 - 0.0025),
               lng: 72.5483 + (Math.random() * 0.005 - 0.0025),
               heading: Math.floor(Math.random() * 360)
            };
            
            setDriverLocation(mockLoc);
            
            socketRef.current?.emit("driver:location-update", {
              busId,
              driverId: "drv_1",
              lat: mockLoc.lat,
              lng: mockLoc.lng,
              heading: mockLoc.heading,
              speed: 15,
              timestamp: Date.now(),
              status: "active",
            });
          },
          { enableHighAccuracy: true, timeout: 5000 }
        );
      }
    };

    // Initial update
    updateLocation();
    
    // Set interval for 3 seconds
    intervalIdRef.current = setInterval(updateLocation, 3000);
  }, [busId, selectedRouteId]);

  const handleStopTracking = useCallback(() => {
    setIsTracking(false);
    if (socketRef.current && busId) {
      socketRef.current.emit("driver:stop-tracking", { busId });
    }
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
        
        {/* Map View */}
        <div className={`absolute inset-0 z-0 flex flex-col ${activeTab === "map" ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>
          {/* Main Map Background */}
          <div className="flex-1 relative z-0">
            <DriverNavMap 
              driverLocation={driverLocation} 
              selectedRouteId={selectedRouteId}
            />
          </div>
          
          {/* Floating Bottom Sheet for Controls */}
          <div className="absolute bottom-0 w-full z-20">
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
        
        {/* Profile View */}
        <div className={`absolute inset-0 z-10 flex flex-col bg-brand-dark transition-opacity duration-300 ${activeTab === "profile" ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>
          <DriverProfileTab driverId="drv_1" busId={busId} />
        </div>
      </div>

      {/* Bottom Navigation */}
      <nav className="shrink-0 bg-brand-dark/95 border-t border-white/10 backdrop-blur-md pb-safe z-30 relative">
        <div className="flex items-center justify-around px-2 py-1">
          <button
            onClick={() => setActiveTab("map")}
            className={`flex flex-col items-center justify-center p-3 flex-1 rounded-2xl transition-colors ${
              activeTab === "map" ? "text-blue-400 bg-white/5" : "text-white/40 hover:text-white/70"
            }`}
          >
            <span className="text-2xl mb-1 drop-shadow-sm">🗺️</span>
            <span className="text-[10px] font-bold tracking-widest uppercase">Drive</span>
          </button>
          
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex flex-col items-center justify-center p-3 flex-1 rounded-2xl transition-colors ${
              activeTab === "profile" ? "text-emerald-400 bg-white/5" : "text-white/40 hover:text-white/70"
            }`}
          >
            <span className="text-2xl mb-1 drop-shadow-sm">👨‍✈️</span>
            <span className="text-[10px] font-bold tracking-widest uppercase">Profile</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
