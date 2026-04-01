"use client";

import { User, CreditCard, History, Bell, LogOut, ChevronRight } from "lucide-react";

export default function AccountTab() {
  return (
    <div className="flex-1 overflow-y-auto bg-brand-dark p-8 flex flex-col items-center">
      <div className="w-full max-w-lg space-y-12 mt-12">
        {/* Profile Header */}
        <div className="flex flex-col items-center gap-6">
          <div className="w-28 h-28 rounded-[2.5rem] bg-brand-surface border border-white/5 flex items-center justify-center text-white/10 shadow-2xl relative overflow-hidden">
             <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 blur-2xl" />
             <User className="w-12 h-12 text-white/40" />
          </div>
          <div className="text-center">
            <h2 className="text-3xl font-bold font-display tracking-tight text-white mb-2" style={{ fontFamily: "Outfit, sans-serif" }}>
              Passenger Name
            </h2>
            <p className="text-xs font-bold text-white/20 uppercase tracking-[0.2em]">Verified Transit Member</p>
          </div>
        </div>

        {/* Info Cards - Smooth Charcoal */}
        <div className="grid grid-cols-2 gap-6">
          <div className="bg-brand-surface border border-white/5 rounded-[2rem] p-8 flex flex-col items-center justify-center text-center shadow-2xl transition-transform hover:scale-[1.02]">
            <span className="text-white/20 text-[10px] font-black uppercase tracking-widest mb-2">Trips Taken</span>
            <span className="text-3xl font-bold text-white tracking-tighter">12</span>
          </div>
          <div className="bg-brand-surface border border-white/5 rounded-[2rem] p-8 flex flex-col items-center justify-center text-center shadow-2xl transition-transform hover:scale-[1.02]">
            <span className="text-white/20 text-[10px] font-black uppercase tracking-widest mb-2">Saved Routes</span>
            <span className="text-3xl font-bold text-white tracking-tighter">03</span>
          </div>
        </div>

        {/* Actions List - Refined Block */}
        <div className="bg-brand-surface border border-white/5 rounded-[2rem] overflow-hidden mt-8 shadow-3xl">
          {[
            { label: "Payment Methods", icon: CreditCard },
            { label: "Travel History", icon: History },
            { label: "Notification Settings", icon: Bell },
            { label: "Log Out", icon: LogOut, color: "text-red-400" },
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
        
        {/* Version Info */}
        <p className="text-center text-[10px] text-white/10 font-bold uppercase tracking-widest pb-12">BusTrack v2.1.0 • Ahmedabad BRTS</p>
      </div>
    </div>
  );
}
