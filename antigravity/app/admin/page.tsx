'use client';

import AuthGuard from '@/components/shared/AuthGuard';
import { useAuth } from '@/hooks/useAuth';
import { LogOut, Map, Users, Truck, UserCircle, CarFront } from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';
import RouteManager from '@/components/admin/RouteManager';
import DriverAssignment from '@/components/admin/DriverAssignment';
import FleetManager from '@/components/admin/FleetManager';

export default function AdminPage() {
  const { signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('route');

  return (
    <AuthGuard allowedRole="admin">
      <div className="min-h-screen bg-[#0A0A0A] flex flex-col">
        {/* Fixed Header */}
        <header className="fixed top-0 w-full h-[56px] bg-[#0A0A0A] border-b border-[#222222] z-40 flex items-center justify-between px-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center">
              <span className="font-[family-name:var(--font-dm-mono)] text-base text-[#F5F5F5]">BUS TRACK</span>
              <span className="font-[family-name:var(--font-dm-mono)] text-base text-[#888888]"> — Admin</span>
            </div>
            
            {/* Quick Links to other roles for testing */}
            <div className="hidden md:flex items-center gap-3 ml-6 border-l border-[#222222] pl-6">
              <Link href="/driver" className="text-xs font-[family-name:var(--font-dm-mono)] text-[#888888] hover:text-[#F5F5F5] flex items-center gap-1 transition-colors">
                <CarFront size={14} /> Driver View
              </Link>
              <Link href="/passenger" className="text-xs font-[family-name:var(--font-dm-mono)] text-[#888888] hover:text-[#F5F5F5] flex items-center gap-1 transition-colors">
                <UserCircle size={14} /> Passenger View
              </Link>
            </div>
          </div>
          
          <button onClick={() => signOut()} className="p-2 cursor-pointer group flex items-center gap-2">
            <span className="text-xs font-[family-name:var(--font-dm-mono)] text-[#888888] hidden sm:block group-hover:text-[#F5F5F5]">Log Out</span>
            <LogOut size={18} className="text-[#888888] group-hover:text-[#F5F5F5] transition-colors" />
          </button>
        </header>

        {/* Scrollable Content Area */}
        <main className="flex-1 pt-[56px] flex flex-col">
          
          {/* Mobile Quick Links (visible only on small screens) */}
          <div className="md:hidden flex items-center gap-4 px-4 py-3 border-b border-[#222222] bg-[#0F0F0F]">
            <span className="text-xs font-[family-name:var(--font-inter)] text-[#555555]">Test Views:</span>
            <Link href="/driver" className="text-xs font-[family-name:var(--font-dm-mono)] text-[#888888] hover:text-[#F5F5F5] flex items-center gap-1">
              Driver
            </Link>
            <Link href="/passenger" className="text-xs font-[family-name:var(--font-dm-mono)] text-[#888888] hover:text-[#F5F5F5] flex items-center gap-1">
              Passenger
            </Link>
          </div>

          {/* Top Navigation for Tabs */}
          <div className="flex border-b border-[#222222] bg-[#0A0A0A] px-4 pt-4 overflow-x-auto gap-6 [&::-webkit-scrollbar]:hidden">
            <button
              onClick={() => setActiveTab('route')}
              className={`flex items-center gap-2 pb-3 font-[family-name:var(--font-dm-mono)] text-sm whitespace-nowrap transition-colors border-b-2 ${activeTab === 'route' ? 'text-[#F5F5F5] border-[#F5F5F5]' : 'text-[#888888] border-transparent hover:text-[#CCCCCC]'}`}
            >
              <Map size={16} /> Route Manager
            </button>
            <button
              onClick={() => setActiveTab('driver')}
              className={`flex items-center gap-2 pb-3 font-[family-name:var(--font-dm-mono)] text-sm whitespace-nowrap transition-colors border-b-2 ${activeTab === 'driver' ? 'text-[#F5F5F5] border-[#F5F5F5]' : 'text-[#888888] border-transparent hover:text-[#CCCCCC]'}`}
            >
              <Users size={16} /> Driver Assignment
            </button>
            <button
              onClick={() => setActiveTab('fleet')}
              className={`flex items-center gap-2 pb-3 font-[family-name:var(--font-dm-mono)] text-sm whitespace-nowrap transition-colors border-b-2 ${activeTab === 'fleet' ? 'text-[#F5F5F5] border-[#F5F5F5]' : 'text-[#888888] border-transparent hover:text-[#CCCCCC]'}`}
            >
              <Truck size={16} /> Fleet Manager
            </button>
          </div>

          {/* Active Tab Content */}
          <div className="p-4 flex-1 max-w-4xl w-full mx-auto">
            {activeTab === 'route' && (
              <div className="animate-in fade-in duration-300">
                <div className="mb-6">
                  <h2 className="text-xl font-[family-name:var(--font-dm-mono)] text-[#F5F5F5]">Route Manager</h2>
                  <p className="text-sm text-[#888888] font-[family-name:var(--font-inter)] mt-1">Create and modify bus routes and stops.</p>
                </div>
                <RouteManager />
              </div>
            )}
            
            {activeTab === 'driver' && (
              <div className="animate-in fade-in duration-300">
                <div className="mb-6">
                  <h2 className="text-xl font-[family-name:var(--font-dm-mono)] text-[#F5F5F5]">Driver Assignment</h2>
                  <p className="text-sm text-[#888888] font-[family-name:var(--font-inter)] mt-1">Assign drivers to specific vehicles and routes.</p>
                </div>
                <DriverAssignment />
              </div>
            )}
            
            {activeTab === 'fleet' && (
              <div className="animate-in fade-in duration-300">
                <div className="mb-6">
                  <h2 className="text-xl font-[family-name:var(--font-dm-mono)] text-[#F5F5F5]">Fleet Manager</h2>
                  <p className="text-sm text-[#888888] font-[family-name:var(--font-inter)] mt-1">Register and manage vehicles in your fleet.</p>
                </div>
                <FleetManager />
              </div>
            )}
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
