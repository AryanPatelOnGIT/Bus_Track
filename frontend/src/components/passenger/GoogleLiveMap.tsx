import React, { useState, useEffect, useRef } from 'react';
import { useThrottledDirections, useAutocompleteWithSession } from '@/hooks/useGoogleMapsOptimizations';

interface Props {
  driverLocation: { lat: number; lng: number } | null;
  destination: { lat: number; lng: number } | null;
  onMapClick?: (lat: number, lng: number) => void;
}

export default function GoogleLiveMap({ driverLocation, destination, onMapClick }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<any>(null);
  const [mapInstance, setMapInstance] = useState<any>(null);
  
  // Connect our custom throttled hook
  const { cachedDirections, etaInfo } = useThrottledDirections(driverLocation, destination);

  // Initialize Map & Traffic Layer Once
  useEffect(() => {
    if (!mapRef.current || !window.google || mapInstance) return;

    const map = new window.google.maps.Map(mapRef.current, {
      center: driverLocation || { lat: 23.0347, lng: 72.5483 }, // Defaults to Ahmedabad
      zoom: 14,
      disableDefaultUI: true, // Cleaner UI
    });

    // FEATURE: Enable visual density layer
    const trafficLayer = new window.google.maps.TrafficLayer();
    trafficLayer.setMap(map);

    if (onMapClick) {
      map.addListener('click', (e: any) => {
        onMapClick(e.latLng.lat(), e.latLng.lng());
      });
    }

    setMapInstance(map);
  }, []); // Run once on mount

  // Update Map Rendering only when `cachedDirections` updates
  useEffect(() => {
    if (!mapInstance || !cachedDirections) return;

    // Initialize renderer if not exists
    if (!rendererRef.current) {
      rendererRef.current = new window.google.maps.DirectionsRenderer({
        map: mapInstance,
        suppressMarkers: true, // We suppress so we can draw our own custom buses/stops
        polylineOptions: { strokeColor: '#2563EB', strokeWeight: 6, strokeOpacity: 0.8 }
      });
    }

    // Apply the cached route to the visuals
    rendererRef.current.setDirections(cachedDirections);

  }, [mapInstance, cachedDirections]);

  return (
    <div className="relative h-full w-full rounded-xl overflow-hidden shadow-lg border border-white/10" style={{ minHeight: '400px' }}>
      <div ref={mapRef} className="h-full w-full" style={{ position: 'absolute', inset: 0 }} />
      
      {/* Floating ETA Details */}
      {etaInfo && (
        <div className="absolute bottom-6 left-6 bg-white/90 backdrop-blur-md p-4 rounded-xl shadow-xl border border-gray-100 flex flex-col pointer-events-none z-[1000]">
          <span className="text-xs font-bold tracking-wider text-gray-500 uppercase mb-1">Live Status</span>
          <div className="flex items-end gap-3">
             <span className="text-3xl font-extrabold text-blue-600">{etaInfo.duration_in_traffic || '--'}</span>
             <span className="text-sm text-gray-600 mb-1">{etaInfo.distance} remaining</span>
          </div>
        </div>
      )}
    </div>
  );
}
