'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import AuthGuard from '@/components/shared/AuthGuard';
import BottomNav from '@/components/shared/BottomNav';
import { MapPin, User } from 'lucide-react';
import PassengerProfile from '@/components/passenger/PassengerProfile';

const PassengerMap = dynamic(() => import('@/components/passenger/PassengerMap'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-[#0A0A0A]">
      <span className="text-[#888888] font-mono text-sm font-light">Loading map...</span>
    </div>
  ),
});

export default function PassengerPage() {
  const [activeTab, setActiveTab] = useState('map');

  const tabs = [
    { id: 'map', label: 'Live Map', icon: MapPin },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <AuthGuard allowedRole="passenger">
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col pb-16">
        <main className="flex-1 relative overflow-hidden">
          {activeTab === 'map' && <PassengerMap />}
          {activeTab === 'profile' && <PassengerProfile />}
        </main>
        <BottomNav tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    </AuthGuard>
  );
}
