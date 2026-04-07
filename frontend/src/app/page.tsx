import type { Metadata } from "next";
import { Bus, MapPin, Navigation, LayoutDashboard, Wifi, Star, Bell, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "BusTrack – Ahmedabad BRTS Live Tracking",
  description: "Real-time bus tracking, ride-hailing, and fleet management for Ahmedabad BRTS.",
};

const PORTALS = [
  {
    href: "/passenger",
    icon: MapPin,
    label: "Passenger App",
    tag: "Live Tracking",
    desc: "Track live bus positions, see ETAs, and request on-demand pickups directly from the map.",
    accentLight: "#2563EB",
    accentDark: "#1d4ed8",
    badgeColor: "#1e40af",
    iconBg: "linear-gradient(145deg, #3b82f6, #1d4ed8)",
  },
  {
    href: "/driver",
    icon: Navigation,
    label: "Driver Console",
    tag: "GPS Broadcast",
    desc: "Broadcast your GPS position, receive passenger requests, and navigate your route in real-time.",
    accentLight: "#d97706",
    accentDark: "#b45309",
    badgeColor: "#92400e",
    iconBg: "linear-gradient(145deg, #f59e0b, #d97706)",
  },
  {
    href: "/admin",
    icon: LayoutDashboard,
    label: "Fleet Control",
    tag: "Analytics",
    desc: "Bird's-eye fleet oversight with live analytics, alerts, passenger feedback, and route monitoring.",
    accentLight: "#059669",
    accentDark: "#047857",
    badgeColor: "#065f46",
    iconBg: "linear-gradient(145deg, #10b981, #059669)",
  },
];

const FEATURES = [
  { icon: Wifi, title: "Real-Time GPS", desc: "Sub-second location updates via Firebase Realtime Database. Zero servers, maximum reliability." },
  { icon: MapPin, title: "On-Demand Stops", desc: "Passengers tap the map to request pickups anywhere on the route, instantly." },
  { icon: Navigation, title: "Smart Routing", desc: "Intelligent road-based routing calculates optimal driver paths across the city." },
  { icon: Star, title: "Rider Ratings", desc: "Star ratings and comments collected per trip, enabling quality control at scale." },
  { icon: Bell, title: "Instant Alerts", desc: "Automated notifications for depot arrivals, request spikes, and off-route detection." },
  { icon: ShieldCheck, title: "Secure & Reliable", desc: "Firebase-backed authentication and rules ensuring only authorized access at every layer." },
];

const STATS = [
  { value: "50+", label: "Active Routes" },
  { value: "<1s", label: "Update Latency" },
  { value: "3", label: "Unified Portals" },
  { value: "24/7", label: "Live Monitoring" },
];

