import Header from "@/components/shared/Header";
import Footer from "@/components/shared/Footer";
import type { Metadata } from "next";
import { 
  Bus, 
  MapPin, 
  Navigation, 
  LayoutDashboard, 
  Wifi, 
  Zap,
  TrendingUp,
  Map
} from "lucide-react";

export const metadata: Metadata = {
  title: "BusTrack – Breathtaking BRTS Live Tracking",
  description:
    "Real-time bus tracking, ride-hailing, and fleet management for Ahmedabad BRTS.",
};

const STATS = [
  { value: "50+", label: "Routes Active" },
  { value: "<1s", label: "Latency" },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-anti-canvas text-brand-dark font-sans overflow-x-hidden selection:bg-anti-lilac selection:text-white relative">
      {/* ── TOP-LEFT VOLUMETRIC STUDIO LIGHT ─────────────────────────────── */}
      <div className="absolute top-0 left-0 w-[800px] h-[800px] bg-white rounded-full blur-[120px] pointer-events-none opacity-80" />
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-anti-lilac/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Standard Header remains at the top, but text will inherit dark instead of white */}
      {/* Note: The Header component itself might have fixed white text. Since we only want to change the landing page, we'll let it be or overlay. For this pure aesthetic, the top nav ideally vanishes, but we'll keep it for navigation. */}
      {/* However, since Header is dark-themed, we'll wrap the page content below it to ensure it stands out. */}

      <div className="relative z-10 pt-32 pb-40 px-6 max-w-7xl mx-auto flex flex-col items-center min-h-[90vh]">
        
        {/* ── HEADLINE ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col items-center text-center max-w-4xl animate-fade-in opacity-0" style={{ animationDelay: "0.1s" }}>
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-black/5 bg-anti-glass backdrop-blur-md shadow-anti-soft text-[10px] font-bold uppercase tracking-widest text-black/40 mb-12">
            <Zap className="w-3.5 h-3.5 text-anti-lilac" />
            Zero Gravity Tracking
          </div>

          <h1 
            className="text-[clamp(3.5rem,8vw,7rem)] font-bold tracking-tighter leading-[0.95] text-transparent bg-clip-text bg-gradient-to-br from-black/90 to-black/40 mb-8"
            style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
          >
            Transit,<br/>
            Effortless.
          </h1>
          
          <p className="text-xl md:text-2xl text-black/40 font-medium max-w-2xl tracking-tight leading-relaxed">
            Ahmedabad&apos;s BRTS network suspended in a frictionless digital ecosystem. 
            Real-time telemetry meets impossibly minimal design.
          </p>

          {/* SINGLE BREATHTAKING CTA */}
          <div className="mt-16 relative group">
            {/* Bioluminescent inner glow pseudo-element */}
            <div className="absolute inset-0 bg-anti-lilac/30 blur-2xl rounded-full scale-110 group-hover:bg-anti-lilac/40 transition-colors duration-700" />
            <a href="/passenger" className="relative flex items-center gap-3 px-10 py-5 rounded-full bg-white border border-white shadow-anti-glow hover:scale-105 transition-transform duration-500 ease-[cubic-bezier(0.3,0,0.2,1)]">
              <span className="font-bold text-sm tracking-widest uppercase text-anti-lilac">System Link</span>
              <Navigation className="w-4 h-4 text-anti-lilac" />
            </a>
          </div>
        </div>

        {/* ── BENTO GRID (ANTI-GRAVITY CLUSTERS) ─────────────────────────── */}
        <div className="mt-40 w-full grid grid-cols-1 md:grid-cols-12 gap-8 relative">
          
          {/* Passenger Portal Card - Tilts left, floating slowly */}
          <a href="/passenger" className="md:col-span-8 group relative rounded-[3rem] bg-anti-glass border border-anti-glassBorder backdrop-blur-2xl shadow-anti-soft p-12 overflow-hidden flex flex-col items-start hover:-translate-y-4 hover:shadow-2xl hover:shadow-anti-lilac/20 transition-all duration-700 animate-float-slow -rotate-1">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-anti-lilac/10 to-transparent blur-3xl rounded-full pointer-events-none" />
            
            <div className="w-16 h-16 rounded-2xl bg-white flex items-center justify-center shadow-anti-soft mb-12">
              <MapPin className="w-8 h-8 text-anti-lilac" />
            </div>
            
            <h2 className="text-4xl font-bold tracking-tight text-black/80 mb-4" style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
              Passenger Canvas
            </h2>
            <p className="text-lg text-black/40 font-medium max-w-md leading-relaxed mb-12">
              Summon a vehicle with a tap. Watch it materialize on an impossibly smooth map with ultra-low latency positioning.
            </p>
            
            <span className="mt-auto inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-anti-lilac group-hover:gap-4 transition-all">
              Initialize Portal <span className="text-lg leading-none">&rarr;</span>
            </span>
          </a>

          {/* Stats Bento - Right side stack */}
          <div className="md:col-span-4 flex flex-col gap-8 transform rotate-2 animate-float-medium" style={{ animationDelay: "1s" }}>
            {STATS.map((stat, i) => (
              <div key={i} className="flex-1 rounded-[2.5rem] bg-white/40 border border-white/60 backdrop-blur-xl shadow-anti-soft p-8 flex flex-col justify-center items-center text-center">
                 <span className="text-5xl font-bold tracking-tighter text-black/80 mb-2">{stat.value}</span>
                 <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/30">{stat.label}</span>
              </div>
            ))}
          </div>

          {/* Driver App Card */}
          <a href="/driver" className="md:col-span-5 relative rounded-[3rem] bg-gradient-to-b from-white to-white/40 border border-white/80 backdrop-blur-3xl shadow-anti-soft p-12 flex flex-col overflow-hidden hover:-translate-y-2 hover:shadow-xl transition-all duration-700 animate-float-fast rotate-1" style={{ animationDelay: "2s" }}>
             <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-blue-100 rounded-full blur-3xl pointer-events-none" />
             
             <div className="w-12 h-12 rounded-xl bg-black/5 flex items-center justify-center mb-10">
               <Bus className="w-5 h-5 text-black/60" />
             </div>
             <h3 className="text-2xl font-bold tracking-tight text-black/80 mb-3">Driver Interface</h3>
             <p className="text-sm text-black/40 font-medium leading-relaxed mb-8">
               Broadcast your signature across the network. A distraction-free helm for the modern transit operator.
             </p>
             <span className="mt-auto text-[10px] font-bold uppercase tracking-[0.2em] text-black/30 group-hover:text-black/60 transition-colors">Access &rarr;</span>
          </a>

          {/* Admin Dashboard Card */}
          <a href="/admin" className="md:col-span-7 relative rounded-[3rem] bg-anti-glass border border-anti-glassBorder backdrop-blur-2xl shadow-anti-soft p-12 flex overflow-hidden hover:-translate-y-2 hover:shadow-xl transition-all duration-700 animate-float-slow -rotate-2" style={{ animationDelay: "0.5s" }}>
             <div className="flex flex-col z-10 w-1/2">
               <div className="w-12 h-12 rounded-xl bg-black/5 flex items-center justify-center mb-10">
                 <LayoutDashboard className="w-5 h-5 text-black/60" />
               </div>
               <h3 className="text-2xl font-bold tracking-tight text-black/80 mb-3">Omniscient View</h3>
               <p className="text-sm text-black/40 font-medium leading-relaxed mb-8">
                 Complete oversight. Live telemetry. Analytics suspended in an elegant array of actionable data.
               </p>
               <span className="mt-auto text-[10px] font-bold uppercase tracking-[0.2em] text-black/30 group-hover:text-black/60 transition-colors">Access &rarr;</span>
             </div>
             {/* Decorative abstract elements */}
             <div className="absolute right-0 top-0 bottom-0 w-1/2 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-48 rounded-full border-[0.5px] border-black/5 flex items-center justify-center">
                  <div className="w-32 h-32 rounded-full border-[0.5px] border-black/10 flex items-center justify-center">
                     <TrendingUp className="w-8 h-8 text-black/10" />
                  </div>
                </div>
             </div>
          </a>

        </div>

      </div>
    </main>
  );
}
