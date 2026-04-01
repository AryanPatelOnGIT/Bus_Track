"use client";

import { useState } from "react";
import LiveMap from "@/components/passenger/LiveMap";
import AccountTab from "@/components/passenger/AccountTab";

type Tab = "map" | "account";

export default function PassengerPage() {
  const [activeTab, setActiveTab] = useState<Tab>("map");

  return (
    <div className="flex flex-col h-screen bg-brand-dark text-white overflow-hidden">
      {/* View Container */}
      <div className="relative flex-1 flex flex-col overflow-hidden">
        {/* Map View */}
        <div className={`absolute inset-0 z-0 ${activeTab === "map" ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>
          <LiveMap />
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
