"use client";

import { User, ClipboardList, Settings, LogOut, ChevronRight, Tool, Verified } from "lucide-react";

interface Props {
  driverId: string;
  busId: string;
}

export default function DriverProfileTab({ driverId, busId }: Props) {
  return (
    <div className="flex-1 overflow-y-auto bg-brand-dark p-8 flex flex-col items-center">
      <div className="w-full max-w-lg space-y-12 mt-12">
        {/* Profile Header */}
        <div className="flex flex-col items-center gap-6">
          <div className="w-28 h-28 rounded-[2.5rem] bg-brand-surface border border-white/5 flex items-center justify-center text-white/10 shadow-3xl relative overflow-hidden">
             <div className="absolute top-0 left-0 w-16 h-16 bg-white/5 blur-2xl" />
             <User className="w-12 h-12 text-white/40" />
          </div>
          <div className="text-center">
            <h2 className="text-3xl font-bold font-display tracking-tight text-white mb-2" style={{ fontFamily: "Outfit, sans-serif" }}>
              Driver {driverId.replace("drv_", "#")}
            </h2>
            <div className="flex items-center justify-center gap-2">
               <Verified className="w-3.5 h-3.5 text-blue-500" />
               <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.2em]">Authorized Operator</p>
            </div>
          </div>
        </div>

        {/* Current Shift Info - Refined Block */}
        <div className="bg-brand-surface border border-white/5 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-[50px] pointer-events-none" />
          <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-white/20 mb-6 px-1">Assignment Metrics</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-brand-dark/40 p-4 rounded-2xl border border-white/5">
              <span className="text-white/40 text-xs font-bold uppercase tracking-widest">Active Unit</span>
              <span className="font-black font-mono tracking-widest text-white/80">{busId}</span>
            </div>
            <div className="flex justify-between items-center bg-brand-dark/40 p-4 rounded-2xl border border-white/5">
              <span className="text-white/40 text-xs font-bold uppercase tracking-widest">Duty Status</span>
              <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                 <span className="w-2 h-2 rounded-full bg-emerald-500" />
                 <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Active</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-brand-surface border border-white/5 rounded-[2rem] p-8 flex flex-col items-center justify-center text-center shadow-2xl transition-transform hover:scale-[1.02]">
            <span className="text-white/20 text-[10px] font-black uppercase tracking-widest mb-2">Total Hours</span>
            <span className="text-3xl font-bold text-white tracking-tighter">42.5h</span>
          </div>
          <div className="bg-brand-surface border border-white/5 rounded-[2rem] p-8 flex flex-col items-center justify-center text-center shadow-2xl transition-transform hover:scale-[1.02]">
            <span className="text-white/20 text-[10px] font-black uppercase tracking-widest mb-2">Trips Done</span>
            <span className="text-3xl font-bold text-white tracking-tighter">18</span>
          </div>
        </div>

        {/* Actions List - Deep Charcoal Mono */}
        <div className="bg-brand-surface border border-white/5 rounded-[2rem] overflow-hidden mt-8 shadow-3xl">
          {[
            { label: "Shift Log", icon: ClipboardList },
            { label: "Maintenance Request", icon: Settings },
            { label: "Operator Settings", icon: Settings },
            { label: "End Shift", icon: LogOut, color: "text-red-400" },
          ].map((item, idx, arr) => (
            <button
              key={item.label}
              className={`w-full flex items-center justify-between p-6 bg-transparent hover:bg-white/5 transition-all group ${
                idx !== arr.length - 1 ? 'border-b border-white/5' : ''
              }`}
            >
              <div className="flex items-center gap-5">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                   <item.icon className={`w-5 h-5 ${item.color || 'text-white/30'}`} />
                </div>
                <span className={`text-sm font-bold tracking-tight ${item.color || 'text-white/70'}`}>{item.label}</span>
              </div>
              <ChevronRight className="w-4 h-4 text-white/10 group-hover:text-white/40 transition-colors" />
            </button>
          ))}
        </div>
        
        <p className="text-center text-[10px] text-white/10 font-bold uppercase tracking-widest pb-12">Operator ID: {driverId.toUpperCase()}</p>
      </div>
    </div>
  );
}
