'use client';

import { useState } from 'react';
import AuthGuard from '@/components/shared/AuthGuard';
import BottomNav from '@/components/shared/BottomNav';
import { MapPin, User } from 'lucide-react';
import PassengerMap from '@/components/passenger/PassengerMap';
import PassengerProfile from '@/components/passenger/PassengerProfile';

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
