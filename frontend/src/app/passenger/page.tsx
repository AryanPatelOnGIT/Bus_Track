'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import AuthGuard from '@/components/shared/AuthGuard';
import BottomNav from '@/components/shared/BottomNav';
import { MapPin, User, Loader2 } from 'lucide-react';
import PassengerProfile from '@/components/passenger/PassengerProfile';
import { useRoutes, RouteData, RouteStop } from '@/hooks/useRoutes';
import { rtdb } from '@/lib/firebase';
import { ref, onValue, off } from 'firebase/database';

const PassengerMap = dynamic(() => import('@/components/passenger/PassengerMap'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-[#0A0A0A]">
      <Loader2 className="w-8 h-8 text-[#555555] animate-spin" />
    </div>
  ),
});

interface ActiveBusRouteSnapshot {
  routeId?: string;
  status?: 'active' | 'maintenance' | 'idle';
  timestamp?: number;
  online?: boolean;
  startedAt?: number;
  location?: {
    timestamp?: number;
  };
  route?: {
    routeId?: string;
  };
}

export default function PassengerPage() {
  const [activeTab, setActiveTab] = useState('map');
  const { routes } = useRoutes();

  // Selected route/stop state
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [selectedStopId, setSelectedStopId] = useState('');
  
  // Track active routes based on live buses
  const [activeRouteIds, setActiveRouteIds] = useState<string[]>([]);

  // Listen for live buses to filter available routes
  useEffect(() => {
    const busesRef = ref(rtdb, 'activeBuses');
    const unsubscribe = onValue(busesRef, (snapshot) => {
      const data = snapshot.val();
      const newActiveRoutes = new Set<string>();
      if (data) {
        Object.values(data as Record<string, ActiveBusRouteSnapshot>).forEach((bus) => {
          const routeId = bus.route?.routeId ?? bus.routeId;
          const timestamp = bus.location?.timestamp ?? bus.timestamp ?? bus.startedAt;
          const isFresh = typeof timestamp === 'number' && Date.now() - timestamp < 300000;
          const isActive = bus.status === 'active' || (bus.status === undefined && bus.online !== false);

          if (routeId && isActive && isFresh) {
            newActiveRoutes.add(routeId);
          }
        });
      }
      setActiveRouteIds(Array.from(newActiveRoutes));
    });

    return () => off(busesRef, 'value', unsubscribe);
  }, []);

  // Set default selected route based on availability
  useEffect(() => {
    const availableRoutes = routes;
    if (availableRoutes.length > 0) {
      if (!selectedRouteId || !availableRoutes.some((r) => r.id === selectedRouteId)) {
        setSelectedRouteId(availableRoutes[0].id);
      }
    } else if (availableRoutes.length === 0 && selectedRouteId) {
      setSelectedRouteId('');
    }
  }, [routes, selectedRouteId]);

  const availableRoutes = routes;
  const activeRoute = availableRoutes.find((r) => r.id === selectedRouteId);

  // Set default stop
  useEffect(() => {
    if (activeRoute?.stops?.length) {
      if (!selectedStopId || !activeRoute.stops.some((s) => s.id === selectedStopId)) {
        setSelectedStopId(activeRoute.stops[activeRoute.stops.length - 1].id);
      }
    }
  }, [activeRoute, selectedStopId]);

  const targetStop = activeRoute?.stops?.find((s) => s.id === selectedStopId) ||
    (activeRoute?.stops?.length ? activeRoute.stops[activeRoute.stops.length - 1] : null);

  const tabs = [
    { id: 'map', label: 'Live Map', icon: MapPin },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <AuthGuard allowedRole="passenger">
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col pb-16">
        <main className="flex-1 relative overflow-hidden flex flex-col">
          {activeTab === 'map' && (
            <div className="relative flex-1 w-full h-full">
              {activeRoute && targetStop ? (
                <>
                  {/* Floating Route & Stop Selectors */}
                  <div className="absolute top-0 inset-x-0 z-40 bg-gradient-to-b from-[#0A0A0A] to-transparent pt-6 px-4 pb-12 flex flex-col gap-3 pointer-events-none">
                    
                    {/* Route Selector */}
                    <div className="relative w-full max-w-lg mx-auto pointer-events-auto">
                      <select
                        value={selectedRouteId}
                        onChange={(e) => setSelectedRouteId(e.target.value)}
                        className="w-full h-14 bg-[#141414]/90 backdrop-blur-md border border-[#333333] hover:border-[#555555] rounded-2xl px-5 text-[#F5F5F5] font-[family-name:var(--font-dm-mono)] font-bold text-sm focus:outline-none focus:ring-2 focus:ring-[#2980B9] shadow-2xl appearance-none transition-all cursor-pointer"
                      >
                        {availableRoutes.map((r) => (
                          <option key={r.id} value={r.id} className="bg-[#1A1A1A] text-[#F5F5F5]">
                            Route: {r.name} {activeRouteIds.includes(r.id) ? '(Live)' : ''}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-[#888888]">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <path d="M6 9l6 6 6-6" />
                        </svg>
                      </div>
                    </div>

                    {/* Stop Selector */}
                    {activeRoute.stops && activeRoute.stops.length > 0 && (
                      <div className="relative w-full max-w-lg mx-auto pointer-events-auto">
                        <select
                          value={selectedStopId}
                          onChange={(e) => setSelectedStopId(e.target.value)}
                          className="w-full h-12 bg-[#0A0A0A]/90 backdrop-blur-md border border-[#222222] hover:border-[#333333] rounded-2xl px-5 text-[#888888] font-[family-name:var(--font-dm-mono)] text-xs focus:outline-none focus:ring-2 focus:ring-[#2980B9] shadow-xl appearance-none transition-all cursor-pointer"
                        >
                          {activeRoute.stops.map((s) => (
                            <option key={s.id} value={s.id} className="bg-[#0A0A0A] text-[#F5F5F5]">
                              Alight at: {s.name}
                            </option>
                          ))}
                        </select>
                        <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-[#555555]">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                            <path d="M6 9l6 6 6-6" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </div>

                  <PassengerMap targetStop={targetStop} route={activeRoute} />
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-[#0A0A0A] px-10 text-center">
                  <Loader2 className="w-10 h-10 text-[#555555] animate-spin mb-6" />
                  <p className="text-[#888888] text-sm font-[family-name:var(--font-dm-mono)] font-bold uppercase tracking-[0.2em]">
                    Waiting for a driver to go live…
                  </p>
                  <p className="text-[#555555] font-[family-name:var(--font-inter)] text-xs mt-2">
                    Updates automatically when a driver goes online
                  </p>
                </div>
              )}
            </div>
          )}
          {activeTab === 'profile' && <PassengerProfile />}
        </main>
        <BottomNav tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
      </div>
    </AuthGuard>
  );
}
