import Header from "@/components/shared/Header";
import Footer from "@/components/shared/Footer";
import type { Metadata } from "next";
import { 
  Bus, 
  MapPin, 
  Navigation, 
  LayoutDashboard, 
  Wifi, 
  TrendingUp, 
  Star, 
  Bell, 
  User, 
  Monitor,
  ShieldCheck,
  Zap
} from "lucide-react";

export const metadata: Metadata = {
  title: "BusTrack – Ahmedabad BRTS Live Tracking",
  description:
    "Real-time bus tracking, ride-hailing, and fleet management for Ahmedabad BRTS.",
};

const PORTALS = [
  {
    href: "/passenger",
    icon: MapPin,
    label: "Passenger App",
    desc: "Track live bus positions, see ETAs, and request on-demand pickups or drop-offs right from the map.",
    border: "hover:border-blue-500/30",
    tag: "Live Tracking",
  },
  {
    href: "/driver",
    icon: Navigation,
    label: "Driver App",
    desc: "Broadcast your GPS position, see incoming passenger requests, and navigate dynamically with OSRM routing.",
    border: "hover:border-amber-500/30",
    tag: "GPS Broadcast",
  },
  {
    href: "/admin",
    icon: LayoutDashboard,
    label: "Admin Control",
    desc: "Bird's-eye fleet oversight with live analytics, alerts, passenger feedback, and full route monitoring.",
    border: "hover:border-emerald-500/30",
    tag: "Fleet Analytics",
  },
];

const FEATURES = [
  { icon: Wifi, title: "Real-Time GPS", desc: "Sub-second location updates via Socket.io WebSockets." },
  { icon: MapPin, title: "On-Demand Stops", desc: "Passengers tap the map to request pickups anywhere on the route." },
  { icon: Navigation, title: "Smart Routing", desc: "OSRM integration calculates optimal road-based routes for drivers." },
  { icon: TrendingUp, title: "Live Analytics", desc: "Admins see fleet utilisation, trip counts, and alerts in real-time." },
  { icon: Star, title: "Passenger Feedback", desc: "Star ratings and comments collected per trip for quality control." },
  { icon: Bell, title: "Smart Alerts", desc: "Automated notifications for depot arrivals, request spikes, and off-routes." },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    role: "Passenger",
    icon: User,
    color: "text-blue-400",
    border: "border-blue-500/10",
    steps: ["Open the Passenger App", "See all buses live on the map", "Tap to request a pickup or drop-off", "Watch your bus approach in real-time"],
  },
  {
    step: "02",
    role: "Driver",
    icon: Bus,
    color: "text-amber-400",
    border: "border-amber-500/10",
    steps: ["Select your bus number", "Hit Start Tracking to go live", "Receive passenger requests on screen", "Mark requests Done when complete"],
  },
  {
    step: "03",
    role: "Admin",
    icon: Monitor,
    color: "text-emerald-400",
    border: "border-emerald-500/10",
    steps: ["Monitor entire fleet on one map", "View live stats and alerts", "Track ongoing trips and ratings", "Ensure quality control across routes"],
  },
];

