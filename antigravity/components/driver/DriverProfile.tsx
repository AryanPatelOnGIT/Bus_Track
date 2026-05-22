'use client';

import { useAuth } from '@/hooks/useAuth';
import { useDriverProfile } from '@/hooks/useDriverProfile';
import { LogOut, Truck, Map as MapIcon, User } from 'lucide-react';

export default function DriverProfile() {
  const { user, userData, signOut } = useAuth();
  const { vehicle, routes, loading } = useDriverProfile(userData);

  if (loading) {
    return <div className="h-full flex items-center justify-center"><span className="text-[#888888] font-mono text-sm">Loading profile...</span></div>;
  }

  return (
    <div className="h-full flex flex-col bg-[#0A0A0A] overflow-y-auto p-6">
      
      <div className="flex flex-col items-center mt-8 mb-10">
        <div className="w-20 h-20 rounded-full border border-[#333333] overflow-hidden mb-4 bg-[#141414] flex items-center justify-center">
          {user?.photoURL ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.photoURL} alt="Profile" width={80} height={80} className="object-cover" />
          ) : (
            <User size={32} className="text-[#555555]" />
          )}
        </div>
        <h1 className="font-[family-name:var(--font-dm-mono)] text-2xl text-[#F5F5F5]">{userData?.name || 'Driver'}</h1>
        <p className="font-[family-name:var(--font-inter)] text-sm text-[#888888]">{userData?.email}</p>
        <span className="mt-2 px-3 py-1 bg-[#1A1A1A] border border-[#333333] rounded text-[#888888] text-[10px] font-mono uppercase tracking-wider">
          {userData?.role}
        </span>
      </div>

      <div className="flex flex-col gap-4 mb-10">
        <div className="bg-[#141414] border border-[#222222] rounded-lg p-4">
          <div className="flex items-center gap-3 mb-1">
            <Truck size={16} className="text-[#888888]" />
            <h3 className="font-[family-name:var(--font-dm-mono)] text-sm text-[#F5F5F5]">Vehicle</h3>
          </div>
          <p className="font-[family-name:var(--font-inter)] text-sm text-[#888888] pl-7">
            {vehicle ? `${vehicle.busNumber} — ${vehicle.busName}` : 'No vehicle assigned'}
          </p>
        </div>

        <div className="bg-[#141414] border border-[#222222] rounded-lg p-4">
          <div className="flex items-center gap-3 mb-1">
            <MapIcon size={16} className="text-[#888888]" />
            <h3 className="font-[family-name:var(--font-dm-mono)] text-sm text-[#F5F5F5]">Assigned Routes</h3>
          </div>
          <div className="flex flex-col gap-1 pl-7">
            {routes.length > 0 ? (
              routes.map(r => (
                <span key={r.id} className="font-[family-name:var(--font-inter)] text-sm text-[#888888]">
                  • {r.routeName} ({r.stops.length} stops)
                </span>
              ))
            ) : (
              <span className="font-[family-name:var(--font-inter)] text-sm text-[#888888]">No routes assigned</span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-auto">
        <button
          onClick={signOut}
          className="w-full flex items-center justify-center gap-2 bg-[#1A1111] border border-[#C0392B] border-opacity-30 text-[#C0392B] font-[family-name:var(--font-dm-mono)] text-sm py-3.5 rounded-lg hover:bg-[#2A1111] hover:border-opacity-50 transition-colors cursor-pointer"
        >
          <LogOut size={16} />
          End Ride & Sign Out
        </button>
      </div>

    </div>
  );
}
