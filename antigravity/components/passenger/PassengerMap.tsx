'use client';

import dynamic from 'next/dynamic';
import { useAllBusLocations } from '@/hooks/useBusLocation';
import { useState, useEffect } from 'react';
import { MessageSquare } from 'lucide-react';
import ChatModal from './ChatModal';

// Leaflet components must only run on the client
const PassengerMapInner = dynamic(
  () => import('@/components/passenger/PassengerMapInner').then((m) => ({ default: m.PassengerMapInner })),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center bg-[#0A0A0A]">
        <span className="text-[#888888] font-mono text-sm">Loading map...</span>
      </div>
    ),
  }
);

export default function PassengerMap() {
  const busLocations = useAllBusLocations();
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [selectedBusId, setSelectedBusId] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
        (err) => console.error('Geolocation error', err)
      );
    }
  }, []);

  const openChat = () => {
    if (!selectedBusId) {
      const ids = Object.keys(busLocations);
      setSelectedBusId(ids.length > 0 ? ids[0] : 'demo-session');
    }
    setIsChatOpen(true);
  };

  if (!mounted) return null;

  return (
    <div className="relative h-full w-full">
      <PassengerMapInner
        busLocations={busLocations}
        userLocation={userLocation}
        selectedBusId={selectedBusId}
        onSelectBus={(id) => setSelectedBusId(id)}
        onOpenChat={(id) => { setSelectedBusId(id); setIsChatOpen(true); }}
      />

      {/* Floating Chat Button */}
      <button
        onClick={openChat}
        className="absolute bottom-6 right-4 w-12 h-12 bg-[#1E1E1E] border border-[#333333] rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.8)] z-[400] flex items-center justify-center cursor-pointer hover:bg-[#2A2A2A] transition-colors"
      >
        <MessageSquare size={20} className="text-[#F5F5F5]" />
      </button>

      <ChatModal
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        rideSessionId={selectedBusId || 'demo-session'}
      />
    </div>
  );
}
