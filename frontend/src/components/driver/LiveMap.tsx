'use client';

import dynamic from 'next/dynamic';
import { useAuth } from '@/hooks/useAuth';
import { useDriverProfile } from '@/hooks/useDriverProfile';
import { useBusLocation } from '@/hooks/useBusLocation';
import { useEffect, useState } from 'react';

// Leaflet components MUST be imported inside a dynamic() that is ssr:false
// because Leaflet accesses `window` at module evaluation time.
const MapComponents = dynamic(
  () =>
    import('@/components/driver/LiveMapInner').then((mod) => ({
      default: mod.LiveMapInner,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full flex items-center justify-center bg-[#0A0A0A]">
        <span className="text-[#888888] font-mono text-sm">Loading map...</span>
      </div>
    ),
  }
);

export default function LiveMap() {
  const { userData } = useAuth();
  const { routes } = useDriverProfile(userData);
  const location = useBusLocation(userData?.vehicleId || null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([12.9716, 77.5946]);

  useEffect(() => {
    if (location) {
      setMapCenter([location.lat, location.lng]);
    }
  }, [location]);

  return (
    <MapComponents
      mapCenter={mapCenter}
      location={location}
      routes={routes}
    />
  );
}
