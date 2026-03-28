import Link from "next/link";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/passenger", label: "Passenger App" },
  { href: "/driver", label: "Driver App" },
  { href: "/admin", label: "Admin Dashboard" },
];

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-brand-dark/90">
      <div className="max-w-7xl mx-auto px-6 py-10 grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Brand */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🚌</span>
            <span className="font-display font-bold text-lg text-white">
              Bus<span className="text-[#f5a623]">Track</span>
            </span>
          </div>
          <p className="text-white/40 text-sm leading-relaxed">
            Real-time bus tracking for Ahmedabad BRTS. Live for passengers,
            drivers, and administrators.
          </p>
        </div>

        {/* Links */}
        <div>
          <h3 className="text-xs text-white/30 uppercase tracking-widest mb-3">Portals</h3>
          <ul className="space-y-2">
            {LINKS.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="text-sm text-white/50 hover:text-white transition"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Badge */}
        <div className="flex flex-col justify-between">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#f5a623]/30 bg-[#f5a623]/10 text-[#f5a623] text-xs font-medium w-fit">
            🏙️ Built for Ahmedabad BRTS
          </div>
          <p className="text-white/25 text-xs mt-6">
            © {new Date().getFullYear()} BusTrack. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
