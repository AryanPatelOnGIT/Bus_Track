"use client";

import { useState } from "react";
import { useRoutes, RouteData, RouteWaypoint } from "@/hooks/useRoutes";
import { Map as GoogleMap, AdvancedMarker, useMap } from "@vis.gl/react-google-maps";
import { collection, doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function RouteManagementPanel() {
  const { routes, loading } = useRoutes();
  const [isCreating, setIsCreating] = useState(false);
  const [newRouteId, setNewRouteId] = useState("");
  const [newRouteName, setNewRouteName] = useState("");
  const [newWaypoints, setNewWaypoints] = useState<RouteWaypoint[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Function to handle map clicks for adding waypoints
  const handleMapClick = (e: any) => {
    if (!isCreating || !e.detail?.latLng) return;
    setNewWaypoints((prev) => [...prev, { lat: e.detail.latLng.lat, lng: e.detail.latLng.lng }]);
  };

  const handleRemoveWaypoint = (index: number) => {
    setNewWaypoints((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveRoute = async () => {
    if (!newRouteId || !newRouteName || newWaypoints.length < 2) {
      alert("Please provide an ID, Name, and at least 2 stops.");
      return;
    }
    
    setIsSaving(true);
    try {
      const routeData: RouteData = {
        id: newRouteId,
        name: newRouteName,
        waypoints: newWaypoints,
        color: "#3b82f6" // Default blue
      };
      
      await setDoc(doc(db, "routes", newRouteId), routeData);
      
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      
      // Reset form
      setIsCreating(false);
      setNewRouteId("");
      setNewRouteName("");
      setNewWaypoints([]);
    } catch (err) {
      console.error("Error saving route:", err);
      alert("Failed to save route. Check permissions.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRoute = async (id: string) => {
    if (confirm("Are you sure you want to delete this route?")) {
      try {
        await deleteDoc(doc(db, "routes", id));
      } catch (e) {
        console.error("Error deleting route:", e);
      }
    }
  };

  return (
    <div className="flex w-full h-full bg-brand-dark/50">
      {/* Sidebar - Route List */}
      <div className="w-[350px] border-r border-white/10 flex flex-col glass overflow-y-auto">
        <div className="p-5 border-b border-white/10 flex items-center justify-between sticky top-0 bg-brand-dark/90 backdrop-blur z-10">
          <h2 className="font-bold text-lg" style={{ fontFamily: "Outfit" }}>Active Routes</h2>
          <button 
            onClick={() => setIsCreating(true)}
            className="p-2 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition shadow-sm text-sm font-bold"
          >
            + ADD
          </button>
        </div>

        <div className="p-4 flex flex-col gap-3">
          {loading ? (
            <div className="text-white/40 text-sm text-center py-5">Loading routes...</div>
          ) : routes.length === 0 ? (
            <div className="text-white/40 text-sm text-center py-5">No routes found.</div>
          ) : (
            routes.map(route => (
              <div key={route.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <h3 className="font-semibold text-white truncate max-w-[200px]">{route.name}</h3>
                  <button onClick={() => handleDeleteRoute(route.id)} className="text-red-400 hover:text-red-300 pointer" title="Delete string">🗑️</button>
                </div>
                <div className="text-xs text-white/50 font-mono">{route.id}</div>
                <div className="text-xs text-blue-400 mt-1">{route.waypoints.length} Stops defined</div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Content Area - Editor */}
      <div className="flex-1 flex flex-col relative">
        {!isCreating ? (
          <div className="flex-1 flex items-center justify-center text-white/40">
            <div className="text-center">
              <span className="text-4xl block mb-2">🗺️</span>
              Select "+ ADD" to create a new route
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {/* Editor Toolbar */}
            <div className="p-4 border-b border-white/10 bg-brand-surface glass flex gap-4 items-end z-10 shadow-lg">
               <div className="flex flex-col gap-1 flex-1">
                 <label className="text-xs text-white/50 uppercase tracking-widest">Route ID (Unique)</label>
                 <input 
                   type="text" 
                   value={newRouteId} 
                   onChange={(e) => setNewRouteId(e.target.value)} 
                   placeholder="e.g. route_101"
                   className="bg-brand-dark border border-white/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                 />
               </div>
               <div className="flex flex-col gap-1 flex-[2]">
                 <label className="text-xs text-white/50 uppercase tracking-widest">Route Name</label>
                 <input 
                   type="text" 
                   value={newRouteName} 
                   onChange={(e) => setNewRouteName(e.target.value)} 
                   placeholder="e.g. Downtown to Airport"
                   className="bg-brand-dark border border-white/20 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                 />
               </div>
               <div className="flex gap-2">
                 <button 
                    onClick={() => {
                      if (confirm("Clear all stops?")) setNewWaypoints([]);
                    }}
                    className="px-4 py-2 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition text-xs font-bold"
                 >
                   Clear
                 </button>
                 <button 
                   onClick={() => setIsCreating(false)} 
                   className="px-4 py-2 rounded-lg border border-white/20 text-white/70 hover:bg-white/5 hover:text-white transition text-xs font-bold"
                 >
                   Cancel
                 </button>
                 <button 
                   onClick={handleSaveRoute} 
                   disabled={isSaving || newWaypoints.length < 2}
                   className="px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/20 text-xs uppercase tracking-widest"
                 >
                   {isSaving ? "Saving..." : "Create Route"}
                 </button>
               </div>
            </div>

            {showSuccess && (
              <div className="absolute top-24 left-1/2 -translate-x-1/2 z-[100] bg-emerald-500 text-white px-6 py-3 rounded-2xl shadow-2xl font-bold animate-bounce flex items-center gap-2">
                 <span className="text-xl">✅</span> Route Saved Successfully!
              </div>
            )}

            {/* Editor Body */}
            <div className="flex-1 flex relative">
               {/* Click-to-add Map */}
               <div className="flex-1 relative">
                 <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-black/80 text-white px-4 py-2 rounded-full text-xs font-bold border border-white/20 shadow-lg pointer-events-none fade-in">
                    Click on the map to add stops sequentially
                 </div>
                 <GoogleMap
                    defaultCenter={{ lat: 23.0347, lng: 72.5483 }}
                    defaultZoom={13}
                    disableDefaultUI={false}
                    mapId="d1d1d1d1d1d1d1"
                    onClick={handleMapClick}
                 >
                    {newWaypoints.map((wp, i) => (
                      <AdvancedMarker key={`wp-${i}`} position={wp}>
                        <div className="w-6 h-6 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center text-white text-[10px] font-bold shadow-md">
                          {i + 1}
                        </div>
                      </AdvancedMarker>
                    ))}
                    {/* Add straight lines to connect points for preview */}
                 </GoogleMap>
               </div>

               {/* Waypoints List Sidebar */}
               <div className="w-[300px] border-l border-white/10 bg-brand-surface glass flex flex-col p-4 overflow-y-auto">
                 <h3 className="text-sm font-bold uppercase tracking-wider mb-4 border-b border-white/10 pb-2">Stops Sequence</h3>
                 {newWaypoints.length === 0 ? (
                    <div className="text-xs text-white/40 italic text-center mt-4">No stops added yet.</div>
                 ) : (
                    <div className="flex flex-col gap-2">
                      {newWaypoints.map((wp, i) => (
                        <div key={i} className="flex items-center justify-between bg-black/20 border border-white/10 rounded-lg p-3 text-xs">
                          <div className="flex items-center gap-3">
                            <span className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">{i + 1}</span>
                            <div className="flex flex-col text-white/70 font-mono text-[10px]">
                              <span>{wp.lat.toFixed(4)},</span>
                              <span>{wp.lng.toFixed(4)}</span>
                            </div>
                          </div>
                          <button onClick={() => handleRemoveWaypoint(i)} className="text-red-400 hover:text-red-300 p-1">✕</button>
                        </div>
                      ))}
                    </div>
                 )}
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
