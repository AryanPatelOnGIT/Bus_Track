'use client';

import React from 'react';

interface Tab {
  id: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

interface BottomNavProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export default function BottomNav({ tabs, activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 w-full h-16 bg-[#0A0A0A] border-t border-[#222222] z-50 flex flex-row items-center justify-around pb-[env(safe-area-inset-bottom)]">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className="flex flex-1 flex-col items-center justify-center gap-1 bg-transparent border-none cursor-pointer py-2"
          >
            <Icon size={22} className={isActive ? 'text-[#F5F5F5]' : 'text-[#555555]'} />
            <span className={`font-mono text-[10px] ${isActive ? 'text-[#F5F5F5]' : 'text-[#555555]'}`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
