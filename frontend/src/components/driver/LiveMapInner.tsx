'use client';

// This file is ONLY ever loaded on the client (via dynamic import with ssr:false).
// It is safe to import Leaflet and react-leaflet here.
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import 'leaflet-defaulticon-compatibility';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { BusLocation } from '@/lib/rtdb';
import { RouteData } from '@/lib/db';

interface LiveMapInnerProps {
  mapCenter: [number, number];
  location: BusLocation | null;
  routes: RouteData[];
}

export function LiveMapInner({ mapCenter, location, routes }: LiveMapInnerProps) {
  const busIcon = new L.DivIcon({
    className: 'bg-transparent',
    html: `<div class="w-6 h-6 bg-[#F5F5F5] rounded flex items-center justify-center border-2 border-[#1E1E1E] shadow-lg"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1E1E1E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

  const stopIcon = (num: number) =>
    new L.DivIcon({
      className: 'bg-transparent',
      html: `<div class="w-5 h-5 bg-[#888888] rounded-full flex items-center justify-center border-2 border-[#1E1E1E] text-[10px] text-[#F5F5F5] font-mono shadow-md">${num}</div>`,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

  const activeRoute = routes[0];

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={mapCenter}
        zoom={14}
        style={{ height: '100%', width: '100%' }}
        zoomControl
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          subdomains="abcd"
          maxZoom={20}
        />

        {/* Route Stops */}
        {activeRoute?.stops.map((stop, i) => (
          <Marker key={i} position={[stop.lat, stop.lng]} icon={stopIcon(i + 1)}>
            <Popup>
              <div className="font-[family-name:var(--font-dm-mono)] font-bold">{stop.name}</div>
            </Popup>
          </Marker>
        ))}

        {/* Live Bus Location */}
        {location && (
          <Marker position={[location.lat, location.lng]} icon={busIcon}>
            <Popup>
              <div className="font-[family-name:var(--font-dm-mono)] font-bold">Your Bus</div>
              <div className="font-[family-name:var(--font-inter)] text-xs">Speed: {location.speed} km/h</div>
            </Popup>
          </Marker>
        )}
      </MapContainer>

      {/* Floating Info Card */}
      {activeRoute && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-[90%] max-w-sm bg-[#141414] border border-[#222222] rounded-lg p-3 shadow-[0_2px_8px_rgba(0,0,0,0.6)] z-[400] flex items-center justify-between">
          <div className="flex flex-col">
            <span className="font-[family-name:var(--font-dm-mono)] text-xs text-[#888888]">Active Route</span>
            <span className="font-[family-name:var(--font-inter)] text-sm text-[#F5F5F5] font-medium">{activeRoute.routeName}</span>
          </div>
          {location && (
            <div className="flex flex-col items-end">
              <span className="font-[family-name:var(--font-dm-mono)] text-xs text-[#27AE60] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#27AE60] animate-pulse" />
                LIVE
              </span>
              <span className="font-[family-name:var(--font-inter)] text-xs text-[#888888]">{location.speed} km/h</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
