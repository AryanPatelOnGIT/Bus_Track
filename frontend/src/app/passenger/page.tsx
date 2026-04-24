"use client";

import { useState, useEffect, useRef } from "react";
import PassengerMap from "@/components/maps/PassengerMap";
import AccountTab from "@/components/passenger/AccountTab";
import MessagingPanel from "@/components/shared/MessagingPanel";
import FeedbackModal from "@/components/shared/FeedbackModal";
import { useAuth } from "@/hooks/useAuth";
import { useRoutes } from "@/hooks/useRoutes";
import { Map as MapIcon, User, Radio } from "lucide-react";
import { rtdb } from "@/lib/firebase";
import { ref, onValue, off } from "firebase/database";
import { buzzController } from "@/lib/audioUtils";

type Tab = "map" | "account";

interface IncomingBusData {
  busId: string;
  routeId: string;
  lat: number;
  lng: number;
  heading: number;
  speed: number;
  timestamp: number;
  status: "active" | "maintenance" | "idle";
  currentStopIndex?: number;
  delayMinutes?: number;
  driverId?: string;
}

export default function PassengerPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("map");
  const { routes } = useRoutes();
  const [selectedRouteId, setSelectedRouteId] = useState("");
  const [selectedStopId, setSelectedStopId] = useState("");
  const [activeBusesMap, setActiveBusesMap] = useState<Record<string, IncomingBusData>>({});
  const [isMessagingOpen, setIsMessagingOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackBusId, setFeedbackBusId] = useState("");
  const [feedbackDriverId, setFeedbackDriverId] = useState("");
  const trackingBusIdRef = useRef<string | null>(null);
  const trackingDriverIdRef = useRef<string | null>(null);
  const latestBusDriversRef = useRef<Map<string, string>>(new Map());

  // Listen to Firebase Realtime Database for active buses ONE TIME (Consolidated data ingestion)
  useEffect(() => {
    const busesRef = ref(rtdb, "activeBuses");
    const handleSnapshot = onValue(busesRef, (snapshot) => {
      const data = snapshot.val() as Record<string, IncomingBusData>;
      if (data) {
        const filtered: Record<string, IncomingBusData> = {};
        const driverMap = new Map<string, string>();
        Object.entries(data).forEach(([key, bus]) => {
          const isFresh = Date.now() - bus.timestamp < 300000; 
          if (bus.routeId && bus.busId && bus.status === "active" && isFresh) {
            filtered[key] = bus;
            if (bus.driverId) {
              driverMap.set(bus.busId, bus.driverId);
            }
          }
        });
        latestBusDriversRef.current = driverMap;
        setActiveBusesMap(filtered);
      } else {
        setActiveBusesMap({});
      }
    });

    return () => off(busesRef, "value", handleSnapshot);
  }, []);

  const activeRouteIds = Array.from(new Set(Object.values(activeBusesMap).map(b => b.routeId)));
  const activeRouteIdsStr = activeRouteIds.sort().join(',');

  useEffect(() => {
    const currentAvailable = routes.filter(r => activeRouteIds.includes(r.id));
    if (currentAvailable.length > 0) {
      if (!selectedRouteId || !currentAvailable.some(r => r.id === selectedRouteId)) {
        setSelectedRouteId(currentAvailable[0].id);
      }
    } else if (currentAvailable.length === 0 && selectedRouteId) {
      setSelectedRouteId("");
    }
  }, [activeRouteIdsStr, routes.length, selectedRouteId]);

  const availableRoutes = routes.filter(r => activeRouteIds.includes(r.id));
  const activeRoute = availableRoutes.find(r => r.id === selectedRouteId);

  useEffect(() => {
    if (activeRoute && activeRoute.stops && activeRoute.stops.length > 0) {
      if (!selectedStopId || !activeRoute.stops.some(s => s.id === selectedStopId)) {
        setSelectedStopId(activeRoute.stops[activeRoute.stops.length - 1].id);
      }
    }
  }, [activeRoute, selectedStopId]);

  const targetStop = activeRoute?.stops?.find(s => s.id === selectedStopId) || 
    (activeRoute?.stops && activeRoute.stops.length > 0
    ? activeRoute.stops[activeRoute.stops.length - 1]
    : (activeRoute?.waypoints && activeRoute.waypoints.length > 0 ? {
        id: "terminus",
        lat: activeRoute.waypoints[activeRoute.waypoints.length - 1].lat,
        lng: activeRoute.waypoints[activeRoute.waypoints.length - 1].lng,
        name: "Final Destination",
        shortName: "TERMINUS"
      } : {
        id: "live-endpoint",
        lat: 23.0347,
        lng: 72.5483,
        name: "Tracking Area",
        shortName: "LIVE"
      }));

  const activeBusOnRoute = Object.values(activeBusesMap).find(b => b.routeId === selectedRouteId)?.busId;

  useEffect(() => {
    let timerId: NodeJS.Timeout;

    if (activeBusOnRoute) {
      trackingBusIdRef.current = activeBusOnRoute;
      trackingDriverIdRef.current = latestBusDriversRef.current.get(activeBusOnRoute) || null;
    } else if (trackingBusIdRef.current) {
      const finishedBusId = trackingBusIdRef.current;
      const finishedDriverId = trackingDriverIdRef.current;
      timerId = setTimeout(() => {
         setFeedbackBusId(finishedBusId);
         setFeedbackDriverId(finishedDriverId || "");
         setShowFeedbackModal(true);
         trackingBusIdRef.current = null;
         trackingDriverIdRef.current = null;
      }, 1000);
    }

    return () => {
      if (timerId) clearTimeout(timerId);
    };
  }, [activeBusOnRoute]);

  const handleOpenMessaging = () => {
    setIsMessagingOpen(true);
    setUnreadCount(0);
  };

  return (
    <div className="flex flex-col bg-brand-dark text-white overflow-hidden" style={{ height: "100dvh" }}>
      <div className="relative flex-1 flex flex-col overflow-hidden min-h-0">
        <div className={`absolute inset-0 z-0 ${activeTab === "map" ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>
          {activeRoute && targetStop ? (
            <>
              {/* Route Selector & Turbo/Budget Toggle */}
              <div className="absolute top-0 w-full z-40 bg-gradient-to-b from-brand-dark/95 to-transparent pt-safe px-4 pb-10 flex flex-col gap-2.5">
                <div className="flex items-center gap-2 max-w-lg mx-auto w-full mb-1">
                  <div className="flex bg-white/5 border border-white/10 rounded-xl p-1 shrink-0">
                    <button className="px-3 py-1 bg-brand-surface rounded-lg shadow text-[10px] font-black uppercase text-white tracking-widest">Turbo</button>
                    <button className="px-3 py-1 text-[10px] font-black uppercase text-white/50 tracking-widest hover:text-white transition-colors">Budget</button>
                    <button className="px-3 py-1 text-[10px] font-black uppercase text-white/50 tracking-widest hover:text-white transition-colors ml-1" title="Step-Free Routing">♿</button>
                  </div>
                </div>
                <div className="relative w-full max-w-lg mx-auto">
                  <select
                    value={selectedRouteId}
                    onChange={(e) => {
                      setSelectedRouteId(e.target.value);
                      buzzController.unlock();
                    }}
                    className="w-full h-13 backdrop-blur-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-2xl px-5 text-white text-[13px] focus:outline-none focus:ring-2 focus:ring-white/20 shadow-2xl appearance-none font-bold tracking-tight transition-all cursor-pointer"
                    style={{ height: "52px" }}
                  >
                    {availableRoutes.map((r) => (
                      <option key={r.id} value={r.id} className="bg-[#1a1c29] text-white">Route: {r.name}</option>
                    ))}
                  </select>
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-white/30">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </div>
                </div>

                {activeRoute?.stops && activeRoute.stops.length > 0 && (
                  <div className="relative w-full max-w-lg mx-auto">
                    <select
                      value={selectedStopId}
                      onChange={(e) => {
                        setSelectedStopId(e.target.value);
                        buzzController.unlock();
                      }}
                      className="w-full h-11 bg-black/90 hover:bg-black border border-white/15 rounded-2xl px-5 text-white text-[12px] focus:outline-none focus:ring-2 focus:ring-white/40 shadow-2xl appearance-none font-bold tracking-tight transition-all cursor-pointer"
                    >
                      {activeRoute.stops.map((s) => (
                        <option key={s.id} value={s.id} className="bg-black text-white">Alight at: {s.name}</option>
                      ))}
                    </select>
                    <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-white/30">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>

              {/* Messaging FAB — TOP RIGHT */}
              {activeRouteIds.includes(activeRoute.id) && !isMessagingOpen && (
                <div className="absolute top-4 right-4 z-50">
                  <button 
                    onClick={handleOpenMessaging}
                    className="w-12 h-12 rounded-full bg-brand-surface/90 backdrop-blur-xl border border-white/10 text-white flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-all relative"
                    aria-label="Open live comms"
                  >
                    <Radio className="w-5 h-5 text-emerald-400" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-red-500 rounded-full flex items-center justify-center text-[10px] font-black text-white px-1 shadow-lg border border-brand-dark">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </button>
                </div>
              )}

              {/* Messaging Overlay — sits above bottom nav (64px) with safe-area padding */}
              {isMessagingOpen && (
                <div className="absolute inset-x-0 top-20 bottom-[64px] z-50 animate-slide-up flex flex-col"
                  style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
                >
                  <MessagingPanel
                    busId={Object.values(activeBusesMap).find(b => b.routeId === activeRoute.id)?.busId || ""}
                    currentUserRole="passenger"
                    currentUserId={user?.uid || "anonymous"}
                    currentUserName={user?.displayName || "Rider"}
                    isOverlay={true}
                    onClose={() => setIsMessagingOpen(false)}
                    onUnreadCountChange={setUnreadCount}
                  />
                </div>
              )}

              <PassengerMap
                targetStop={targetStop}
                route={activeRoute}
                activeBusesData={activeBusesMap}
              />
            </>
          ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-brand-dark px-8 text-center gap-6">
              {/* Animated bus silhouette */}
              <div className="relative flex items-center justify-center mb-2">
                <div className="absolute w-28 h-28 rounded-full bg-white/3 animate-ping" style={{ animationDuration: '2.5s' }} />
                <div className="absolute w-20 h-20 rounded-full bg-white/5" />
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none" className="relative z-10 opacity-25">
                  <rect x="2" y="5" width="20" height="13" rx="2" stroke="white" strokeWidth="1.5"/>
                  <path d="M7 18v1.5M17 18v1.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M2 10h20" stroke="white" strokeWidth="1"/>
                  <circle cx="6.5" cy="17" r="1.5" fill="white" fillOpacity="0.5"/>
                  <circle cx="17.5" cy="17" r="1.5" fill="white" fillOpacity="0.5"/>
                  <path d="M6 10V7h12v3" stroke="white" strokeWidth="1" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <p className="text-white/50 text-base font-bold tracking-tight mb-1">No drivers online</p>
                <p className="text-white/20 text-xs leading-relaxed">The map will update automatically<br/>when a driver goes live</p>
              </div>
              {/* Subtle route browse hint */}
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/3 border border-white/5">
                <div className="w-1.5 h-1.5 rounded-full bg-white/20 animate-pulse" />
                <span className="text-[10px] text-white/20 font-black uppercase tracking-widest">Listening for fleet updates…</span>
              </div>
            </div>
          )}
        </div>

        {/* Account View */}
        <div className={`absolute inset-0 z-10 flex flex-col bg-brand-dark transition-opacity duration-300 ${activeTab === "account" ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}>
          <AccountTab />
        </div>
      </div>

      {showFeedbackModal && (
        <FeedbackModal
          userId={user?.uid || "anonymous"}
          userName={user?.displayName || "Rider"}
          busId={feedbackBusId}
          driverId={feedbackDriverId}
          onClose={() => setShowFeedbackModal(false)}
        />
      )}

      {/* Bottom Navigation */}
      <nav className="relative z-50 shrink-0 bg-brand-surface/80 border-t border-white/5 backdrop-blur-2xl pb-safe" style={{ height: "64px" }}>
        <div className="flex items-center justify-around px-4 h-full max-w-md mx-auto">
          <button
            onClick={() => setActiveTab("map")}
            className={`flex flex-col items-center justify-center py-2 flex-1 rounded-2xl transition-all duration-300 ${
              activeTab === "map" ? "text-white bg-white/5 transform scale-105" : "text-white/30 hover:text-white/60"
            }`}
          >
            <MapIcon className={`w-5 h-5 mb-1 ${activeTab === "map" ? "text-white" : "opacity-40"}`} />
            <span className="text-[9px] font-black tracking-[0.15em] uppercase">Live Map</span>
          </button>

          <button
            onClick={() => setActiveTab("account")}
            className={`flex flex-col items-center justify-center py-2 flex-1 rounded-2xl transition-all duration-300 ${
              activeTab === "account" ? "text-white bg-white/5 transform scale-105" : "text-white/30 hover:text-white/60"
            }`}
          >
            <User className={`w-5 h-5 mb-1 ${activeTab === "account" ? "text-white" : "opacity-40"}`} />
            <span className="text-[9px] font-black tracking-[0.15em] uppercase">Account</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
