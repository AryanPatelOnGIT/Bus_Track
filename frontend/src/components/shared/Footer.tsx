import Link from "next/link";
import { Bus, Globe, Send, Mail } from "lucide-react";

export default function Footer() {
  return (
    <footer className="footer-bg border-t border-white/5 pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          {/* Brand & Mission */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <Bus className="w-6 h-6 text-white" />
              <span className="font-display font-bold text-2xl tracking-tighter text-white">
                BusTrack
              </span>
            </div>
            <p className="text-white/40 text-sm leading-relaxed max-w-sm">
              Modernizing Ahmedabad&apos;s transit infrastructure through live GPS tracking, 
              interactive navigation, and real-time fleet analytics.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-6 uppercase tracking-widest">Navigation</h4>
            <ul className="space-y-4">
              <li><Link href="/passenger" className="text-white/40 hover:text-white transition text-sm">Passenger App</Link></li>
              <li><Link href="/driver" className="text-white/40 hover:text-white transition text-sm">Driver Portal</Link></li>
              <li><Link href="/admin" className="text-white/40 hover:text-white transition text-sm">Admin Control</Link></li>
            </ul>
          </div>

          {/* Contact & Social */}
          <div>
            <h4 className="text-white font-semibold text-sm mb-6 uppercase tracking-widest">Connect</h4>
            <div className="flex gap-4 mb-6">
              <Link href="#" className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all">
                <Globe className="w-4 h-4" />
              </Link>
              <Link href="#" className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all">
                <Send className="w-4 h-4" />
              </Link>
              <Link href="mailto:contact@bustrack.in" className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-all">
                <Mail className="w-4 h-4" />
              </Link>
            </div>
            <div className="text-white/30 text-xs font-mono">contact@bustrack.in</div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-white/20">
          <p>© 2026 BusTrack Ahmedabad. Built for Smart Mobility.</p>
          <div className="flex gap-6">
            <Link href="#" className="hover:text-white/40 transition">Privacy Policy</Link>
            <Link href="#" className="hover:text-white/40 transition">Terms of Service</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
