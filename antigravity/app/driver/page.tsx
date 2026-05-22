'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import AuthGuard from '@/components/shared/AuthGuard';
import BottomNav from '@/components/shared/BottomNav';
import { MapPin, MessageSquare, User } from 'lucide-react';
import DriverChat from '@/components/driver/DriverChat';
import DriverProfile from '@/components/driver/DriverProfile';

const LiveMap = dynamic(() => import('@/components/driver/LiveMap'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-[#0A0A0A]">
      <span className="text-[#888888] font-mono text-sm font-light">Loading map...</span>
    </div>
  ),
});

export default function DriverPage() {
  const [activeTab, setActiveTab] = useState('map');

  const tabs = [
    { id: 'map', label: 'Map', icon: MapPin },
    { id: 'chat', label: 'Messages', icon: MessageSquare },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <AuthGuard allowedRole="driver">
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col pb-16">
        <main className="flex-1 relative overflow-hidden">
          {activeTab === 'map' && <LiveMap />}
          {activeTab === 'chat' && <DriverChat />}
          {activeTab === 'profile' && <DriverProfile />}
        </main>
        <BottomNav tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    </AuthGuard>
  );
}
