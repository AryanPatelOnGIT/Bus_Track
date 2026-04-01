"use client";

import React from "react";

interface BusIconProps {
  heading: number;
  status: "active" | "idle" | "maintenance" | string;
  size?: number;
}

export default function BusIcon({ heading, status, size = 42 }: BusIconProps) {
  const getColors = () => {
    switch (status) {
      case "active":
        return { primary: "#10b981", glow: "rgba(16, 185, 129, 0.4)" }; // Emerald
      case "maintenance":
        return { primary: "#ef4444", glow: "rgba(239, 68, 68, 0.4)" }; // Rose
      case "idle":
      default:
        return { primary: "#f59e0b", glow: "rgba(245, 158, 11, 0.4)" }; // Amber
    }
  };

  const colors = getColors();

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Pulse Effect for Active Buses */}
      {status === "active" && (
        <div className="absolute inset-0 rounded-full animate-ping opacity-20" style={{ backgroundColor: colors.primary }} />
      )}
      
      {/* Status Glow Ring */}
      <div 
        className="absolute inset-0 rounded-full blur-[6px] opacity-40 transition-all duration-500" 
        style={{ backgroundColor: colors.glow }} 
      />

      {/* Modern Vehicle Silhouette */}
      <div 
        className="relative z-10 transition-transform duration-500 ease-out drop-shadow-lg"
        style={{ transform: `rotate(${heading}deg)` }}
      >
        <svg 
          width={size * 0.8} 
          height={size * 0.8} 
          viewBox="0 0 40 40" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Main Body */}
          <rect x="10" y="6" width="20" height="28" rx="5" fill="#1e293b" stroke="white" strokeWidth="1.5" />
          
          {/* Status Indicator Bar */}
          <rect x="14" y="30" width="12" height="2" rx="1" fill={colors.primary} />
          
          {/* Windshield */}
          <path d="M12 9C12 7.89543 12.8954 7 14 7H26C27.1046 7 28 7.89543 28 9V14H12V9Z" fill="white" fillOpacity="0.2" />
          
          {/* Headlights */}
          <circle cx="14" cy="32" r="1.5" fill="white" fillOpacity="0.8" />
          <circle cx="26" cy="32" r="1.5" fill="white" fillOpacity="0.8" />
          
          {/* Directional Arrow Overlay */}
          <path d="M20 12L24 18H16L20 12Z" fill={colors.primary} />
        </svg>
      </div>

      {/* Tooltip for Status (Optional) */}
      <div className="absolute -bottom-6 opacity-0 group-hover:opacity-100 transition-opacity bg-black/80 px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest pointer-events-none z-20 whitespace-nowrap">
        {status}
      </div>
    </div>
  );
}
