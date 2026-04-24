"use client";

import { useState, useEffect } from "react";
import { User, LogOut, ChevronRight, LogIn, MessageSquare, Bell, BellOff } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import FeedbackModal from "@/components/shared/FeedbackModal";
import { buzzController } from "@/lib/audioUtils";

export default function AccountTab() {
  const { user, loginWithGoogle, logout } = useAuth();
  const [showFeedback, setShowFeedback] = useState(false);
  const [buzzerEnabled, setBuzzerEnabledState] = useState(true);

  // Read persisted buzzer preference on mount
  useEffect(() => {
    setBuzzerEnabledState(buzzController.getBuzzerEnabled());
  }, []);

  const handleToggleBuzzer = () => {
    const next = !buzzerEnabled;
    buzzController.setBuzzerEnabled(next);
    setBuzzerEnabledState(next);
    // Play a soft preview buzz when toggling ON so the user knows it's working
    if (next) {
      buzzController.unlock();
      buzzController.playBuzz([200, 80, 200]);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-brand-dark p-6 flex flex-col items-center">
      <div className="w-full max-w-lg space-y-6 mt-10">
        {/* Profile Header */}
        <div className="flex flex-col items-center gap-5">
          <div className="w-24 h-24 rounded-[2rem] bg-brand-surface border border-white/5 flex items-center justify-center text-white/10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 blur-2xl" />
            {user?.photoURL ? (
              <img src={user.photoURL} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <User className="w-10 h-10 text-white/40" />
            )}
          </div>
          <div className="text-center">
            {user ? (
              <>
                <h2 className="text-2xl font-bold tracking-tight text-white mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>
                  {user.displayName || "Rider"}
                </h2>
                <span className="text-xs font-black text-blue-400 uppercase tracking-[0.25em]">
                  {(user as any).role?.toUpperCase() || "PASSENGER"}
                </span>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-bold tracking-tight text-white mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>
                  Guest Rider
                </h2>
                <span className="text-xs font-black text-white/20 uppercase tracking-[0.25em]">
                  UNVERIFIED
                </span>
              </>
            )}
          </div>
        </div>

        {/* Actions List */}
        <div className="bg-brand-surface border border-white/5 rounded-[1.5rem] overflow-hidden shadow-2xl">
          <button
            onClick={() => setShowFeedback(true)}
            className="w-full flex items-center justify-between p-5 border-b border-white/5 bg-transparent hover:bg-white/5 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                <MessageSquare className="w-4 h-4 text-white/60 group-hover:text-emerald-400" />
              </div>
              <span className="text-sm font-bold tracking-tight text-white/80 group-hover:text-white">Give Feedback</span>
            </div>
            <ChevronRight className="w-4 h-4 text-white/10 group-hover:text-white/40 transition-colors" />
          </button>

          {user ? (
            <button
              onClick={logout}
              className="w-full flex items-center justify-between p-5 bg-transparent hover:bg-white/5 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center group-hover:bg-red-500/20 transition-colors">
                  <LogOut className="w-4 h-4 text-red-500/80" />
                </div>
                <span className="text-sm font-bold tracking-tight text-red-400">Log Out</span>
              </div>
              <ChevronRight className="w-4 h-4 text-white/10 group-hover:text-white/40 transition-colors" />
            </button>
          ) : (
            <button
              onClick={loginWithGoogle}
              className="w-full flex items-center justify-between p-5 bg-transparent hover:bg-[#0071e3]/20 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-xl bg-[#0071e3]/20 flex items-center justify-center group-hover:bg-[#0071e3]/40 transition-colors">
                  <LogIn className="w-4 h-4 text-[#0071e3]" />
                </div>
                <span className="text-sm font-bold tracking-tight text-[#0071e3]">Sign in with Google</span>
              </div>
              <ChevronRight className="w-4 h-4 text-white/10 group-hover:text-white/40 transition-colors" />
            </button>
          )}
        </div>

        {/* Preferences Section */}
        <div>
          <p className="text-[10px] text-white/20 font-black uppercase tracking-[0.2em] px-1 mb-2">Preferences</p>
          <div className="bg-brand-surface border border-white/5 rounded-[1.5rem] overflow-hidden shadow-2xl">
            {/* Arrival Alert Toggle */}
            <button
              onClick={handleToggleBuzzer}
              className="w-full flex items-center justify-between p-5 bg-transparent hover:bg-white/5 transition-all group"
              aria-label={`Arrival alert buzzer is ${buzzerEnabled ? "on" : "off"}. Tap to toggle.`}
            >
              <div className="flex items-center gap-4">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${buzzerEnabled ? "bg-emerald-500/20" : "bg-white/5"}`}>
                  {buzzerEnabled
                    ? <Bell className="w-4 h-4 text-emerald-400" />
                    : <BellOff className="w-4 h-4 text-white/30" />
                  }
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-sm font-bold tracking-tight text-white/80 group-hover:text-white">Arrival Alert</span>
                  <span className="text-[10px] text-white/30 font-medium mt-0.5">
                    {buzzerEnabled ? "Buzzer sounds when bus arrives" : "Buzzer is muted"}
                  </span>
                </div>
              </div>
              {/* iOS-style pill toggle */}
              <div
                className={`relative w-12 h-6 rounded-full transition-all duration-300 shrink-0 ${buzzerEnabled ? "bg-emerald-500" : "bg-white/10 border border-white/10"}`}
              >
                <div
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300 ${buzzerEnabled ? "left-[26px]" : "left-0.5"}`}
                />
              </div>
            </button>
          </div>
        </div>

        {showFeedback && (
          <FeedbackModal
            userId={user?.uid || "anonymous"}
            userName={user?.displayName || "Guest Rider"}
            onClose={() => setShowFeedback(false)}
          />
        )}

        {/* Version Info */}
        <p className="text-center text-[10px] text-white/10 font-bold uppercase tracking-widest pb-8">
          Nakshatra Nav v2.1.0 • Live
        </p>
      </div>
    </div>
  );
}