export default function HomePage() {
  return (
    <main
      className="min-h-screen font-sans overflow-x-hidden"
      style={{
        background: `
          linear-gradient(180deg, #e8dcc8 0%, #d4c5a9 40%, #c8b896 100%)
        `,
        fontFamily: "'Georgia', 'Times New Roman', serif",
      }}
    >
      <style>{`
        .nav-link:hover {
          background: rgba(255,255,255,0.07) !important;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 0.5rem;
        }
        .portal-card:hover .portal-footer-btn {
          filter: brightness(1.1);
        }
      `}</style>
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-30"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='4' height='4' viewBox='0 0 4 4' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 3h1v1H1V3zm2-2h1v1H3V1z' fill='%23000000' fill-opacity='0.08' fill-rule='evenodd'/%3E%3C/svg%3E")`,
        }}
      />

      {/* ── NAVIGATION BAR ────────────────────────────────────────────── */}
      <nav
        className="relative z-20 w-full"
        style={{
          background: "linear-gradient(180deg, #4a3728 0%, #2c1f15 50%, #1a1008 100%)",
          borderBottom: "1px solid #6b4c35",
          boxShadow: "0 4px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)",
        }}
      >
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: "linear-gradient(145deg, #f59e0b, #d97706)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.3)",
              }}
            >
              <Bus className="w-5 h-5 text-white" />
            </div>
            <span
              className="text-xl font-bold tracking-tight"
              style={{
                color: "#f5e6d0",
                textShadow: "0 1px 2px rgba(0,0,0,0.5)",
                fontFamily: "'Georgia', serif",
              }}
            >
              BusTrack
            </span>
          </div>
          <div className="flex items-center gap-2">
            {[
              { label: "Passenger", href: "/passenger" },
              { label: "Driver", href: "/driver" },
              { label: "Admin", href: "/admin" },
            ].map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="nav-link px-4 py-2 rounded-lg text-sm font-medium transition-all"
                style={{
                  color: "#d4b896",
                  textShadow: "0 1px 2px rgba(0,0,0,0.5)",
                }}
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────────────────────── */}
      <section
        className="relative z-10 py-24 px-6 flex flex-col items-center text-center"
      >
        {/* Thick embossed badge */}
        <div
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full mb-10"
          style={{
            background: "linear-gradient(180deg, #8b6914 0%, #6b4e0a 100%)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2), inset 0 -1px 0 rgba(0,0,0,0.3)",
            border: "1px solid #4a3508",
          }}
        >
          <div className="w-2 h-2 rounded-full bg-amber-300 shadow-[0_0_6px_2px_rgba(251,191,36,0.5)]" />
          <span
            className="text-xs font-bold uppercase tracking-widest"
            style={{ color: "#fde68a", textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}
          >
            Live for Ahmedabad BRTS
          </span>
        </div>

        {/* Main headline – deeply embossed into paper */}
        <h1
          className="text-[clamp(3rem,9vw,6.5rem)] font-bold leading-[1.0] tracking-tight mb-8 max-w-4xl"
          style={{
            fontFamily: "'Georgia', 'Times New Roman', serif",
            color: "#2c1a08",
            textShadow: "0 2px 0 rgba(255,255,255,0.4), 0 -1px 0 rgba(0,0,0,0.2)",
          }}
        >
          Ahmedabad&apos;s<br />
          <span
            style={{
              background: "linear-gradient(180deg, #1e40af 0%, #1d4ed8 50%, #1e3a8a 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
            }}
          >
            Smartest Transit
          </span>
        </h1>

        <p
          className="text-lg md:text-xl max-w-2xl leading-relaxed mb-14"
          style={{
            color: "#4a3520",
            textShadow: "0 1px 0 rgba(255,255,255,0.5)",
            fontFamily: "'Georgia', serif",
          }}
        >
          Real-time GPS tracking, on-demand stops, and complete fleet oversight — seamlessly
          connecting passengers, drivers, and administrators across the city.
        </p>

        {/* Chunky physical CTA button */}
        <a
          href="/passenger"
          className="group inline-flex items-center gap-3 px-10 py-5 rounded-2xl text-base font-bold tracking-wide transition-all duration-150 relative"
          style={{
            background: "linear-gradient(180deg, #2563eb 0%, #1d4ed8 40%, #1e40af 100%)",
            color: "#ffffff",
            boxShadow: "0 8px 0 #1e3a8a, 0 10px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.25)",
            border: "1px solid #1e3a8a",
            textShadow: "0 1px 2px rgba(0,0,0,0.4)",
            fontFamily: "'Georgia', serif",
          }}
        >
          <MapPin className="w-5 h-5" />
          Track My Bus
        </a>
      </section>

      {/* ── STATS TICKER BAR ─────────────────────────────────────────────── */}
      <div className="relative z-10 mx-6 md:mx-auto max-w-5xl mb-16">
        <div
          className="grid grid-cols-2 md:grid-cols-4 divide-x"
          style={{
            background: "linear-gradient(180deg, #3d2b1a 0%, #2a1c0e 100%)",
            boxShadow: "0 6px 20px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)",
            borderRadius: "1.5rem",
            border: "1px solid #5a3d28",
          }}
        >
          {STATS.map((stat) => (
            <div key={stat.label} className="py-8 px-6 flex flex-col items-center text-center">
              <span
                className="text-4xl font-bold mb-1"
                style={{
                  fontFamily: "'Georgia', serif",
                  color: "#f5d06a",
                  textShadow: "0 2px 4px rgba(0,0,0,0.5), 0 -1px 0 rgba(0,0,0,0.3)",
                }}
              >
                {stat.value}
              </span>
              <span
                className="text-[10px] font-bold uppercase tracking-widest"
                style={{ color: "#a07850" }}
              >
                {stat.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── PORTAL CARDS ─────────────────────────────────────────────────── */}
      <section className="relative z-10 px-6 max-w-6xl mx-auto mb-20">
        <div className="text-center mb-14">
          <h2
            className="text-4xl font-bold mb-4"
            style={{ fontFamily: "'Georgia', serif", color: "#2c1a08", textShadow: "0 2px 0 rgba(255,255,255,0.4)" }}
          >
            Choose Your Portal
          </h2>
          <p style={{ color: "#6b4520" }}>
            Three unified apps. One seamless network.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {PORTALS.map((p) => {
            const Icon = p.icon;
            return (
              <a
                key={p.href}
                href={p.href}
                className="group flex flex-col rounded-3xl overflow-hidden transition-all duration-200 hover:-translate-y-1"
                style={{
                  background: "linear-gradient(180deg, #fcf8f0 0%, #f0e8d5 100%)",
                  boxShadow: "0 10px 0 #b8a080, 0 12px 30px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.9)",
                  border: "1px solid #c8b090",
                }}
              >
                {/* Card top accent stripe */}
                <div style={{ background: `linear-gradient(90deg, ${p.accentLight}, ${p.accentDark})`, height: "5px" }} />

                <div className="p-8 flex flex-col flex-1">
                  {/* Icon badge */}
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
                    style={{
                      background: p.iconBg,
                      boxShadow: "0 4px 10px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.3)",
                    }}
                  >
                    <Icon className="w-8 h-8 text-white" />
                  </div>

                  {/* Tag */}
                  <span
                    className="inline-block self-start px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-4"
                    style={{
                      background: p.badgeColor,
                      color: "#ffffff",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.15), 0 2px 4px rgba(0,0,0,0.25)",
                    }}
                  >
                    {p.tag}
                  </span>

                  <h3
                    className="text-2xl font-bold mb-3"
                    style={{ color: "#1a1008", fontFamily: "'Georgia', serif", textShadow: "0 1px 0 rgba(255,255,255,0.7)" }}
                  >
                    {p.label}
                  </h3>

                  <p className="text-sm leading-relaxed flex-1" style={{ color: "#5a3d20" }}>
                    {p.desc}
                  </p>

                  {/* Physical button-like CTA footer */}
                  <div
                    className="mt-8 py-3 px-6 rounded-xl flex items-center justify-between text-sm font-bold transition-all"
                    style={{
                      background: `linear-gradient(180deg, ${p.accentLight} 0%, ${p.accentDark} 100%)`,
                      color: "#ffffff",
                      boxShadow: `0 4px 0 ${p.badgeColor}, 0 6px 10px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.2)`,
                      textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                    }}
                  >
                    <span>Launch Portal</span>
                    <span className="text-lg leading-none">→</span>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      </section>

      {/* ── FEATURES ─────────────────────────────────────────────────────── */}
      <section className="relative z-10 px-6 max-w-6xl mx-auto mb-24">
        <div className="text-center mb-14">
          <h2
            className="text-4xl font-bold mb-4"
            style={{ fontFamily: "'Georgia', serif", color: "#2c1a08", textShadow: "0 2px 0 rgba(255,255,255,0.4)" }}
          >
            Built for Real Cities
          </h2>
          <div
            className="w-20 h-1 mx-auto rounded-full"
            style={{ background: "linear-gradient(90deg, #d97706, #b45309)", boxShadow: "0 2px 6px rgba(0,0,0,0.25)" }}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="p-8 rounded-2xl flex flex-col gap-4"
                style={{
                  background: "linear-gradient(160deg, #faf5eb 0%, #f0e8d0 100%)",
                  boxShadow: "0 4px 0 #c0a878, 0 6px 20px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.9)",
                  border: "1px solid #d4b884",
                }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{
                    background: "linear-gradient(145deg, #374151, #1f2937)",
                    boxShadow: "0 3px 8px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.15)",
                  }}
                >
                  <Icon className="w-5 h-5 text-amber-300" />
                </div>
                <h3
                  className="text-lg font-bold"
                  style={{ color: "#1a1008", fontFamily: "'Georgia', serif", textShadow: "0 1px 0 rgba(255,255,255,0.6)" }}
                >
                  {f.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: "#5a3d20" }}>
                  {f.desc}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── CTA BANNER ───────────────────────────────────────────────────── */}
      <section className="relative z-10 px-6 max-w-4xl mx-auto mb-24">
        <div
          className="rounded-3xl p-14 flex flex-col items-center text-center relative overflow-hidden"
          style={{
            background: "linear-gradient(160deg, #1e3a5f 0%, #1a2f50 50%, #0f1e38 100%)",
            boxShadow: "0 12px 0 #0a1428, 0 16px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)",
            border: "1px solid #1e3a5f",
          }}
        >
          {/* Top shine */}
          <div
            className="absolute top-0 left-0 right-0 h-px"
            style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)" }}
          />

          <h2
            className="text-4xl font-bold mb-5"
            style={{
              fontFamily: "'Georgia', serif",
              color: "#f5e6c8",
              textShadow: "0 2px 4px rgba(0,0,0,0.5)",
            }}
          >
            Experience Modern Transit.
          </h2>
          <p className="mb-10 max-w-xl text-lg" style={{ color: "#9db4cc", fontFamily: "'Georgia', serif" }}>
            Join Ahmedabad&apos;s most advanced BRTS tracking platform. Choose your role and get started in seconds.
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            {PORTALS.map((p) => {
              const Icon = p.icon;
              return (
                <a
                  key={p.href}
                  href={p.href}
                  className="inline-flex items-center gap-3 px-7 py-4 rounded-xl font-bold text-sm transition-all duration-150 hover:-translate-y-0.5"
                  style={{
                    background: `linear-gradient(180deg, ${p.accentLight} 0%, ${p.accentDark} 100%)`,
                    color: "#ffffff",
                    boxShadow: `0 5px 0 ${p.badgeColor}, 0 7px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.2)`,
                    border: `1px solid ${p.badgeColor}`,
                    textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                    fontFamily: "'Georgia', serif",
                  }}
                >
                  <Icon className="w-4 h-4" />
                  {p.label}
                </a>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
      <footer
        className="relative z-10 py-8 text-center"
        style={{
          background: "linear-gradient(180deg, #2c1f15 0%, #1a1008 100%)",
          borderTop: "1px solid #4a3020",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
        }}
      >
        <p className="text-sm" style={{ color: "#7a5a38", textShadow: "0 1px 0 rgba(0,0,0,0.4)" }}>
          © 2025 BusTrack · Ahmedabad BRTS Live Tracking Platform
        </p>
      </footer>
    </main>
  );
}
