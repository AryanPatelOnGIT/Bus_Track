"use client";

import { useState, useCallback } from "react";

type Mode = "pickup" | "dropoff" | null;
type RequestStatus = "idle" | "pending" | "accepted" | "completed";

interface Props {
  onModeChange?: (mode: Mode) => void;
  pendingLocation?: { lat: number; lng: number } | null;
}

export default function RideHailControls({ onModeChange, pendingLocation }: Props) {
  const [mode, setMode] = useState<Mode>(null);
  const [status, setStatus] = useState<RequestStatus>("idle");
  const [busId] = useState("BUS-001"); // In real impl: from passenger's selection

  function selectMode(m: Mode) {
    setMode(m);
    onModeChange?.(m);
    setStatus("idle");
  }

  const confirmRequest = useCallback(async () => {
    if (!pendingLocation) return;
    setStatus("pending");

    try {
      const { io } = await import("socket.io-client");
      const socket = io(process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000", {
        transports: ["websocket"],
      });
      socket.emit("passenger:request", {
        passengerId: `pax_${Date.now()}`,
        busId,
        type: mode === "pickup" ? "pickup" : "dropoff",
        lat: pendingLocation.lat,
        lng: pendingLocation.lng,
      });
      socket.on("request:updated", () => setStatus("accepted"));
      // Mock accepted for demo
      setTimeout(() => setStatus("accepted"), 1500);
    } catch {
      setStatus("idle");
    }
  }, [mode, pendingLocation, busId]);

  const cancel = () => {
    setMode(null);
    setStatus("idle");
    onModeChange?.(null);
  };

  const statusLabels: Record<RequestStatus, { label: string; color: string; emoji: string }> = {
    idle:     { label: "Tap map to pin location", color: "text-white/50", emoji: "📍" },
    pending:  { label: "Finding your driver…",    color: "text-amber-400", emoji: "⏳" },
    accepted: { label: "Driver is on the way!",   color: "text-green-400", emoji: "🚌" },
    completed:{ label: "Trip complete!",           color: "text-emerald-400", emoji: "✅" },
  };

  const current = statusLabels[status];

  return (
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] w-full max-w-sm px-4">
      <div className="glass rounded-2xl border border-white/10 shadow-2xl overflow-hidden">

        {/* Mode Selector */}
        <div className="flex border-b border-white/10">
          {(["pickup", "dropoff"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => selectMode(mode === m ? null : m)}
              className={`flex-1 py-3 text-sm font-medium transition-all ${
                mode === m
                  ? m === "pickup"
                    ? "bg-green-500/20 text-green-400 border-b-2 border-green-500"
                    : "bg-red-500/20 text-red-400 border-b-2 border-red-500"
                  : "text-white/50 hover:text-white/80"
              }`}
            >
              {m === "pickup" ? "🚏 Request Pickup" : "📍 Request Drop-off"}
            </button>
          ))}
        </div>

        {/* Status */}
        <div className="px-5 py-4">
          {mode ? (
            <div className="space-y-3">
              <p className={`text-sm ${current.color} flex items-center gap-2`}>
                <span>{current.emoji}</span>
                {current.label}
              </p>

              {pendingLocation && status === "idle" && (
                <div className="text-xs text-white/40 font-mono">
                  {pendingLocation.lat.toFixed(5)}, {pendingLocation.lng.toFixed(5)}
                </div>
              )}

              {pendingLocation && status === "idle" && (
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={confirmRequest}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-[#0f4c81] hover:bg-[#0f4c81]/80 text-white transition active:scale-95"
                  >
                    Confirm Request
                  </button>
                  <button
                    onClick={cancel}
                    className="px-4 py-2.5 rounded-xl text-sm text-white/50 hover:text-white border border-white/10 transition"
                  >
                    Cancel
                  </button>
                </div>
              )}

              {status === "pending" && (
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-white/60">Broadcasting request…</span>
                </div>
              )}

              {status === "accepted" && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-green-400 font-medium">Driver assigned ✓</span>
                  <button onClick={cancel} className="text-xs text-white/30 hover:text-white/50 transition">
                    Clear
                  </button>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-white/40 text-center py-1">
              Select a request type above
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
