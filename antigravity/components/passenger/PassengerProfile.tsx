'use client';

import { useAuth } from '@/hooks/useAuth';
import { LogOut, User } from 'lucide-react';
import Image from 'next/image';

export default function PassengerProfile() {
  const { user, userData, signOut } = useAuth();

  return (
    <div className="h-full flex flex-col bg-[#0A0A0A] overflow-y-auto p-6">
      
      <div className="flex flex-col items-center mt-12 mb-12">
        <div className="w-24 h-24 rounded-full border border-[#333333] overflow-hidden mb-5 bg-[#141414] flex items-center justify-center">
          {user?.photoURL ? (
            <Image src={user.photoURL} alt="Profile" width={96} height={96} className="object-cover" />
          ) : (
            <User size={40} className="text-[#555555]" />
          )}
        </div>
        <h1 className="font-[family-name:var(--font-dm-mono)] text-3xl text-[#F5F5F5]">{userData?.name || 'Passenger'}</h1>
        <p className="font-[family-name:var(--font-inter)] text-sm text-[#888888] mt-1">{userData?.email}</p>
        <span className="mt-3 px-3 py-1 bg-[#1A1A1A] border border-[#333333] rounded text-[#888888] text-[10px] font-mono uppercase tracking-wider">
          {userData?.role}
        </span>
      </div>

      <div className="mt-auto">
        <button
          onClick={signOut}
          className="w-full flex items-center justify-center gap-2 bg-[#1A1111] border border-[#C0392B] border-opacity-30 text-[#C0392B] font-[family-name:var(--font-dm-mono)] text-sm py-3.5 rounded-lg hover:bg-[#2A1111] hover:border-opacity-50 transition-colors cursor-pointer"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>

    </div>
  );
}
