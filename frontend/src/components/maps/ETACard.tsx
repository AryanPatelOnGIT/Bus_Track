"use client";

import React from "react";
import { MapPin } from "lucide-react";

export interface ETACardProps {
  stopName: string;
  stopShortName: string;
  etaMinutes: number;
  distanceKm: string;
  viaRoad: string;
  isArriving: boolean; // eta <= 2
  hasArrived: boolean; // eta === 0
  isLoading: boolean;
}

export default function ETACard({
  stopName,
  stopShortName,
  etaMinutes,
  distanceKm,
  viaRoad,
  isArriving,
  hasArrived,
  isLoading,
}: ETACardProps) {
  if (isLoading) {
    return (
      <div className="w-full max-w-sm backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl p-4 shadow-xl flex flex-col gap-3 animate-pulse">
        <div className="h-8 bg-white/10 rounded-xl" />
        <div className="flex gap-3">
          <div className="w-8 h-8 bg-white/10 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-white/10 rounded w-1/2" />
            <div className="h-3 bg-white/10 rounded w-1/4" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      {/* Arrival Alert Banner */}
      {isArriving && !hasArrived && (
        <div 
          className="mb-2 backdrop-blur-md bg-emerald-500/90 border-2 border-transparent rounded-xl px-4 py-2.5 shadow-xl flex items-center justify-center gap-2"
          style={{ animation: "pulse-border 1.5s infinite" }}
        >
          <span className="text-lg">🚌</span>
          <div className="flex flex-col text-white">
            <span className="font-black text-sm tracking-wide leading-tight">Your bus is almost here!</span>
            <span className="font-medium text-[10px] leading-tight opacity-90">Arriving at {stopShortName} in ~{etaMinutes} min</span>
          </div>
        </div>
      )}

      {/* Arrived Banner */}
      {hasArrived && (
        <div className="mb-2 bg-green-500 rounded-xl px-4 py-3 shadow-xl flex items-center justify-center gap-2 border-0">
          <span className="text-white font-bold text-sm tracking-wide">✅ Bus has arrived at {stopName}</span>
        </div>
      )}

      {/* Main Glassmorphism ETA Card */}
      {!hasArrived && (
        <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl p-4 shadow-xl w-full flex flex-col gap-3">
          {/* Top: Location Context */}
          <div className="flex items-center gap-2 bg-white/5 px-3 py-2 rounded-xl">
            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500/20 border border-blue-500/50">
              <MapPin className="w-3 h-3 text-blue-400" />
            </div>
            <span className="text-white font-bold text-sm truncate flex-1">{stopName}</span>
          </div>

          {/* Bottom: Live Metrics */}
          <div className="flex items-center gap-3">
            <div className="text-3xl">🚌</div>
            <div className="flex flex-col flex-1 pl-1">
              <div className="flex items-baseline gap-1.5">
                <span className="text-white/70 text-xs font-semibold">Arrives in</span>
                <span className="text-white text-xl font-bold transition-all duration-500 inline-block w-auto min-w-[32px]">
                  {etaMinutes} min
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-blue-300 font-bold text-xs">{distanceKm} km</span>
                <span className="text-white/30 text-xs">•</span>
                <span className="text-white/50 text-xs italic truncate">via {viaRoad}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
