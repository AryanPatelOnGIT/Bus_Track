'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Shield, Truck, MapPin, Cpu, Database, Monitor, ArrowRight, LogIn } from 'lucide-react';
import LoadingScreen from '@/components/shared/LoadingScreen';

export default function Home() {
  const { user, userData, signIn, loading } = useAuth();
  const router = useRouter();
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    if (user && !loading) {
      if (userData) {
        router.push(`/${userData.role}`);
      } else {
        router.push('/auth');
      }
    }
  }, [user, userData, loading, router]);

  const handleSignIn = async () => {
    setSigningIn(true);
    try {
      await signIn();
    } catch (error) {
      console.error(error);
      setSigningIn(false);
    }
  };

  if (user && !loading) {
    return <LoadingScreen />;
  }

  return (
    <main className="min-h-screen bg-[#0A0A0A]">
      {/* Hero Section */}
      <section className="min-h-[70vh] flex flex-col items-center justify-center px-6">
        <h1 className="font-[family-name:var(--font-dm-mono)] text-5xl md:text-7xl font-medium text-[#F5F5F5] tracking-tight">
          BUS TRACK
        </h1>
        <p className="font-[family-name:var(--font-inter)] text-lg text-[#888888] mt-4 text-center">
          Real-time college bus tracking system
        </p>
        <div className="w-[60px] h-[1px] bg-[#222222] mt-6"></div>
      </section>

      {/* Features Grid */}
      <section className="max-w-4xl mx-auto px-6 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: Admin */}
          <div className="bg-[#141414] border border-[#222222] rounded-lg p-6">
            <Shield size={22} className="text-[#888888] mb-4" />
            <h3 className="font-[family-name:var(--font-dm-mono)] text-base text-[#F5F5F5] mb-2">Admin Control</h3>
            <p className="font-[family-name:var(--font-inter)] text-sm text-[#888888]">
              Manage routes, assign drivers, and oversee the entire fleet from a single dashboard.
            </p>
          </div>
          {/* Card 2: Driver */}
          <div className="bg-[#141414] border border-[#222222] rounded-lg p-6">
            <Truck size={22} className="text-[#888888] mb-4" />
            <h3 className="font-[family-name:var(--font-dm-mono)] text-base text-[#F5F5F5] mb-2">Driver Interface</h3>
            <p className="font-[family-name:var(--font-inter)] text-sm text-[#888888]">
              View your assigned route, navigate stops, and communicate with passengers in real time.
            </p>
          </div>
          {/* Card 3: Passenger */}
          <div className="bg-[#141414] border border-[#222222] rounded-lg p-6">
            <MapPin size={22} className="text-[#888888] mb-4" />
            <h3 className="font-[family-name:var(--font-dm-mono)] text-base text-[#F5F5F5] mb-2">Passenger Tracking</h3>
            <p className="font-[family-name:var(--font-inter)] text-sm text-[#888888]">
              Track any bus on a live map, see arrival times, and message your driver directly.
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="max-w-3xl mx-auto px-6 pb-16">
        <h2 className="font-[family-name:var(--font-dm-mono)] text-xl text-[#F5F5F5] text-center mb-10">How It Works</h2>
        <div className="flex flex-col md:flex-row items-center justify-center gap-8">
          <div className="flex flex-col items-center text-center">
            <Cpu size={28} className="text-[#888888] mb-3" />
            <h4 className="font-[family-name:var(--font-dm-mono)] text-sm text-[#F5F5F5] mb-1">GPS Hardware</h4>
            <p className="font-[family-name:var(--font-inter)] text-xs text-[#888888] max-w-[180px]">
              ESP32 modules with GNSS track each bus in real time
            </p>
          </div>
          <ArrowRight size={20} className="text-[#333333] hidden md:block" />
          <div className="flex flex-col items-center text-center">
            <Database size={28} className="text-[#888888] mb-3" />
            <h4 className="font-[family-name:var(--font-dm-mono)] text-sm text-[#F5F5F5] mb-1">Cloud Sync</h4>
            <p className="font-[family-name:var(--font-inter)] text-xs text-[#888888] max-w-[180px]">
              Location data streams to Firebase every second
            </p>
          </div>
          <ArrowRight size={20} className="text-[#333333] hidden md:block" />
          <div className="flex flex-col items-center text-center">
            <Monitor size={28} className="text-[#888888] mb-3" />
            <h4 className="font-[family-name:var(--font-dm-mono)] text-sm text-[#F5F5F5] mb-1">Live Map</h4>
            <p className="font-[family-name:var(--font-inter)] text-xs text-[#888888] max-w-[180px]">
              Passengers see buses move on a dark-themed interactive map
            </p>
          </div>
        </div>
      </section>

      {/* CTA Button */}
      <section className="flex justify-center pb-16">
        <button
          onClick={handleSignIn}
          disabled={signingIn || loading}
          className="flex items-center gap-2 bg-[#1E1E1E] border border-[#333333] text-[#F5F5F5] font-[family-name:var(--font-dm-mono)] text-sm px-8 py-3.5 rounded-lg hover:bg-[#2A2A2A] transition-colors duration-200 disabled:opacity-50 cursor-pointer"
        >
          <LogIn size={18} />
          {signingIn || loading ? 'Please wait...' : 'Sign In with Google'}
        </button>
      </section>

      {/* Footer */}
      <footer className="text-center pb-8">
        <p className="font-[family-name:var(--font-inter)] text-xs text-[#555555]">Built for campus transit</p>
      </footer>
    </main>
  );
}
