"use client";

import React from "react";

interface BusIconProps {
  heading: number;
  status: "active" | "idle" | "maintenance" | string;
  size?: number;
}

export default function BusIcon({ heading, status, size = 32 }: BusIconProps) {
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
      {/* Simple Active Pulse */}
      {status === "active" && (
        <div className="absolute inset-0 rounded-full bg-status-active/20 animate-ping opacity-60" />
      )}
      
      {/* Directional Arrow (Triangle) */}
      <div 
        className="relative z-10 transition-transform duration-500 ease-out"
        style={{ transform: `rotate(${heading}deg)` }}
      >
        <svg 
          width={size * 0.7} 
          height={size * 0.7} 
          viewBox="0 0 24 24" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path 
            d="M12 2L20 20L12 16L4 20L12 2Z" 
            fill={colors.primary} 
            stroke="white" 
            strokeWidth="1"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Mini status indicator */}
      <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 rounded-full border border-brand-dark" style={{ backgroundColor: colors.primary }} />
    </div>
  );
}
