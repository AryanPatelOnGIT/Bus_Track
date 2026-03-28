import Header from "@/components/shared/Header";
import Footer from "@/components/shared/Footer";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "BusTrack – Ahmedabad BRTS Live Tracking",
  description:
    "Real-time bus tracking, ride-hailing, and fleet management for Ahmedabad BRTS.",
};

const PORTALS = [
  {
    href: "/passenger",
    emoji: "🚌",
    label: "Passenger App",
    desc: "Track live bus positions, see ETAs, and request on-demand pickups or drop-offs right from the map.",
    color: "from-blue-500/20 to-blue-600/5",
    border: "hover:border-blue-500/50",
    tag: "Live Tracking",
  },
  {
    href: "/driver",
    emoji: "🧭",
    label: "Driver App",
    desc: "Broadcast your GPS position, see incoming passenger requests, and navigate dynamically with OSRM routing.",
    color: "from-amber-500/20 to-amber-600/5",
    border: "hover:border-amber-500/50",
    tag: "GPS Broadcast",
  },
  {
    href: "/admin",
    emoji: "📊",
    label: "Admin Control Center",
    desc: "Bird's-eye fleet oversight with live analytics, alerts, passenger feedback, and full route monitoring.",
    color: "from-emerald-500/20 to-emerald-600/5",
    border: "hover:border-emerald-500/50",
    tag: "Fleet Analytics",
  },
];

