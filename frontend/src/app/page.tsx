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
  },
  {
    href: "/driver",
    icon: Navigation,
    label: "Driver Console",
    tag: "GPS Broadcast",
    desc: "Broadcast your GPS position, receive passenger requests, and navigate your route in real-time.",
  },
  {
    href: "/admin",
    icon: LayoutDashboard,
    label: "Fleet Control",
    tag: "Analytics",
    desc: "Bird's-eye fleet oversight with live analytics, alerts, passenger feedback, and route monitoring.",
  },
];

const FEATURES = [
  { icon: Wifi, title: "Real-Time GPS", desc: "Sub-second location updates via Firebase Realtime Database." },
  { icon: MapPin, title: "On-Demand Stops", desc: "Passengers tap the map to request pickups anywhere on the route." },
  { icon: Navigation, title: "Smart Routing", desc: "Intelligent road-based routing calculates optimal driver paths." },
  { icon: Star, title: "Rider Ratings", desc: "Star ratings and comments collected per trip for quality control." },
  { icon: Bell, title: "Instant Alerts", desc: "Automated notifications for arrivals, request spikes, and deviations." },
  { icon: ShieldCheck, title: "Secure Access", desc: "Firebase-backed authentication and rules at every layer." },
];

const STATS = [
  { value: "50+", label: "Active Routes" },
  { value: "<1s", label: "Update Latency" },
  { value: "3", label: "Unified Apps" },
  { value: "24/7", label: "Monitoring" },
];

