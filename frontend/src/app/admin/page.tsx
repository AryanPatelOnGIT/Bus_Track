"use client";

import { useEffect, useState } from "react";
import Header from "@/components/shared/Header";
import FleetMapOverview from "@/components/admin/FleetMapOverview";
import AnalyticsDashboard from "@/components/admin/AnalyticsDashboard";
import { api } from "@/lib/api";

interface FleetStats {
  totalBuses: number;
  activeBuses: number;
  maintenanceBuses: number;
  ongoingTrips: number;
  passengerCount: number;
}

export default function AdminPage() {
  const [stats, setStats] = useState<FleetStats | null>(null);

  useEffect(() => {
    // Initial fetch
    api.getFleetStats().then((data) => setStats(data)).catch(console.error);

    // Listen to real-time updates
    import("socket.io-client").then(({ io }) => {
      const socket = io(process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000", {
        transports: ["websocket"],
      });
      socket.emit("admin:join");
      socket.on("fleet:stats", (newStats: FleetStats) => setStats(newStats));
      
      return () => socket.disconnect();
    });
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-brand-dark text-white">
      <Header />

      {/* Stats Bar */}
      <div className="bg-brand-surface border-b border-white/10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-wrap gap-8 text-sm">
          {[
            { label: "Total Fleet", value: stats?.totalBuses ?? "—" },
            { label: "Active Now", value: stats?.activeBuses ?? "—", color: "text-status-active" },
            { label: "Maintenance", value: stats?.maintenanceBuses ?? "—", color: "text-status-maintenance" },
            { label: "Ongoing Trips", value: stats?.ongoingTrips ?? "—" },
            { label: "Passengers Today", value: stats?.passengerCount ?? "—" },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col">
              <span className="text-white/40 uppercase tracking-wide text-xs mb-1">{stat.label}</span>
              <span className={`font-display font-bold text-2xl ${stat.color ?? "text-white"}`} style={{ fontFamily: "Outfit, sans-serif" }}>
                {stat.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Fleet Map */}
      <div className="w-full h-[55vh] relative z-0 border-b border-white/10">
        <FleetMapOverview />
        {/* Overlay filter panel */}
        <div className="absolute top-4 left-4 z-[1000] glass px-4 py-3 rounded-xl border border-white/10">
          <h3 className="text-xs uppercase tracking-widest text-[#f5a623] mb-2 font-bold">Filters</h3>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm text-white/80 cursor-pointer hover:text-white">
              <input type="checkbox" defaultChecked className="accent-[#22c55e]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e]" /> Active
            </label>
            <label className="flex items-center gap-2 text-sm text-white/80 cursor-pointer hover:text-white">
              <input type="checkbox" defaultChecked className="accent-[#f59e0b]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" /> Idle
            </label>
            <label className="flex items-center gap-2 text-sm text-white/80 cursor-pointer hover:text-white">
              <input type="checkbox" defaultChecked className="accent-[#ef4444]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]" /> Maintenance
            </label>
          </div>
        </div>
      </div>

      {/* Analytics */}
      <div className="bg-brand-surface/50">
        <AnalyticsDashboard />
      </div>
    </div>
  );
}
