'use client';

import AuthGuard from '@/components/shared/AuthGuard';
import RouteManagementPanel from '@/components/admin/RouteManagementPanel';
import FleetManagementPanel from '@/components/admin/FleetManagementPanel';
import { Map as MapIcon, Users, ShieldCheck, Bus as BusIcon, LogOut, CarFront, UserCircle } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

export default function AdminPage() {
  const { signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<'routes' | 'fleet' | 'personnel'>('routes');

  return (
    <AuthGuard allowedRole="admin">
      <main className="min-h-screen bg-[#0A0A0A] text-[#F5F5F5] flex flex-col font-sans">
        
        {/* Fixed Header */}
        <header className="sticky top-0 z-[100] w-full border-b border-[#222222] bg-[#0A0A0A]/90 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#141414] border border-[#333333] flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4 text-[#888888]" />
                </div>
                <span className="font-[family-name:var(--font-dm-mono)] font-black text-sm uppercase tracking-[0.18em] text-[#F5F5F5]">
                  Admin Panel
                </span>
              </div>
              
              {/* Quick Links */}
              <div className="hidden md:flex items-center gap-4 ml-6 border-l border-[#333333] pl-6">
                <Link href="/driver" className="text-xs font-[family-name:var(--font-dm-mono)] text-[#888888] hover:text-[#F5F5F5] flex items-center gap-1.5 transition-colors">
                  <CarFront size={14} /> Driver View
                </Link>
                <Link href="/passenger" className="text-xs font-[family-name:var(--font-dm-mono)] text-[#888888] hover:text-[#F5F5F5] flex items-center gap-1.5 transition-colors">
                  <UserCircle size={14} /> Passenger View
                </Link>
              </div>
            </div>

            <button onClick={() => signOut()} className="p-2 cursor-pointer group flex items-center gap-2">
              <span className="text-xs font-[family-name:var(--font-dm-mono)] text-[#888888] hidden sm:block group-hover:text-[#F5F5F5]">Log Out</span>
              <LogOut size={18} className="text-[#888888] group-hover:text-[#F5F5F5] transition-colors" />
            </button>
          </div>
        </header>

        {/* Mobile Quick Links */}
        <div className="md:hidden flex items-center justify-center gap-6 px-4 py-3 border-b border-[#222222] bg-[#0F0F0F]">
          <Link href="/driver" className="text-xs font-[family-name:var(--font-dm-mono)] text-[#888888] hover:text-[#F5F5F5] flex items-center gap-1.5">
            <CarFront size={14} /> Driver
          </Link>
          <div className="w-px h-4 bg-[#333333]" />
          <Link href="/passenger" className="text-xs font-[family-name:var(--font-dm-mono)] text-[#888888] hover:text-[#F5F5F5] flex items-center gap-1.5">
            <UserCircle size={14} /> Passenger
          </Link>
        </div>

        {/* Page-level Tab Bar */}
        <div className="w-full border-b border-[#222222] bg-[#141414]/30 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-stretch gap-0 overflow-x-auto [&::-webkit-scrollbar]:hidden">
              <button
                onClick={() => setActiveTab('routes')}
                className={`relative flex items-center gap-2.5 px-5 py-4 text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                  activeTab === 'routes'
                    ? 'text-[#F5F5F5]'
                    : 'text-[#555555] hover:text-[#888888]'
                }`}
              >
                <MapIcon className="w-3.5 h-3.5 shrink-0" />
                <span>Routes</span>
                {activeTab === 'routes' && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#F5F5F5] rounded-full" />
                )}
              </button>

              <button
                onClick={() => setActiveTab('fleet')}
                className={`relative flex items-center gap-2.5 px-5 py-4 text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                  activeTab === 'fleet'
                    ? 'text-[#F5F5F5]'
                    : 'text-[#555555] hover:text-[#888888]'
                }`}
              >
                <BusIcon className="w-3.5 h-3.5 shrink-0" />
                <span>Fleet</span>
                {activeTab === 'fleet' && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#F5F5F5] rounded-full" />
                )}
              </button>

              <button
                onClick={() => setActiveTab('personnel')}
                className={`relative flex items-center gap-2.5 px-5 py-4 text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                  activeTab === 'personnel'
                    ? 'text-[#F5F5F5]'
                    : 'text-[#555555] hover:text-[#888888]'
                }`}
              >
                <Users className="w-3.5 h-3.5 shrink-0" />
                <span>Personnel</span>
                {activeTab === 'personnel' && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#F5F5F5] rounded-full" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-[#0A0A0A]/40 flex flex-col items-center">
          <div className="w-full max-w-7xl mx-auto py-4">
            {activeTab === 'routes' ? <RouteManagementPanel /> : <FleetManagementPanel mode={activeTab} />}
          </div>
        </div>
        
      </main>
    </AuthGuard>
  );
}
