"use client";

import { useState, useEffect } from "react";
import PassengerMap from "@/components/maps/PassengerMap";
import AccountTab from "@/components/passenger/AccountTab";
import { useRoutes } from "@/hooks/useRoutes";

type Tab = "map" | "account";

export default function PassengerPage() {
  const [activeTab, setActiveTab] = useState<Tab>("map");
  const { routes } = useRoutes();
  const [selectedRouteId, setSelectedRouteId] = useState("");

  useEffect(() => {
    if (routes.length > 0 && !selectedRouteId) {
      setSelectedRouteId(routes[0].id);
    }
  }, [routes, selectedRouteId]);

  const activeRoute = routes.find(r => r.id === selectedRouteId);
  const targetStop = activeRoute?.waypoints && activeRoute.waypoints.length > 0 ? {
    id: "terminus",
    lat: activeRoute.waypoints[activeRoute.waypoints.length - 1].lat,
    lng: activeRoute.waypoints[activeRoute.waypoints.length - 1].lng,
    name: "Final Destination",
    shortName: "TERMINUS"
  } : null;

  return (
    <div className="flex flex-col h-screen bg-brand-dark text-white overflow-hidden">
      {/* View Container */}
      <div className="relative flex-1 flex flex-col overflow-hidden">
        <div className={`absolute inset-0 z-0 ${activeTab === "map" ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>
          {activeRoute && targetStop ? (
            <>
              {/* Route Selector Dashboard */}
              <div className="absolute top-0 w-full z-40 bg-gradient-to-b from-brand-dark/95 to-transparent pt-safe px-4 pb-6">
                 <select
                    value={selectedRouteId}
                    onChange={(e) => setSelectedRouteId(e.target.value)}
                    className="w-full backdrop-blur-md bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-xl appearance-none font-semibold truncate"
                  >
                    {routes.map((r) => (
                      <option key={r.id} value={r.id} className="bg-brand-dark">{r.name}</option>
                    ))}
                  </select>
              </div>

              <PassengerMap 
                targetStop={targetStop} 
                routeId={activeRoute.id} 
              />
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-brand-dark/90 px-6 text-center">
              <div className="w-8 h-8 rounded-full border-4 border-t-blue-500 border-white/20 animate-spin mb-4" />
              <p className="text-white/60 font-medium tracking-wide">Fetching active transit routes...</p>
            </div>
          )}
        </div>
        
        {/* Account View */}
        <div className={`absolute inset-0 z-10 flex flex-col bg-brand-dark transition-opacity duration-300 ${activeTab === "account" ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>
          <AccountTab />
        </div>
      </div>

      {/* Bottom Navigation */}
      <nav className="shrink-0 bg-brand-dark/95 border-t border-white/10 backdrop-blur-md pb-safe">
        <div className="flex items-center justify-around px-2 py-1">
          <button
            onClick={() => setActiveTab("map")}
            className={`flex flex-col items-center justify-center p-3 flex-1 rounded-2xl transition-colors ${
              activeTab === "map" ? "text-blue-400 bg-white/5" : "text-white/40 hover:text-white/70"
            }`}
          >
            <span className="text-2xl mb-1 drop-shadow-sm">🗺️</span>
            <span className="text-[10px] font-bold tracking-widest uppercase">Live Map</span>
          </button>
          
          <button
            onClick={() => setActiveTab("account")}
            className={`flex flex-col items-center justify-center p-3 flex-1 rounded-2xl transition-colors ${
              activeTab === "account" ? "text-emerald-400 bg-white/5" : "text-white/40 hover:text-white/70"
            }`}
          >
            <span className="text-2xl mb-1 drop-shadow-sm">👤</span>
            <span className="text-[10px] font-bold tracking-widest uppercase">Account</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
