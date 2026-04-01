"use client";

import Header from "@/components/shared/Header";
import Footer from "@/components/shared/Footer";
import RouteManagementPanel from "@/components/admin/RouteManagementPanel";
import { ShieldCheck, Map as MapIcon } from "lucide-react";

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-brand-dark text-white flex flex-col font-sans">
      <Header />

      {/* Admin Sub-header */}
      <div className="bg-brand-surface/40 border-b border-white/5 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2 text-white/40 text-xs font-bold uppercase tracking-widest">
              <ShieldCheck className="w-3.5 h-3.5" />
              Secure Infrastructure Control
            </div>
            <h1 className="text-4xl font-bold tracking-tight" style={{ fontFamily: "Outfit" }}>
              Fleet <span className="text-white/40">Control Center</span>
            </h1>
          </div>

          <div className="flex px-8 py-3 bg-brand-dark/50 rounded-2xl border border-white/5 w-fit items-center gap-3">
             <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-brand-dark shadow-2xl">
                <MapIcon className="w-4 h-4" />
             </div>
             <div className="flex flex-col">
                <span className="text-[10px] font-black text-white/20 uppercase tracking-widest leading-none mb-1">Active Module</span>
                <span className="text-sm font-black text-white uppercase tracking-widest leading-none">Route Manager</span>
             </div>
          </div>
        </div>
      </div>

      {/* Content Area - Only Route Management (Map) */}
      <div className="flex-1 bg-brand-dark/20">
        <RouteManagementPanel />
      </div>

      <Footer />
    </main>
  );
}
