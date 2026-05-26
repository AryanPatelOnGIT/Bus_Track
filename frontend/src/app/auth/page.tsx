'use client';

import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createUser } from '@/lib/db';
import { Shield, Truck, MapPin } from 'lucide-react';
import LoadingScreen from '@/components/shared/LoadingScreen';

export default function AuthPage() {
  const { user, userData, loading } = useAuth();
  const router = useRouter();
  const [selecting, setSelecting] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/');
      } else if (userData) {
        router.push(`/${userData.role}`);
      }
    }
  }, [user, userData, loading, router]);

  const handleRoleSelect = async (role: 'admin' | 'driver' | 'passenger') => {
    if (!user) return;
    setSelecting(true);
    try {
      await createUser(user.uid, {
        name: user.displayName || 'Unknown',
        email: user.email || '',
        photoURL: user.photoURL || '',
        role,
        vehicleId: null,
        assignedRouteIds: [],
      });
      router.push(`/${role}`);
    } catch (error) {
      console.error('Error selecting role', error);
      setSelecting(false);
    }
  };

  if (loading || !user || selecting || userData) {
    return <LoadingScreen />;
  }

  return (
    <main className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center px-6">
      <h1 className="font-[family-name:var(--font-dm-mono)] text-2xl text-[#F5F5F5] mb-2">
        Select Your Role
      </h1>
      <p className="font-[family-name:var(--font-inter)] text-sm text-[#888888] mb-8 text-center">
        This is a one-time setup. Choose how you will use BUS TRACK.
      </p>
      <div className="flex flex-col gap-4 w-full max-w-sm">
        {/* Admin card */}
        <button onClick={() => handleRoleSelect('admin')} className="bg-[#141414] border border-[#222222] rounded-lg p-5 text-left hover:border-[#333333] hover:bg-[#1A1A1A] transition-colors duration-200 cursor-pointer">
          <Shield size={22} className="text-[#888888] mb-3" />
          <h3 className="font-[family-name:var(--font-dm-mono)] text-base text-[#F5F5F5] mb-1">I am an Admin</h3>
          <p className="font-[family-name:var(--font-inter)] text-sm text-[#888888]">Manage fleet, routes, and driver assignments</p>
        </button>
        {/* Driver card */}
        <button onClick={() => handleRoleSelect('driver')} className="bg-[#141414] border border-[#222222] rounded-lg p-5 text-left hover:border-[#333333] hover:bg-[#1A1A1A] transition-colors duration-200 cursor-pointer">
          <Truck size={22} className="text-[#888888] mb-3" />
          <h3 className="font-[family-name:var(--font-dm-mono)] text-base text-[#F5F5F5] mb-1">I am a Driver</h3>
          <p className="font-[family-name:var(--font-inter)] text-sm text-[#888888]">View routes, navigate stops, chat with passengers</p>
        </button>
        {/* Passenger card */}
        <button onClick={() => handleRoleSelect('passenger')} className="bg-[#141414] border border-[#222222] rounded-lg p-5 text-left hover:border-[#333333] hover:bg-[#1A1A1A] transition-colors duration-200 cursor-pointer">
          <MapPin size={22} className="text-[#888888] mb-3" />
          <h3 className="font-[family-name:var(--font-dm-mono)] text-base text-[#F5F5F5] mb-1">I am a Passenger</h3>
          <p className="font-[family-name:var(--font-inter)] text-sm text-[#888888]">Track buses live and message drivers</p>
        </button>
      </div>
    </main>
  );
}
