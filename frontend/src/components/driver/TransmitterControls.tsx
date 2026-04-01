"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { PREDEFINED_ROUTES } from "@/lib/predefinedRoutes";

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

const BUS_OPTIONS = ["BUS-001", "BUS-002", "BUS-003", "BUS-004", "BUS-005", "BRTS-101", "BRTS-102", "BRTS-103"];

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
  return (
    <div className="flex flex-col h-full p-5 gap-5">
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
        <div className="w-full bg-brand-dark/50 border border-white/10 rounded-xl px-4 py-3 text-white text-sm flex items-center justify-between">
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
          {PREDEFINED_ROUTES.map((r) => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
      </div>

      {/* Tracking Toggle */}
      <div className="space-y-3">
        {!isTracking ? (
          <button
            onClick={onStartTracking}
            disabled={!busId}
            className="w-full py-3 rounded-xl bg-green-500/15 border border-green-500/30 text-green-400 font-semibold text-sm hover:bg-green-500/25 transition disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 flex items-center justify-center gap-2"
          >
            <span className="w-3 h-3 rounded-full bg-green-400" />
            Start Tracking
          </button>
        ) : (
          <button
            onClick={onStopTracking}
            className="w-full py-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 font-semibold text-sm hover:bg-red-500/25 transition active:scale-95 flex items-center justify-center gap-2"
          >
            <span className="w-3 h-3 rounded-full bg-red-400 animate-pulse" />
            Stop Tracking
          </button>
        )}

        {isTracking && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-500/10 border border-green-500/20">
            <span className="w-2 h-2 rounded-full bg-green-400 bus-ping" />
            <span className="text-xs text-green-400">Broadcasting live GPS</span>
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-white/10" />
    </div>
  );
}