const STATS = [
  { value: "50+", label: "Bus Routes" },
  { value: "< 1s", label: "Update Latency" },
  { value: "3", label: "Connected Apps" },
  { value: "24/7", label: "Live Monitoring" },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-brand-dark text-white font-sans overflow-x-hidden">
      <Header />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative min-h-[90vh] flex flex-col items-center justify-center px-4 pt-20 pb-32">
        {/* Subtle Ambient Refined Background */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[600px] bg-gradient-to-b from-white/5 to-transparent blur-[120px] pointer-events-none" />

        {/* Badge */}
        <div className="mb-10 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/5 bg-white/5 text-white/60 text-xs font-semibold uppercase tracking-widest">
          <Zap className="w-3 h-3 text-amber-500" />
          Live for Ahmedabad BRTS
        </div>

        {/* Headline */}
        <h1
          className="text-center font-bold tracking-tight leading-[1.05]"
          style={{ fontFamily: "Outfit, sans-serif", fontSize: "clamp(3rem, 8vw, 5.5rem)" }}
        >
          Ahmedabad&apos;s Smartest
          <br />
          <span className="gradient-text tracking-tighter">Bus Network</span>
        </h1>

        <p className="mt-8 text-white/40 text-lg text-center max-w-2xl leading-relaxed font-medium">
          Live GPS tracking, on-demand stops, and complete fleet oversight —
          seamlessly connecting passengers, drivers, and administrators.
        </p>

        {/* CTA Portal Cards */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl">
          {PORTALS.map((p) => {
             const Icon = p.icon;
             return (
              <a
                key={p.href}
                href={p.href}
                className={`group relative flex flex-col p-8 rounded-2xl border border-white/5 bg-brand-surface ${p.border} transition-all duration-500 hover:-translate-y-2 hover:bg-brand-muted hover:shadow-2xl hover:shadow-black/50`}
              >
                <div className="absolute top-6 right-6 text-[10px] px-2 py-0.5 rounded-full border border-white/10 text-white/30 uppercase tracking-widest font-bold">
                  {p.tag}
                </div>
                <div className="w-14 h-14 mb-8 rounded-2xl bg-white/5 flex items-center justify-center transition-transform group-hover:scale-110">
                  <Icon className="w-7 h-7 text-white" />
                </div>
                <h2
                  className="font-bold text-xl text-white mb-3"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  {p.label}
                </h2>
                <p className="text-white/40 text-sm leading-relaxed flex-1">{p.desc}</p>
                <span className="mt-6 text-xs text-white/30 group-hover:text-white/70 transition flex items-center gap-1 font-bold uppercase tracking-wider">
                  Launch Portal →
                </span>
              </a>
             )
          })}
        </div>
      </section>

      {/* ── STATS BAR ─────────────────────────────────────────────────────── */}
      <section className="border-y border-white/5 bg-brand-surface/20">
        <div className="max-w-6xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {STATS.map((s) => (
            <div key={s.label}>
              <div
                className="text-4xl font-bold text-white tracking-tighter"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                {s.value}
              </div>
              <div className="text-white/30 text-xs font-bold uppercase tracking-widest mt-2">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────────────────────── */}
      <section id="features" className="py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col items-center mb-20 text-center">
            <h2
              className="text-4xl font-bold text-white mb-4"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              Enterprise Grade. <span className="text-white/30">Built for Scale.</span>
            </h2>
            <div className="w-12 h-1 bg-white/10 rounded-full" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
              <div
                key={f.title}
                className="group p-8 rounded-2xl border border-white/5 bg-brand-surface hover:border-white/20 hover:bg-brand-muted transition-all duration-300"
              >
                <div className="w-12 h-12 mb-6 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
                  <Icon className="w-6 h-6 text-white/80" />
                </div>
                <h3
                  className="font-bold text-white text-lg mb-3"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  {f.title}
                </h3>
                <p className="text-white/40 text-sm leading-relaxed">{f.desc}</p>
              </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-32 px-6 bg-brand-surface/10">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col items-center mb-20 text-center">
            <h2
              className="text-4xl font-bold text-white mb-4"
              style={{ fontFamily: "Outfit, sans-serif" }}
            >
              System Ecosystem
            </h2>
            <p className="text-white/30 text-sm font-bold uppercase tracking-widest">How It All Connects</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {HOW_IT_WORKS.map((col) => {
              const Icon = col.icon;
              return (
              <div
                key={col.role}
                className={`rounded-3xl border ${col.border} bg-brand-dark p-10 flex flex-col relative overflow-hidden`}
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-[60px] pointer-events-none" />
                
                <div className="flex items-center gap-4 mb-10">
                  <div className={`w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center ${col.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-1">Step {col.step}</div>
                    <h3
                      className={`font-bold text-2xl text-white`}
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      {col.role}
                    </h3>
                  </div>
                </div>
                <ol className="space-y-6 flex-1">
                  {col.steps.map((s, i) => (
                    <li key={i} className="flex items-start gap-4 text-sm text-white/50 group">
                      <span className={`mt-0.5 w-6 h-6 flex-shrink-0 rounded-lg bg-white/5 border border-white/10 text-[10px] flex items-center justify-center font-bold text-white/40`}>
                        {i + 1}
                      </span>
                      <span className="group-hover:text-white transition-colors">{s}</span>
                    </li>
                  ))}
                </ol>
              </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ────────────────────────────────────────────────────── */}
      <section className="py-40 px-6">
        <div className="max-w-4xl mx-auto p-12 rounded-[2rem] bg-brand-surface border border-white/10 flex flex-col items-center text-center relative overflow-hidden">
          <div className="absolute top-0 w-full h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          
          <h2
            className="text-4xl font-bold text-white mb-6"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Experience the Future of Transit.
          </h2>
          <p className="text-white/40 mb-12 max-w-xl font-medium">
            Join Ahmedabad&apos;s most advanced BRTS tracking ecosystem today. Choose your portal to get started.
          </p>
          
          <div className="flex flex-wrap justify-center gap-4">
            {PORTALS.map((p) => {
              const Icon = p.icon;
              return (
              <a
                key={p.href}
                href={p.href}
                className="px-8 py-4 rounded-2xl bg-white text-brand-dark hover:bg-white/90 font-bold transition flex items-center gap-3 shadow-xl"
              >
                <Icon className="w-4 h-4" />
                {p.label}
              </a>
              )
            })}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
