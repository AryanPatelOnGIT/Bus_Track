"use client";

import { useState, useEffect } from "react";
import { useRoutes } from "@/hooks/useRoutes";

interface Props {
  onNewRequest?: (req: any) => void;
  busId: string;
  setBusId: (id: string) => void;
  selectedRouteId: string;
  setSelectedRouteId: (id: string) => void;
  isTracking: boolean;
  onStartTracking: () => void;
  onStopTracking: () => void;
  onRouteUpdate?: (routeId: string) => void;
}

export default function TransmitterControls({
  busId,
  setBusId,
  selectedRouteId,
  setSelectedRouteId,
  isTracking,
  onStartTracking,
  onStopTracking,
  onRouteUpdate,
}: Props) {
  const [isExpanded, setIsExpanded] = useState(true);
  const { routes } = useRoutes();

  // Auto-collapse when tracking starts
  useEffect(() => {
    if (isTracking) {
      setIsExpanded(false);
    } else {
      setIsExpanded(true);
    }
  }, [isTracking]);

  return (
    <div className={`flex flex-col w-full bg-brand-dark/95 backdrop-blur-md rounded-t-3xl border-t border-white/10 shadow-2xl transition-all duration-300 ${isExpanded ? 'h-auto max-h-[80vh] pb-6' : 'h-auto pb-4'} overflow-hidden relative`}>
      {/* Drag handle / toggle indicator */}
      <div 
        className="w-full flex justify-center pt-3 pb-2 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="w-12 h-1.5 bg-white/20 rounded-full" />
      </div>

      <div className={`px-5 gap-5 flex-col ${isExpanded ? 'flex' : 'hidden'}`}>
        {/* Header */}
        <div>
          <h2 className="font-display font-bold text-white text-lg" style={{ fontFamily: "Outfit, sans-serif" }}>
            Driver Panel
          </h2>
          <p className="text-xs text-white/40 mt-0.5">Broadcast your live GPS position</p>
        </div>

        {/* Active Bus Info */}
        <div className="space-y-2">
          <label className="text-xs text-white/40 uppercase tracking-widest">Active Bus</label>
          <div className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl">🚌</span>
              <span className="font-semibold">{busId || "BRTS-101"}</span>
            </div>
            <span className="text-[10px] bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded-full uppercase">Fleet Active</span>
          </div>
        </div>

        {/* Path Selector */}
        <div className="space-y-2">
          <label className="text-xs text-white/40 uppercase tracking-widest">Select Assigned Path</label>
          <select
            value={selectedRouteId}
            onChange={(e) => {
               const newId = e.target.value;
               setSelectedRouteId(newId);
               if (isTracking) onRouteUpdate?.(newId);
            }}
            className="w-full bg-brand-dark border border-white/15 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0f4c81]/60 appearance-none"
          >
            <option value="">— Choose Path —</option>
            {routes.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
        
        {/* Expanded Tracking Controls */}
        <div className="space-y-3 pt-2">
          {!isTracking ? (
            <button
              onClick={onStartTracking}
              disabled={!busId}
              className="w-full py-4 rounded-xl bg-green-500/15 border border-green-500/30 text-green-400 font-bold text-sm hover:bg-green-500/25 transition disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 flex items-center justify-center gap-2"
            >
              <span className="w-3 h-3 rounded-full bg-green-400" />
              START TRACKING
            </button>
          ) : (
            <button
              onClick={onStopTracking}
              className="w-full py-4 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 font-bold text-sm hover:bg-red-500/25 transition active:scale-95 flex items-center justify-center gap-2"
            >
              <span className="w-3 h-3 rounded-full bg-red-400 animate-pulse" />
              STOP TRACKING
            </button>
          )}
        </div>
      </div>

      {/* Collapsed View (Live Tracking Bar) */}
      {!isExpanded && isTracking && (
        <div className="px-5 pb-2 flex items-center justify-between gap-4">
          <div className="flex flex-col" onClick={() => setIsExpanded(true)}>
             <div className="flex items-center gap-2">
               <span className="w-2.5 h-2.5 rounded-full bg-green-400 bus-ping" />
               <span className="text-xs font-bold text-green-400 uppercase tracking-wider">Broadcasting</span>
             </div>
             <span className="text-sm font-medium text-white/90 truncate max-w-[180px]">
                {routes.find(r => r.id === selectedRouteId)?.name || "Unknown Route"}
             </span>
          </div>
          <button
            onClick={onStopTracking}
            className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 text-xs font-bold uppercase hover:bg-red-500/30 active:scale-95 transition"
          >
            STOP
          </button>
        </div>
      )}
    </div>
  );
}
