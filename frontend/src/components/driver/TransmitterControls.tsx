"use client";

import { useState, useEffect } from "react";
import { useRoutes } from "@/hooks/useRoutes";
import { Bus, Navigation, Play, Square, ChevronDown, ChevronUp, MapPin } from "lucide-react";

import { DriverData } from "@/hooks/useDrivers";

interface Props {
  onNewRequest?: (req: any) => void;
  busId: string;
  driverId: string;
  setDriverId: (id: string) => void;
  drivers: DriverData[];
  selectedRouteIds: string[];
  setSelectedRouteIds: (ids: string[]) => void;
  isTracking: boolean;
  onStartTracking: () => void;
  onStopTracking: () => void;
  onRouteUpdate?: (routeIds: string[]) => void;
}

export default function TransmitterControls({
  busId,
  driverId,
  setDriverId,
  drivers,
  selectedRouteIds,
  setSelectedRouteIds,
  isTracking,
  onStartTracking,
  onStopTracking,
  onRouteUpdate,
}: Props) {
  const [isExpanded, setIsExpanded] = useState(true);
  const { routes } = useRoutes();

  useEffect(() => {
    if (isTracking) {
      setIsExpanded(false);
    } else {
      setIsExpanded(true);
    }
  }, [isTracking]);

  return (
    <div className={`flex flex-col w-full bg-brand-surface/90 backdrop-blur-2xl rounded-t-[2.5rem] border-t border-white/5 shadow-3xl transition-all duration-500 overflow-hidden relative`}>
      {/* Drag handle / toggle indicator */}
      <div 
        className="w-full flex justify-center pt-4 pb-2 cursor-pointer group"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="w-12 h-1.5 bg-white/10 rounded-full group-hover:bg-white/20 transition-all" />
      </div>

      <div className={`px-8 gap-8 flex-col ${isExpanded ? 'flex pb-10' : 'hidden'}`}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display font-bold text-white text-2xl tracking-tight" style={{ fontFamily: "Outfit, sans-serif" }}>
              Transmitter <span className="text-white/20">Control</span>
            </h2>
            <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.2em] mt-1">Live Telemetry Control Panel</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center">
             <Navigation className="w-5 h-5 text-white/40" />
          </div>
        </div>

        {/* Active Bus Info */}
        <div className="space-y-3">
          <label className="text-[10px] text-white/20 font-black uppercase tracking-[0.2em] px-1">Hardware Identity</label>
          <div className="w-full bg-brand-dark/40 border border-white/5 rounded-2xl px-6 py-4 text-white text-sm flex items-center justify-between shadow-inner">
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                <Bus className="w-4 h-4 text-white/50" />
              </div>
              <span className="font-black font-mono tracking-widest text-white/80">{busId || "UNASSIGNED"}</span>
            </div>
            <div className="flex items-center gap-2">
               {isTracking ? (
                 <>
                   <span className="w-2 h-2 rounded-full bg-status-active shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                   <span className="text-[9px] font-black tracking-widest text-status-active uppercase">Operational</span>
                 </>
               ) : (
                 <>
                   <span className="w-2 h-2 rounded-full bg-white/20" />
                   <span className="text-[9px] font-black tracking-widest text-white/40 uppercase">Offline</span>
                 </>
               )}
            </div>
          </div>
        </div>

        {/* Operator Selector */}
        {!isTracking && (
          <div className="space-y-3">
            <label className="text-[10px] text-white/20 font-black uppercase tracking-[0.2em] px-1">Operator Identity</label>
            <div className="relative">
              <select
                value={driverId}
                onChange={(e) => setDriverId(e.target.value)}
                className="w-full h-14 bg-brand-dark/40 border border-white/5 rounded-2xl px-6 py-2.5 text-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-white/10 appearance-none shadow-inner"
              >
                <option value="">— SELECT PROfILE —</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>{d.name} ({d.id})</option>
                ))}
              </select>
              <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 pointer-events-none" />
            </div>
          </div>
        )}

        {/* Path Selector - Multi-select checkboxes */}
        <div className="space-y-3">
          <label className="text-[10px] text-white/20 font-black uppercase tracking-[0.2em] px-1">Active Routes ({selectedRouteIds.length} selected)</label>
          <div className="bg-brand-dark/40 border border-white/5 rounded-2xl overflow-hidden shadow-inner">
            {!driverId ? (
              <p className="text-[10px] text-white/20 font-bold uppercase tracking-widest text-center py-4">Select an operator first</p>
            ) : (() => {
              const activeDriver = drivers.find(d => d.id === driverId);
              const allowedRoutes = routes.filter(r => activeDriver?.assignedRoutes?.includes(r.id));
              
              if (allowedRoutes.length === 0) {
                return <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest text-center py-4">No routes assigned to this operator</p>;
              }

              return allowedRoutes.map((r) => {
                const isSelected = selectedRouteIds.includes(r.id);
                return (
                  <label
                    key={r.id}
                    className={`flex items-center gap-4 px-5 py-4 cursor-pointer border-b border-white/5 last:border-b-0 transition-all ${
                      isSelected ? 'bg-white/5' : 'hover:bg-white/3'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                      isSelected ? 'border-emerald-400 bg-emerald-500' : 'border-white/20 bg-transparent'
                    }`}>
                      {isSelected && <span className="text-white text-[10px] font-black">✓</span>}
                    </div>
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={isSelected}
                      disabled={isTracking}
                      onChange={() => {
                        const newIds = isSelected
                          ? selectedRouteIds.filter(id => id !== r.id)
                          : [...selectedRouteIds, r.id];
                        setSelectedRouteIds(newIds);
                        if (isTracking) onRouteUpdate?.(newIds);
                      }}
                    />
                    <div className="flex flex-col">
                      <span className={`text-sm font-bold tracking-tight ${isSelected ? 'text-white' : 'text-white/40'}`}>{r.name}</span>
                      <span className="text-[9px] font-mono text-white/20 tracking-widest">{r.id}</span>
                    </div>
                  </label>
                );
              });
            })()}
          </div>
        </div>
        
        {/* Expanded Tracking Controls */}
        <div className="pt-4">
          {!isTracking ? (
            <button
              onClick={onStartTracking}
              disabled={!busId || !driverId || selectedRouteIds.length === 0}
              className="w-full py-5 rounded-[1.5rem] bg-white text-brand-dark font-black text-sm hover:scale-[1.02] active:scale-95 transition-all shadow-3xl flex items-center justify-center gap-3 tracking-[0.1em] disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Play className="w-4 h-4 fill-brand-dark" />
              GO LIVE
            </button>
          ) : (
            <button
              onClick={onStopTracking}
              className="w-full py-5 rounded-[1.5rem] bg-red-500 text-white font-black text-sm hover:scale-[1.02] active:scale-95 transition-all shadow-3xl shadow-red-500/20 flex items-center justify-center gap-3 tracking-[0.1em]"
            >
              <Square className="w-4 h-4 fill-white" />
              TERMINAL FEED
            </button>
          )}
        </div>
      </div>

      {/* Collapsed View (Live Tracking Bar) */}
      {!isExpanded && isTracking && (
        <div className="px-8 pb-6 flex items-center justify-between gap-4 animate-slide-up">
          <div className="flex flex-col flex-1" onClick={() => setIsExpanded(true)}>
             <div className="flex items-center gap-2 mb-1">
               <span className="w-2.5 h-2.5 rounded-full bg-status-active shadow-[0_0_8px_rgba(16,185,129,0.5)] animate-pulse" />
               <span className="text-[10px] font-black text-status-active uppercase tracking-widest">TRANSMITTING</span>
             </div>
             <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-white/20" />
                <span className="text-sm font-bold text-white tracking-tight">
                  {selectedRouteIds.length} Route{selectedRouteIds.length !== 1 ? 's' : ''} Active
                </span>
             </div>
          </div>
          <button
            onClick={onStopTracking}
            className="h-12 px-6 rounded-2xl bg-white/5 border border-white/5 text-red-500 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-red-500 hover:text-white transition-all shadow-2xl"
          >
            OFFLINE
          </button>
        </div>
      )}
    </div>
  );
}
