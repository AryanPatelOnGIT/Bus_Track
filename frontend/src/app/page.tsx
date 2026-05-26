'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  Shield, Truck, MapPin, Cpu, Database, Monitor,
  ArrowRight, LogIn, LogOut, User,
} from 'lucide-react';

export default function Home() {
  const { user, userData, signIn, signOut, loading } = useAuth();
  const router = useRouter();
  const [signingIn, setSigningIn] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [explicitSignIn, setExplicitSignIn] = useState(false);

  // Auto-redirect after successful sign-in
  useEffect(() => {
    if (!loading && explicitSignIn && user) {
      if (userData) {
        router.push(`/${userData.role}`);
      } else if (user) {
        // User exists but no Firestore profile yet
        router.push('/auth');
      }
    }
  }, [user, userData, loading, explicitSignIn, router]);

  const handleSignIn = async () => {
    setSigningIn(true);
    setExplicitSignIn(true);
    try {
      await signIn();
    } catch (error) {
      console.error(error);
      setSigningIn(false);
      setExplicitSignIn(false);
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } finally {
      setSigningOut(false);
    }
  };

  // Show a minimal loading bar at the very top while Firebase resolves session
  const showLoadingBar = loading;

  return (
    <main className="min-h-screen bg-[#0A0A0A]">

      {/* Thin loading bar across the top */}
      {showLoadingBar && (
        <div className="fixed top-0 left-0 w-full h-[2px] z-50 overflow-hidden">
          <div
            className="h-full bg-[#F5F5F5] animate-pulse"
            style={{ width: '60%', animation: 'loading-bar 1.4s ease-in-out infinite' }}
          />
        </div>
      )}

      {/* ── HEADER ── */}
      <header className="fixed top-0 w-full h-[56px] bg-[#0A0A0A]/90 backdrop-blur-sm border-b border-[#1A1A1A] z-40 flex items-center justify-between px-6">
        <span className="font-[family-name:var(--font-dm-mono)] text-base text-[#F5F5F5] tracking-tight">
          BUS TRACK
        </span>

        {/* Auth state in header */}
        {!loading && (
          <>
            {user ? (
              <div className="flex items-center gap-3">
                {/* Avatar + name */}
                <div className="flex items-center gap-2">
                  {user.photoURL ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'User'}
                      width={28}
                      height={28}
                      className="rounded-full border border-[#333333]"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-[#222222] flex items-center justify-center">
                      <User size={14} className="text-[#888888]" />
                    </div>
                  )}
                  <span className="hidden sm:block font-[family-name:var(--font-inter)] text-xs text-[#888888]">
                    {user.displayName?.split(' ')[0]}
                    {userData?.role && (
                      <span className="ml-1 text-[#555555]">· {userData.role}</span>
                    )}
                  </span>
                </div>

                <button
                  onClick={handleSignOut}
                  disabled={signingOut}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#333333] text-[#888888] hover:text-[#F5F5F5] hover:bg-[#1A1A1A] transition-colors font-[family-name:var(--font-dm-mono)] text-xs disabled:opacity-50 cursor-pointer"
                >
                  <LogOut size={13} />
                  {signingOut ? 'Signing out...' : 'Sign Out'}
                </button>
              </div>
            ) : (
              <button
                onClick={handleSignIn}
                disabled={signingIn}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#333333] text-[#F5F5F5] bg-[#141414] hover:bg-[#1E1E1E] transition-colors font-[family-name:var(--font-dm-mono)] text-xs disabled:opacity-50 cursor-pointer"
              >
                <LogIn size={13} />
                {signingIn ? 'Signing in...' : 'Sign In'}
              </button>
            )}
          </>
        )}
      </header>

      {/* ── HERO ── */}
      <section className="min-h-screen flex flex-col items-center justify-center px-6 pt-[56px]">
        <div className="text-center max-w-2xl">
          <p className="font-[family-name:var(--font-dm-mono)] text-xs text-[#555555] tracking-widest uppercase mb-6">
            Real-time Fleet Tracking
          </p>
          <h1 className="font-[family-name:var(--font-dm-mono)] text-5xl sm:text-7xl font-medium text-[#F5F5F5] tracking-tight leading-none mb-6">
            BUS TRACK
          </h1>
          <p className="font-[family-name:var(--font-inter)] text-base text-[#888888] mb-10 max-w-md mx-auto">
            Live GPS tracking for every campus bus. Know exactly where your bus is, every second.
          </p>

          {/* Primary CTA */}
          {loading ? (
            <div className="flex justify-center">
              <div className="w-[200px] h-[52px] bg-[#141414] rounded-lg animate-pulse" />
            </div>
          ) : user ? (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => router.push(userData ? `/${userData.role}` : '/auth')}
                className="flex items-center gap-2 bg-[#F5F5F5] text-[#0A0A0A] font-[family-name:var(--font-dm-mono)] font-semibold text-sm px-8 py-3.5 rounded-lg hover:bg-[#E8E8E8] active:scale-95 transition-all duration-150 cursor-pointer"
              >
                Open Dashboard
                <ArrowRight size={16} />
              </button>
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className="font-[family-name:var(--font-inter)] text-sm text-[#555555] hover:text-[#888888] transition-colors cursor-pointer disabled:opacity-50"
              >
                {signingOut ? 'Signing out...' : 'or sign out'}
              </button>
            </div>
          ) : (
            <button
              onClick={handleSignIn}
              disabled={signingIn}
              className="group inline-flex items-center gap-3 bg-[#1A1A1A] border border-[#333333] text-[#F5F5F5] font-[family-name:var(--font-dm-mono)] text-sm px-8 py-3.5 rounded-lg hover:bg-[#222222] hover:border-[#555555] active:scale-95 transition-all duration-150 disabled:opacity-50 cursor-pointer"
            >
              {/* Google "G" logo SVG */}
              {!signingIn && (
                <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              )}
              {signingIn ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-[#555555] border-t-[#F5F5F5] rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                'Continue with Google'
              )}
            </button>
          )}
        </div>
      </section>

      {/* ── FEATURES GRID ── */}
      <section className="max-w-4xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#0F0F0F] border border-[#1E1E1E] rounded-xl p-6 hover:border-[#333333] transition-colors">
            <Shield size={20} className="text-[#555555] mb-4" />
            <h3 className="font-[family-name:var(--font-dm-mono)] text-sm text-[#F5F5F5] mb-2">Admin Control</h3>
            <p className="font-[family-name:var(--font-inter)] text-xs text-[#555555] leading-relaxed">
              Manage routes, assign drivers, and oversee your entire fleet from one dashboard.
            </p>
          </div>
          <div className="bg-[#0F0F0F] border border-[#1E1E1E] rounded-xl p-6 hover:border-[#333333] transition-colors">
            <Truck size={20} className="text-[#555555] mb-4" />
            <h3 className="font-[family-name:var(--font-dm-mono)] text-sm text-[#F5F5F5] mb-2">Driver Interface</h3>
            <p className="font-[family-name:var(--font-inter)] text-xs text-[#555555] leading-relaxed">
              View assigned routes, navigate stops, and communicate with passengers in real time.
            </p>
          </div>
          <div className="bg-[#0F0F0F] border border-[#1E1E1E] rounded-xl p-6 hover:border-[#333333] transition-colors">
            <MapPin size={20} className="text-[#555555] mb-4" />
            <h3 className="font-[family-name:var(--font-dm-mono)] text-sm text-[#F5F5F5] mb-2">Passenger Tracking</h3>
            <p className="font-[family-name:var(--font-inter)] text-xs text-[#555555] leading-relaxed">
              Track any bus live, see arrival times, and message your driver directly.
            </p>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section className="max-w-3xl mx-auto px-6 pb-24">
        <h2 className="font-[family-name:var(--font-dm-mono)] text-sm text-[#555555] text-center tracking-widest uppercase mb-10">
          How It Works
        </h2>
        <div className="flex flex-col md:flex-row items-center justify-center gap-8 md:gap-4">
          <div className="flex flex-col items-center text-center flex-1">
            <div className="w-10 h-10 bg-[#141414] border border-[#222222] rounded-lg flex items-center justify-center mb-3">
              <Cpu size={18} className="text-[#888888]" />
            </div>
            <h4 className="font-[family-name:var(--font-dm-mono)] text-xs text-[#F5F5F5] mb-1">GPS Hardware</h4>
            <p className="font-[family-name:var(--font-inter)] text-xs text-[#555555] max-w-[160px]">
              ESP32 + GNSS modules track each bus in real time
            </p>
          </div>
          <ArrowRight size={16} className="text-[#2A2A2A] hidden md:block flex-shrink-0" />
          <div className="flex flex-col items-center text-center flex-1">
            <div className="w-10 h-10 bg-[#141414] border border-[#222222] rounded-lg flex items-center justify-center mb-3">
              <Database size={18} className="text-[#888888]" />
            </div>
            <h4 className="font-[family-name:var(--font-dm-mono)] text-xs text-[#F5F5F5] mb-1">Cloud Sync</h4>
            <p className="font-[family-name:var(--font-inter)] text-xs text-[#555555] max-w-[160px]">
              Location streams to Firebase every second
            </p>
          </div>
          <ArrowRight size={16} className="text-[#2A2A2A] hidden md:block flex-shrink-0" />
          <div className="flex flex-col items-center text-center flex-1">
            <div className="w-10 h-10 bg-[#141414] border border-[#222222] rounded-lg flex items-center justify-center mb-3">
              <Monitor size={18} className="text-[#888888]" />
            </div>
            <h4 className="font-[family-name:var(--font-dm-mono)] text-xs text-[#F5F5F5] mb-1">Live Map</h4>
            <p className="font-[family-name:var(--font-inter)] text-xs text-[#555555] max-w-[160px]">
              Passengers watch buses move on an interactive dark map
            </p>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-[#111111] px-6 py-6 flex items-center justify-between max-w-4xl mx-auto">
        <span className="font-[family-name:var(--font-dm-mono)] text-xs text-[#333333]">BUS TRACK</span>
        <span className="font-[family-name:var(--font-inter)] text-xs text-[#333333]">Built for campus transit</span>
      </footer>

      <style jsx>{`
        @keyframes loading-bar {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(60%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </main>
  );
}