const FEATURES = [
  { icon: "📡", title: "Real-Time GPS", desc: "Sub-second location updates via Socket.io WebSockets." },
  { icon: "🚏", title: "On-Demand Stops", desc: "Passengers tap the map to request pickups anywhere on the route." },
  { icon: "🗺️", title: "Smart Routing", desc: "OSRM integration calculates optimal road-based routes for drivers." },
  { icon: "📈", title: "Live Analytics", desc: "Admins see fleet utilisation, trip counts, and alerts in real-time." },
  { icon: "⭐", title: "Passenger Feedback", desc: "Star ratings and comments collected per trip for quality control." },
  { icon: "🔔", title: "Smart Alerts", desc: "Automated notifications for depot arrivals, request spikes, and off-routes." },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    role: "Passenger",
    emoji: "👤",
    color: "text-blue-400",
    border: "border-blue-500/30",
    steps: ["Open the Passenger App", "See all buses live on the map", "Tap to request a pickup or drop-off", "Watch your bus approach in real-time"],
  },
  {
    step: "02",
    role: "Driver",
    emoji: "🚌",
    color: "text-amber-400",
    border: "border-amber-500/30",
    steps: ["Select your bus number", "Hit Start Tracking to go live", "Receive passenger requests on screen", "Mark requests Done when complete"],
  },
  {
    step: "03",
    role: "Admin",
    emoji: "🖥️",
    color: "text-emerald-400",
    border: "border-emerald-500/30",
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
    <main className="min-h-screen bg-brand-dark text-white font-sans">
      <Header />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden min-h-[90vh] flex flex-col items-center justify-center px-4 pt-16 pb-24">
        {/* Ambient glow background */}
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-[#0f4c81]/30 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/3 right-0 w-96 h-96 bg-[#f5a623]/10 rounded-full blur-[100px] pointer-events-none" />

        {/* Badge */}
        <div className="mb-6 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[#f5a623]/30 bg-[#f5a623]/10 text-[#f5a623] text-sm font-medium">
          <span className="w-2 h-2 rounded-full bg-[#f5a623] animate-pulse" />
          Live for Ahmedabad BRTS
        </div>

        {/* Headline */}
        <h1
          className="text-center font-bold tracking-tight leading-[1.1]"
          style={{ fontFamily: "Outfit, sans-serif", fontSize: "clamp(2.5rem, 7vw, 5rem)" }}
        >
          Ahmedabad&apos;s Smartest
          <br />
          <span className="gradient-text">Bus Network</span>
        </h1>

        <p className="mt-6 text-white/55 text-lg text-center max-w-2xl leading-relaxed">
          Live GPS tracking, on-demand stops, and complete fleet oversight —
          seamlessly connecting passengers, drivers, and administrators.
        </p>

        {/* CTA Portal Cards */}
        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-5 w-full max-w-5xl">
          {PORTALS.map((p) => (
            <a
              key={p.href}
              href={p.href}
              className={`group relative flex flex-col p-6 rounded-2xl border border-white/10 bg-gradient-to-br ${p.color} ${p.border} transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl`}
            >
              <span className="absolute top-4 right-4 text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/50">
                {p.tag}
              </span>
              <div className="text-4xl mb-4 transition-transform group-hover:scale-110">{p.emoji}</div>
              <h2
                className="font-bold text-lg text-white mb-2"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                {p.label}
              </h2>
              <p className="text-white/50 text-sm leading-relaxed flex-1">{p.desc}</p>
              <span className="mt-4 text-sm text-white/40 group-hover:text-white/70 transition flex items-center gap-1">
                Open portal →
              </span>
            </a>
          ))}
        </div>
      </section>

      {/* ── STATS BAR ─────────────────────────────────────────────────────── */}
      <section className="border-y border-white/10 bg-brand-surface/50">
        <div className="max-w-5xl mx-auto px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {STATS.map((s) => (
            <div key={s.label}>
              <div
                className="text-3xl font-bold text-white"
                style={{ fontFamily: "Outfit, sans-serif" }}
              >
                {s.value}
              </div>
              <div className="text-white/40 text-sm mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────────────────────── */}
      <section id="features" className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <p className="text-center text-[#f5a623] text-sm font-medium uppercase tracking-widest mb-3">
            Capabilities
          </p>
          <h2
            className="text-center text-4xl font-bold text-white mb-14"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Everything Connected.{" "}
            <span className="gradient-text">In Real-Time.</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group p-6 rounded-2xl border border-white/8 bg-brand-surface hover:border-white/20 hover:bg-brand-muted transition-all duration-300"
              >
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3
                  className="font-semibold text-white text-base mb-2"
                  style={{ fontFamily: "Outfit, sans-serif" }}
                >
                  {f.title}
                </h3>
                <p className="text-white/45 text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 px-4 bg-brand-surface/30">
        <div className="max-w-6xl mx-auto">
          <p className="text-center text-[#f5a623] text-sm font-medium uppercase tracking-widest mb-3">
            The Ecosystem
          </p>
          <h2
            className="text-center text-4xl font-bold text-white mb-14"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {HOW_IT_WORKS.map((col) => (
              <div
                key={col.role}
                className={`rounded-2xl border ${col.border} bg-brand-surface p-8 flex flex-col`}
              >
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-3xl">{col.emoji}</span>
                  <div>
                    <div className={`text-xs font-mono ${col.color} mb-0.5`}>Step {col.step}</div>
                    <h3
                      className={`font-bold text-xl ${col.color}`}
                      style={{ fontFamily: "Outfit, sans-serif" }}
                    >
                      {col.role}
                    </h3>
                  </div>
                </div>
                <ol className="space-y-3 flex-1">
                  {col.steps.map((s, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-white/60">
                      <span className={`mt-0.5 w-5 h-5 flex-shrink-0 rounded-full border ${col.border} ${col.color} text-xs flex items-center justify-center font-bold`}>
                        {i + 1}
                      </span>
                      {s}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ────────────────────────────────────────────────────── */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2
            className="text-4xl font-bold text-white mb-6"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            Ready to go live?
          </h2>
          <p className="text-white/50 mb-10">
            Choose your portal and experience the full BusTrack ecosystem.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {PORTALS.map((p) => (
              <a
                key={p.href}
                href={p.href}
                className="px-6 py-3 rounded-xl border border-white/15 bg-brand-surface hover:bg-brand-muted hover:border-white/30 text-white text-sm font-medium transition flex items-center gap-2"
              >
                {p.emoji} {p.label}
              </a>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
