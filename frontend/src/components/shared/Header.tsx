"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bus, LayoutDashboard, Compass, Map, User } from "lucide-react";

const NAV_LINKS = [
  { href: "/", label: "Home", icon: Compass },
  { href: "/passenger", label: "Passenger", icon: Map },
  { href: "/driver", label: "Driver", icon: Bus },
  { href: "/admin", label: "Admin", icon: LayoutDashboard },
];

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-[100] w-full border-b border-white/5 bg-brand-dark/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand Logo - Removed Emoji */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center transition-transform group-hover:scale-105">
            <Bus className="w-5 h-5 text-brand-dark" />
          </div>
          <span className="font-display font-bold text-xl tracking-tight text-white">
            Bus<span className="text-white/40">Track</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200
                  ${isActive 
                    ? "bg-white text-brand-dark shadow-sm" 
                    : "text-white/50 hover:text-white hover:bg-white/5"}
                `}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-brand-dark" : "text-white/40"}`} />
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* User / Action Area */}
        <div className="flex items-center gap-3">
          <button className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-surface border border-white/5 text-xs font-semibold text-white/70 hover:text-white hover:bg-brand-muted transition-colors">
            <User className="w-3.5 h-3.5" />
            Sign In
          </button>
          
          <button className="md:hidden p-2 rounded-xl bg-white/5 text-white/50">
             <MenuIcon />
          </button>
        </div>
      </div>
    </header>
  );
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="3" y1="12" x2="21" y2="12"></line>
      <line x1="3" y1="6" x2="21" y2="6"></line>
      <line x1="3" y1="18" x2="21" y2="18"></line>
    </svg>
  );
}