export default function HomePage() {
  return (
    <main
      className="min-h-screen overflow-x-hidden"
      style={{ background: "#ffffff", fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif" }}
    >
      <style>{`
        * { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
        .apple-nav-link { color: #1d1d1f; font-size: 14px; font-weight: 400; padding: 0 12px; opacity: 0.7; transition: opacity 0.2s; text-decoration: none; }
        .apple-nav-link:hover { opacity: 1; }
        .portal-card { background: #f5f5f7; border-radius: 18px; padding: 40px; transition: transform 0.3s cubic-bezier(0.25,0.1,0.25,1); text-decoration: none; display: flex; flex-direction: column; }
        .portal-card:hover { transform: scale(1.02); }
        .feature-card { padding: 32px 0; border-bottom: 1px solid #d2d2d7; }
        .cta-btn-primary { display: inline-flex; align-items: center; gap: 8px; background: #0071e3; color: white; padding: 14px 28px; border-radius: 980px; font-size: 15px; font-weight: 500; text-decoration: none; transition: background 0.2s; }
        .cta-btn-primary:hover { background: #0077ed; }
        .cta-btn-secondary { display: inline-flex; align-items: center; gap: 6px; color: #0071e3; font-size: 15px; font-weight: 500; text-decoration: none; transition: opacity 0.2s; }
        .cta-btn-secondary:hover { opacity: 0.7; }
        .cta-btn-secondary::after { content: "›"; font-size: 18px; }
        .dark-section { background: #1d1d1f; }
        .dark-section * { color: #f5f5f7; }
      `}</style>

      {/* ── NAV BAR ─── Apple.com style */}
      <nav style={{ background: "rgba(255,255,255,0.9)", backdropFilter: "saturate(180%) blur(20px)", WebkitBackdropFilter: "saturate(180%) blur(20px)", position: "sticky", top: 0, zIndex: 100, borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
        <div style={{ maxWidth: 980, margin: "0 auto", padding: "0 22px", height: 48, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, textDecoration: "none" }}>
            <img src="/BusLogo.png" alt="BusTrack Logo" style={{ width: 28, height: 28, objectFit: "contain" }} />
            <span style={{ fontSize: 18, fontWeight: 600, color: "#1d1d1f", letterSpacing: "-0.02em" }}>BusTrack</span>
          </div>
          <div style={{ display: "flex", alignItems: "center" }}>
            {[{ label: "Passenger", href: "/passenger" }, { label: "Driver", href: "/driver" }, { label: "Admin", href: "/admin" }].map(l => (
              <a key={l.href} href={l.href} className="apple-nav-link">{l.label}</a>
            ))}
          </div>
          <a href="/passenger" className="cta-btn-primary" style={{ padding: "8px 18px", fontSize: 13 }}>Track My Bus</a>
        </div>
      </nav>

      {/* ── HERO ─── Full-width, dark bottom section like apple.com product pages */}
      <section style={{ background: "#000000", minHeight: "88vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "100px 22px 80px" }}>
        <p style={{ fontSize: 14, fontWeight: 500, color: "#6e6e73", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 20 }}>
          Ahmedabad BRTS — Live
        </p>
        <h1 style={{ fontSize: "clamp(3rem, 8vw, 6rem)", fontWeight: 700, color: "#f5f5f7", letterSpacing: "-0.04em", lineHeight: 1.0, margin: "0 0 28px", maxWidth: 800 }}>
          The Smartest Way<br />to Ride the City.
        </h1>
        <p style={{ fontSize: "clamp(1rem, 2.5vw, 1.4rem)", color: "#86868b", fontWeight: 400, maxWidth: 560, lineHeight: 1.6, marginBottom: 48 }}>
          Real-time bus tracking, on-demand stops, and full fleet oversight. One ecosystem for passengers, drivers, and administrators.
        </p>
        <div style={{ display: "flex", gap: 18, flexWrap: "wrap", justifyContent: "center" }}>
          <a href="/passenger" className="cta-btn-primary">
            <MapPin style={{ width: 16, height: 16 }} />
            Passenger App
          </a>
          <a href="/driver" className="cta-btn-secondary" style={{ color: "#2997ff" }}>
            Driver Console
          </a>
        </div>
      </section>

      {/* ── TAGLINE DIVIDER ─── */}
      <section style={{ background: "#f5f5f7", padding: "80px 22px", textAlign: "center" }}>
        <h2 style={{ fontSize: "clamp(1.8rem, 4vw, 3.2rem)", fontWeight: 600, color: "#1d1d1f", letterSpacing: "-0.03em", maxWidth: 700, margin: "0 auto", lineHeight: 1.15 }}>
          Three portals. One city-wide transit network.
        </h2>
      </section>

      {/* ── PORTAL CARDS ─── */}
      <section style={{ background: "#ffffff", padding: "80px 22px" }}>
        <div style={{ maxWidth: 980, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
          {PORTALS.map((p) => {
            const Icon = p.icon;
            return (
              <a key={p.href} href={p.href} className="portal-card">
                <div style={{ width: 48, height: 48, background: "#000000", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24 }}>
                  <Icon style={{ width: 22, height: 22, color: "#ffffff" }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#6e6e73", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 8, display: "block" }}>{p.tag}</span>
                <h3 style={{ fontSize: 22, fontWeight: 600, color: "#1d1d1f", letterSpacing: "-0.02em", marginBottom: 10 }}>{p.label}</h3>
                <p style={{ fontSize: 15, color: "#6e6e73", lineHeight: 1.6, flex: 1 }}>{p.desc}</p>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#0071e3", fontSize: 15, fontWeight: 500, marginTop: 24 }}>
                  Open App <span style={{ fontSize: 20, lineHeight: 1 }}>›</span>
                </span>
              </a>
            );
          })}
        </div>
      </section>

      {/* ── STATS ─── Apple dark strip */}
      <section className="dark-section" style={{ padding: "60px 22px" }}>
        <div style={{ maxWidth: 980, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 0 }}>
          {STATS.map((s, i) => (
            <div key={s.label} style={{ textAlign: "center", padding: "24px", borderRight: i < 3 ? "1px solid rgba(255,255,255,0.1)" : "none" }}>
              <div style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)", fontWeight: 700, color: "#f5f5f7", letterSpacing: "-0.04em", lineHeight: 1, marginBottom: 8 }}>{s.value}</div>
              <div style={{ fontSize: 13, color: "#86868b", fontWeight: 500, letterSpacing: "0.03em", textTransform: "uppercase" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ─── Clean list like apple tech specs */}
      <section style={{ background: "#ffffff", padding: "80px 22px" }}>
        <div style={{ maxWidth: 740, margin: "0 auto" }}>
          <h2 style={{ fontSize: "clamp(1.8rem, 4vw, 3rem)", fontWeight: 600, color: "#1d1d1f", letterSpacing: "-0.03em", textAlign: "center", marginBottom: 64 }}>
            Built for real cities.<br /><span style={{ color: "#6e6e73" }}>Engineered for reliability.</span>
          </h2>
          <div>
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="feature-card" style={{ borderTop: i === 0 ? "1px solid #d2d2d7" : "none", display: "flex", gap: 32, alignItems: "flex-start" }}>
                  <div style={{ width: 44, height: 44, background: "#1d1d1f", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon style={{ width: 20, height: 20, color: "#ffffff" }} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 17, fontWeight: 600, color: "#1d1d1f", marginBottom: 6, letterSpacing: "-0.01em" }}>{f.title}</h3>
                    <p style={{ fontSize: 15, color: "#6e6e73", lineHeight: 1.6 }}>{f.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ─── */}
      <section style={{ background: "#f5f5f7", padding: "120px 22px", textAlign: "center" }}>
        <h2 style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", fontWeight: 700, color: "#1d1d1f", letterSpacing: "-0.04em", marginBottom: 12, lineHeight: 1.1 }}>
          Ready to ride smarter?
        </h2>
        <p style={{ fontSize: 19, color: "#6e6e73", marginBottom: 48 }}>
          Choose your portal and join Ahmedabad&apos;s live transit network.
        </p>
        <div style={{ display: "flex", gap: 16, justifyContent: "center", flexWrap: "wrap" }}>
          {PORTALS.map((p) => {
            const Icon = p.icon;
            return (
              <a key={p.href} href={p.href} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#1d1d1f", color: "#f5f5f7", padding: "14px 28px", borderRadius: 980, fontSize: 15, fontWeight: 500, textDecoration: "none", transition: "background 0.2s" }}>
                <Icon style={{ width: 16, height: 16 }} />
                {p.label}
              </a>
            );
          })}
        </div>
      </section>

      {/* ── FOOTER ─── */}
      <footer style={{ background: "#f5f5f7", borderTop: "1px solid #d2d2d7", padding: "20px 22px" }}>
        <div style={{ maxWidth: 980, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <p style={{ fontSize: 13, color: "#6e6e73" }}>Copyright © 2025 BusTrack. All rights reserved.</p>
          <div style={{ display: "flex", gap: 24 }}>
            {[{ label: "Passenger", href: "/passenger" }, { label: "Driver", href: "/driver" }, { label: "Admin", href: "/admin" }].map(l => (
              <a key={l.href} href={l.href} style={{ fontSize: 13, color: "#6e6e73", textDecoration: "none" }}>{l.label}</a>
            ))}
          </div>
        </div>
      </footer>
    </main>
  );
}
