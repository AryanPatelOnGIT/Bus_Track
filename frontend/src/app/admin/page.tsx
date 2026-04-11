"use client";

import Header from "@/components/shared/Header";
import Footer from "@/components/shared/Footer";
import RouteManagementPanel from "@/components/admin/RouteManagementPanel";
import FleetManagementPanel from "@/components/admin/FleetManagementPanel";
import { ShieldCheck, Map as MapIcon, Users } from "lucide-react";
import { useState } from "react";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<"routes" | "fleet">("routes");

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

          <div className="flex items-center gap-4">
            <button 
              onClick={() => setActiveTab("routes")}
              className={`flex px-6 py-3 rounded-2xl border transition-all w-fit items-center gap-3 ${activeTab === 'routes' ? 'bg-white/10 border-white/20' : 'bg-transparent border-transparent hover:bg-white/5'}`}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shadow-lg transition-colors ${activeTab === 'routes' ? 'bg-white text-brand-dark' : 'bg-white/10 text-white/40'}`}>
                  <MapIcon className="w-4 h-4" />
              </div>
              <div className="flex flex-col text-left">
                  <span className={`text-[9px] font-black uppercase tracking-widest leading-none mb-1 transition-colors ${activeTab === 'routes' ? 'text-white/40' : 'text-white/20'}`}>Module</span>
                  <span className={`text-sm font-black uppercase tracking-widest leading-none transition-colors ${activeTab === 'routes' ? 'text-white' : 'text-white/40'}`}>Routes</span>
              </div>
            </button>
            
            <button 
              onClick={() => setActiveTab("fleet")}
              className={`flex px-6 py-3 rounded-2xl border transition-all w-fit items-center gap-3 ${activeTab === 'fleet' ? 'bg-white/10 border-white/20' : 'bg-transparent border-transparent hover:bg-white/5'}`}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shadow-lg transition-colors ${activeTab === 'fleet' ? 'bg-white text-brand-dark' : 'bg-white/10 text-white/40'}`}>
                  <Users className="w-4 h-4" />
              </div>
              <div className="flex flex-col text-left">
                  <span className={`text-[9px] font-black uppercase tracking-widest leading-none mb-1 transition-colors ${activeTab === 'fleet' ? 'text-white/40' : 'text-white/20'}`}>Module</span>
                  <span className={`text-sm font-black uppercase tracking-widest leading-none transition-colors ${activeTab === 'fleet' ? 'text-white' : 'text-white/40'}`}>Fleet</span>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 bg-brand-dark/20">
        {activeTab === "routes" ? <RouteManagementPanel /> : <FleetManagementPanel />}
      </div>

      <Footer />
    </main>
  );
}
