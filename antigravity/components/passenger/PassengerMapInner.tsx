'use client';

// Client-only: safe to import Leaflet here (loaded via dynamic import ssr:false from PassengerMap.tsx)
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import 'leaflet-defaulticon-compatibility';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { BusLocation } from '@/lib/rtdb';

interface PassengerMapInnerProps {
  busLocations: Record<string, { location: BusLocation }>;
  userLocation: [number, number] | null;
  selectedBusId: string | null;
  onSelectBus: (id: string) => void;
  onOpenChat: (id: string) => void;
}

export function PassengerMapInner({
  busLocations,
  userLocation,
  selectedBusId,
  onSelectBus,
  onOpenChat,
}: PassengerMapInnerProps) {
  const defaultCenter: [number, number] = [12.9716, 77.5946]; // Bangalore

  const busIcon = new L.DivIcon({
    className: 'bg-transparent',
    html: `<div class="w-6 h-6 bg-[#F5F5F5] rounded flex items-center justify-center border-2 border-[#1E1E1E] shadow-lg cursor-pointer hover:scale-110 transition-transform"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1E1E1E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

  const activeBusIcon = new L.DivIcon({
    className: 'bg-transparent',
    html: `<div class="w-7 h-7 bg-[#E8E8E8] rounded flex items-center justify-center border-2 border-[#27AE60] shadow-[0_0_12px_rgba(39,174,96,0.5)] cursor-pointer"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1E1E1E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

  const userIcon = new L.DivIcon({
    className: 'bg-transparent',
    html: `<div class="w-4 h-4 bg-[#2980B9] rounded-full border-2 border-[#1E1E1E] shadow-lg relative"><div class="absolute inset-0 rounded-full bg-[#2980B9] animate-ping opacity-50"></div></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });

  return (
    <MapContainer
      center={userLocation || defaultCenter}
      zoom={13}
      style={{ height: '100%', width: '100%' }}
      zoomControl
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        subdomains="abcd"
        maxZoom={20}
      />

      {/* User location dot */}
      {userLocation && (
        <Marker position={userLocation} icon={userIcon}>
          <Popup>
            <div className="font-[family-name:var(--font-dm-mono)] font-bold text-xs">You are here</div>
          </Popup>
        </Marker>
      )}

      {/* Live bus markers */}
      {Object.entries(busLocations).map(([vehicleId, data]) => {
        if (!data || !data.location) return null;
        const isSelected = selectedBusId === vehicleId;
        return (
          <Marker
            key={vehicleId}
            position={[data.location.lat, data.location.lng]}
            icon={isSelected ? activeBusIcon : busIcon}
            eventHandlers={{ click: () => onSelectBus(vehicleId) }}
          >
            <Popup>
              <div className="font-[family-name:var(--font-dm-mono)] font-bold text-xs mb-1">Bus {vehicleId}</div>
              <div className="font-[family-name:var(--font-inter)] text-[10px] text-[#555555]">
                Speed: {data.location.speed} km/h
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onOpenChat(vehicleId); }}
                className="mt-2 text-[10px] font-mono text-[#F5F5F5] bg-[#1E1E1E] border border-[#333333] rounded px-2 py-1 w-full"
              >
                Message Driver
              </button>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
