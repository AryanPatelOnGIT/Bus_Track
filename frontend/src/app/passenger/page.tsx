"use client";

import { useState, useEffect } from "react";
import PassengerMap from "@/components/maps/PassengerMap";
import AccountTab from "@/components/passenger/AccountTab";
import { useRoutes } from "@/hooks/useRoutes";
import { Map as MapIcon, User, Loader2 } from "lucide-react";

type Tab = "map" | "account";

export default function PassengerPage() {
  const [activeTab, setActiveTab] = useState<Tab>("map");
  const { routes } = useRoutes();
  const [selectedRouteId, setSelectedRouteId] = useState("");
  const [activeBuses, setActiveBuses] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    let mounted = true;
    let socket: any;

    import("socket.io-client").then(({ io }) => {
      if (!mounted) return;
      socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000", {
        transports: ["websocket"],
      });

      socket.on("connect", () => {
        socket.emit("passenger:join");
      });

      socket.on("bus:location-update", (payload: any) => {
        if (payload.routeId && payload.busId) {
          setActiveBuses((prev) => {
            const next = new Map(prev);
            next.set(payload.busId, payload.routeId);
            return next;
          });
        }
      });

      socket.on("bus:stop-tracking", (payload: any) => {
        if (payload.busId) {
          setActiveBuses((prev) => {
            const next = new Map(prev);
            next.delete(payload.busId);
            return next;
          });
        }
      });
    });

    return () => {
      mounted = false;
      if (socket) socket.disconnect();
    };
  }, []);

  const activeRouteIds = Array.from(new Set(activeBuses.values()));
  const activeRouteIdsStr = activeRouteIds.sort().join(',');

  useEffect(() => {
    const currentAvailable = routes.filter(r => activeRouteIds.includes(r.id));
    if (currentAvailable.length > 0) {
      if (!selectedRouteId || !currentAvailable.some(r => r.id === selectedRouteId)) {
        setSelectedRouteId(currentAvailable[0].id);
      }
    } else if (currentAvailable.length === 0 && selectedRouteId) {
      setSelectedRouteId("");
    }
  }, [activeRouteIdsStr, routes, selectedRouteId]);

  const availableRoutes = routes.filter(r => activeRouteIds.includes(r.id));
  const activeRoute = availableRoutes.find(r => r.id === selectedRouteId);
  
  // Use the new dynamic 'stops' array if available, fallback to terminus logic
  const targetStop = activeRoute?.stops && activeRoute.stops.length > 0 
    ? activeRoute.stops[activeRoute.stops.length - 1] 
    : (activeRoute?.waypoints && activeRoute.waypoints.length > 0 ? {
        id: "terminus",
        lat: activeRoute.waypoints[activeRoute.waypoints.length - 1].lat,
        lng: activeRoute.waypoints[activeRoute.waypoints.length - 1].lng,
        name: "Final Destination",
        shortName: "TERMINUS"
      } : null);

  return (
    <div className="flex flex-col h-screen bg-brand-dark text-white overflow-hidden">
      {/* View Container */}
      <div className="relative flex-1 flex flex-col overflow-hidden">
        <div className={`absolute inset-0 z-0 ${activeTab === "map" ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>
          {activeRoute && targetStop ? (
            <>
              {/* Route Selector Dashboard - Refined Block Style */}
              <div className="absolute top-0 w-full z-40 bg-gradient-to-b from-brand-dark/95 to-transparent pt-safe px-4 pb-12">
                 <div className="relative w-full max-w-lg mx-auto">
                    <select
                      value={selectedRouteId}
                      onChange={(e) => setSelectedRouteId(e.target.value)}
                      className="w-full h-14 backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl px-6 text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/20 shadow-2xl appearance-none font-bold tracking-tight"
                    >
                      {availableRoutes.map((r) => (
                        <option key={r.id} value={r.id} className="bg-brand-dark">{r.name}</option>
                      ))}
                    </select>
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none opacity-30">
                       <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                         <path d="M6 9l6 6 6-6" />
                       </svg>
                    </div>
                 </div>
              </div>

              <PassengerMap 
                targetStop={targetStop} 
                route={activeRoute} 
              />
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-brand-dark px-10 text-center">
              <Loader2 className="w-10 h-10 text-white/20 animate-spin mb-6" />
              <p className="text-white/40 text-sm font-bold uppercase tracking-[0.2em]">Waiting for Operator...</p>
            </div>
          )}
        </div>
        
        {/* Account View */}
        <div className={`absolute inset-0 z-10 flex flex-col bg-brand-dark transition-opacity duration-300 ${activeTab === "account" ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>
          <AccountTab />
        </div>
      </div>

      {/* Bottom Navigation - Deep Charcoal Block Style */}
      <nav className="shrink-0 bg-brand-surface/80 border-t border-white/5 backdrop-blur-2xl pb-safe">
        <div className="flex items-center justify-around px-4 py-2 max-w-md mx-auto">
          <button
            onClick={() => setActiveTab("map")}
            className={`flex flex-col items-center justify-center py-3 flex-1 rounded-2xl transition-all duration-300 ${
              activeTab === "map" ? "text-white bg-white/5 transform scale-105" : "text-white/30 hover:text-white/60"
            }`}
          >
            <MapIcon className={`w-5 h-5 mb-1.5 ${activeTab === "map" ? "text-white" : "opacity-40"}`} />
            <span className="text-[9px] font-black tracking-[0.15em] uppercase">Live Map</span>
          </button>
          
          <button
            onClick={() => setActiveTab("account")}
            className={`flex flex-col items-center justify-center py-3 flex-1 rounded-2xl transition-all duration-300 ${
              activeTab === "account" ? "text-white bg-white/5 transform scale-105" : "text-white/30 hover:text-white/60"
            }`}
          >
            <User className={`w-5 h-5 mb-1.5 ${activeTab === "account" ? "text-white" : "opacity-40"}`} />
            <span className="text-[9px] font-black tracking-[0.15em] uppercase">Account</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
