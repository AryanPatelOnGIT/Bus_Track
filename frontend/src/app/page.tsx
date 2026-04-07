import type { Metadata } from "next";
import { Bus, MapPin, Navigation, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "BusTrack",
  description: "Live BRTS Tracker",
};

export default function HomePage() {
  return (
    <main
      className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-800"
      style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}
    >
      <div className="w-full max-w-sm flex flex-col items-center gap-8">
        
        {/* Branding */}
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-16 h-16 bg-blue-600 rounded-[1.25rem] flex items-center justify-center shadow-lg shadow-blue-600/30">
            <Bus className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 mt-2">BusTrack</h1>
          <p className="text-slate-500 font-medium text-sm">Ahmedabad BRTS Live</p>
        </div>

        {/* Portals */}
        <div className="w-full flex flex-col gap-4 mt-4">
          <a href="/passenger" className="p-5 bg-white rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-100 flex items-center gap-4 active:scale-[0.98] transition-transform">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shrink-0">
              <MapPin className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-slate-800">Passenger</h2>
              <p className="text-xs text-slate-500 mt-0.5">Live map & ETAs</p>
            </div>
            <span className="text-slate-300 text-2xl font-light">›</span>
          </a>

          <a href="/driver" className="p-5 bg-white rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-100 flex items-center gap-4 active:scale-[0.98] transition-transform">
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center shrink-0">
              <Navigation className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-slate-800">Driver</h2>
              <p className="text-xs text-slate-500 mt-0.5">Broadcast location</p>
            </div>
            <span className="text-slate-300 text-2xl font-light">›</span>
          </a>

          <a href="/admin" className="p-5 bg-white rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-100 flex items-center gap-4 active:scale-[0.98] transition-transform">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-slate-800">Admin</h2>
              <p className="text-xs text-slate-500 mt-0.5">Fleet control</p>
            </div>
            <span className="text-slate-300 text-2xl font-light">›</span>
          </a>
        </div>
        
      </div>
    </main>
  );
}
