'use client';

import AuthGuard from '@/components/shared/AuthGuard';
import { useAuth } from '@/hooks/useAuth';
import { LogOut, Map, Users, Truck, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import RouteManager from '@/components/admin/RouteManager';
import DriverAssignment from '@/components/admin/DriverAssignment';
import FleetManager from '@/components/admin/FleetManager';

export default function AdminPage() {
  const { signOut } = useAuth();
  const [expandedPanel, setExpandedPanel] = useState<string>('route');

  const togglePanel = (panel: string) => {
    setExpandedPanel((prev) => (prev === panel ? '' : panel));
  };

  return (
    <AuthGuard allowedRole="admin">
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col">
        {/* Fixed Header */}
        <header className="fixed top-0 w-full h-[56px] bg-[#0A0A0A] border-b border-[#222222] z-40 flex items-center justify-between px-4">
          <div className="flex items-center">
            <span className="font-[family-name:var(--font-dm-mono)] text-base text-[#F5F5F5]">BUS TRACK</span>
            <span className="font-[family-name:var(--font-dm-mono)] text-base text-[#888888]"> — Admin</span>
          </div>
          <button onClick={() => signOut()} className="p-2 cursor-pointer group">
            <LogOut size={18} className="text-[#888888] group-hover:text-[#F5F5F5] transition-colors" />
          </button>
        </header>

        {/* Scrollable Content Area */}
        <main className="flex-1 pt-[56px]">
          
          {/* Panel 1: Route Manager */}
          <section className="border-b border-[#222222]">
            <div 
              onClick={() => togglePanel('route')}
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-[#141414] transition-colors"
            >
              <div className="flex items-center gap-2">
                <Map size={18} className="text-[#888888]" />
                <h2 className="font-[family-name:var(--font-dm-mono)] text-base text-[#F5F5F5]">Route Manager</h2>
              </div>
              {expandedPanel === 'route' ? <ChevronUp size={18} className="text-[#888888]" /> : <ChevronDown size={18} className="text-[#888888]" />}
            </div>
            {expandedPanel === 'route' && (
              <div className="p-4 pt-0">
                <RouteManager />
              </div>
            )}
          </section>

          {/* Panel 2: Driver Assignment */}
          <section className="border-b border-[#222222]">
            <div 
              onClick={() => togglePanel('driver')}
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-[#141414] transition-colors"
            >
              <div className="flex items-center gap-2">
                <Users size={18} className="text-[#888888]" />
                <h2 className="font-[family-name:var(--font-dm-mono)] text-base text-[#F5F5F5]">Driver Assignment</h2>
              </div>
              {expandedPanel === 'driver' ? <ChevronUp size={18} className="text-[#888888]" /> : <ChevronDown size={18} className="text-[#888888]" />}
            </div>
            {expandedPanel === 'driver' && (
              <div className="p-4 pt-0">
                <DriverAssignment />
              </div>
            )}
          </section>

          {/* Panel 3: Fleet Manager */}
          <section>
            <div 
              onClick={() => togglePanel('fleet')}
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-[#141414] transition-colors"
            >
              <div className="flex items-center gap-2">
                <Truck size={18} className="text-[#888888]" />
                <h2 className="font-[family-name:var(--font-dm-mono)] text-base text-[#F5F5F5]">Fleet Manager</h2>
              </div>
              {expandedPanel === 'fleet' ? <ChevronUp size={18} className="text-[#888888]" /> : <ChevronDown size={18} className="text-[#888888]" />}
            </div>
            {expandedPanel === 'fleet' && (
              <div className="p-4 pt-0">
                <FleetManager />
              </div>
            )}
          </section>

        </main>
      </div>
    </AuthGuard>
  );
}
