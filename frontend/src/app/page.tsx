import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "BusTrack",
  description: "Live BRTS Tracker",
};

export default function HomePage() {
  return (
    <main
      className="relative min-h-screen bg-[#F0F2F5] flex flex-col justify-between overflow-hidden"
      style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" }}
    >
      {/* ── MAP BACKGROUND ─── Gives a real transit app feel instead of abstract AI shapes */}
      <div 
        className="absolute inset-0 z-0 opacity-40 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='street' width='40' height='40' patternUnits='userSpaceOnUse'%3E%3Cpath d='M0 40V0H40' fill='none' stroke='%23CAD1D8' stroke-width='1'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23street)'/%3E%3C/svg%3E")`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      
      {/* City/Top info */}
      <div className="relative z-10 p-8 pt-20">
        <h1 className="text-5xl font-extrabold tracking-tight text-gray-900 leading-none mb-2">
          BusTrack
        </h1>
        <p className="text-xl font-medium text-gray-500 tracking-tight">
          Ahmedabad
        </p>
      </div>

      {/* Action Sheet (Bottom Drawer) */}
      <div className="relative z-10 bg-white rounded-t-[2.5rem] p-8 pb-12 shadow-[0_-10px_40px_rgba(0,0,0,0.04)] flex flex-col gap-6">
        
        {/* Grabber pill */}
        <div className="w-12 h-1.5 bg-gray-200 rounded-full mx-auto mb-2" />
        
        <h2 className="text-2xl font-bold tracking-tight text-gray-900 mb-2">
          Select Portal
        </h2>

        {/* Primary Action (Passenger) - Big & Prominent */}
        <a 
          href="/passenger" 
          className="w-full bg-[#007AFF] text-white rounded-2xl p-5 flex items-center justify-between active:scale-95 transition-transform"
        >
          <div className="flex flex-col">
            <span className="text-lg font-bold">Track a Bus</span>
            <span className="text-blue-100 text-sm font-medium mt-0.5">View live map & ETAs</span>
          </div>
          <span className="text-2xl opacity-70">➔</span>
        </a>

        <div className="h-px w-full bg-gray-100 my-2" />

        {/* Secondary Actions */}
        <div className="grid grid-cols-2 gap-4">
          <a 
            href="/driver" 
            className="bg-gray-50 rounded-2xl p-4 flex flex-col gap-1 active:bg-gray-100 transition-colors"
          >
            <span className="text-gray-900 font-semibold mb-1 tracking-tight">Driver Login</span>
            <span className="text-gray-500 text-[11px] font-medium leading-snug">Broadcast your route</span>
          </a>
          
          <a 
            href="/admin" 
            className="bg-gray-50 rounded-2xl p-4 flex flex-col gap-1 active:bg-gray-100 transition-colors"
          >
            <span className="text-gray-900 font-semibold mb-1 tracking-tight">Dispatcher</span>
            <span className="text-gray-500 text-[11px] font-medium leading-snug">Manage the fleet</span>
          </a>
        </div>
      </div>
    </main>
  );
}
