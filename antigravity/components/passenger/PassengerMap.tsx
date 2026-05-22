'use client';

import dynamic from 'next/dynamic';
import { useAllBusLocations } from '@/hooks/useBusLocation';
import { useEffect, useState } from 'react';
import { Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { MessageSquare } from 'lucide-react';
import ChatModal from './ChatModal';

const DarkMapContainer = dynamic(() => import('@/components/shared/MapContainer'), {
  ssr: false,
  loading: () => <div className="h-full w-full flex items-center justify-center bg-[#0A0A0A]"><span className="text-[#888888] font-mono text-sm">Loading map...</span></div>,
});

export default function PassengerMap() {
  const busLocations = useAllBusLocations();
  const [mapCenter] = useState<[number, number]>([12.9716, 77.5946]); // Default to Bangalore
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [mounted, setMounted] = useState(false);
  const [selectedBusId, setSelectedBusId] = useState<string | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          console.error('Error getting location', error);
        }
      );
    }
  }, []);

  if (!mounted) return null;

  const busIcon = new L.DivIcon({
    className: 'bg-transparent',
    html: `<div class="w-6 h-6 bg-[#F5F5F5] rounded flex items-center justify-center border-2 border-[#1E1E1E] shadow-lg cursor-pointer hover:scale-110 transition-transform"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1E1E1E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });

  const activeBusIcon = new L.DivIcon({
    className: 'bg-transparent',
    html: `<div class="w-7 h-7 bg-[#E8E8E8] rounded flex items-center justify-center border-2 border-[#27AE60] shadow-[0_0_12px_rgba(39,174,96,0.5)] cursor-pointer"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1E1E1E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  });

  const userIcon = new L.DivIcon({
    className: 'bg-transparent',
    html: `<div class="w-4 h-4 bg-[#2980B9] rounded-full border-2 border-[#1E1E1E] shadow-lg relative"><div class="absolute inset-0 rounded-full bg-[#2980B9] animate-ping opacity-50"></div></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  });

  const openChat = () => {
    // If no bus selected, default to the first available bus for demo
    if (!selectedBusId) {
      const availableIds = Object.keys(busLocations);
      if (availableIds.length > 0) {
        setSelectedBusId(availableIds[0]);
      } else {
        // Fallback for demo if no live buses
        setSelectedBusId('demo-session');
      }
    }
    setIsChatOpen(true);
  };

  return (
    <div className="relative h-full w-full">
      <DarkMapContainer center={userLocation || mapCenter} zoom={13} className="h-full w-full">
        
        {/* User Location */}
        {userLocation && (
          <Marker position={userLocation} icon={userIcon}>
            <Popup className="custom-popup">
              <div className="font-[family-name:var(--font-dm-mono)] font-bold text-xs">You are here</div>
            </Popup>
          </Marker>
        )}

        {/* Bus Locations */}
        {Object.entries(busLocations).map(([vehicleId, data]) => {
          if (!data || !data.location) return null;
          const isSelected = selectedBusId === vehicleId;
          return (
            <Marker 
              key={vehicleId} 
              position={[data.location.lat, data.location.lng]} 
              icon={isSelected ? activeBusIcon : busIcon}
              eventHandlers={{
                click: () => setSelectedBusId(vehicleId)
              }}
            >
              <Popup>
                <div className="font-[family-name:var(--font-dm-mono)] font-bold text-xs mb-1">Bus {vehicleId}</div>
                <div className="font-[family-name:var(--font-inter)] text-[10px] text-[#555555]">Speed: {data.location.speed} km/h</div>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedBusId(vehicleId);
                    setIsChatOpen(true);
                  }}
                  className="mt-2 text-[10px] font-mono text-[#F5F5F5] bg-[#1E1E1E] border border-[#333333] rounded px-2 py-1 w-full"
                >
                  Message Driver
                </button>
              </Popup>
            </Marker>
          );
        })}

      </DarkMapContainer>

      {/* Floating Action Button for Chat */}
      <button 
        onClick={openChat}
        className="absolute bottom-6 right-4 w-12 h-12 bg-[#1E1E1E] border border-[#333333] rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.8)] z-[400] flex items-center justify-center cursor-pointer hover:bg-[#2A2A2A] transition-colors"
      >
        <MessageSquare size={20} className="text-[#F5F5F5]" />
      </button>

      {/* Chat Modal */}
      <ChatModal 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
        rideSessionId={selectedBusId || 'demo-session'} 
      />
    </div>
  );
}
