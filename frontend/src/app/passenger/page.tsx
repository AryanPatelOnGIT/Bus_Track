"use client";

import { useState } from "react";
import LiveMap from "@/components/passenger/LiveMap";
import RideHailControls from "@/components/passenger/RideHailControls";

export default function PassengerPage() {
  const [selectedPin, setSelectedPin] = useState<{ lat: number; lng: number } | null>(null);
  const [mode, setMode] = useState<"pickup" | "dropoff" | null>(null);

  return (
    <div className="flex flex-col h-screen bg-brand-dark text-white overflow-hidden">
      {/* Map hint banner */}
      {mode && !selectedPin && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-2 px-4 py-2 rounded-full glass border border-white/15 text-sm text-white/70">
          <span className="w-2 h-2 rounded-full bg-[#f5a623] animate-pulse" />
          Click on the map to pin your {mode} location
        </div>
      )}

      {/* Full-screen map */}
      <div className="relative flex-1">
        <LiveMap
          onMapClick={(lat, lng) => {
            if (mode) setSelectedPin({ lat, lng });
          }}
          selectedPin={selectedPin}
        />
        <RideHailControls
          onModeChange={(m) => {
            setMode(m);
            if (!m) setSelectedPin(null);
          }}
          pendingLocation={selectedPin}
        />
      </div>
    </div>
  );
}
