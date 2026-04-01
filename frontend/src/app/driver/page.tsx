"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import TransmitterControls from "@/components/driver/TransmitterControls";
import DriverNavMap from "@/components/driver/DriverNavMap";
import { PREDEFINED_ROUTES } from "@/lib/predefinedRoutes";



export default function DriverPage() {
  const [busId, setBusId] = useState("BRTS-101");
  const [selectedRouteId, setSelectedRouteId] = useState(PREDEFINED_ROUTES[0]?.id || "");
  const [isTracking, setIsTracking] = useState(false);
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number; heading: number } | null>(null);
  
  const socketRef = useRef<ReturnType<typeof import("socket.io-client").io> | null>(null);
  const intervalIdRef = useRef<NodeJS.Timeout | null>(null);

  // Setup Socket
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
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel */}
        <aside className="w-[340px] shrink-0 flex flex-col border-r border-white/10 glass z-10 relative shadow-2xl overflow-y-auto">
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
        </aside>
        
        {/* Right Nav Map */}
        <div className="flex-1 relative z-0">
          <DriverNavMap 
            driverLocation={driverLocation} 
            selectedRouteId={selectedRouteId}
          />
        </div>
      </div>
    </div>
  );
}
