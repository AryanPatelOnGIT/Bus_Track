"use client";

import { useState, useRef, useEffect } from "react";
import { useRoutes, RouteData, RouteStop, RouteWaypoint } from "@/hooks/useRoutes";
import { Map as GoogleMap, AdvancedMarker, useMapsLibrary, useMap } from "@vis.gl/react-google-maps";
import { doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Trash2, Plus, X, CheckCircle, MapPin, ListOrdered, Navigation2, Loader2, Search, Map as MapIcon } from "lucide-react";

interface SearchBoxProps {
  onPlaceSelect: (place: google.maps.places.PlaceResult) => void;
}

function SearchBox({ onPlaceSelect }: SearchBoxProps) {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const placesLib = useMapsLibrary("places");

  useEffect(() => {
    if (!placesLib || !inputRef.current) return;

    const autocomplete = new placesLib.Autocomplete(inputRef.current, {
      fields: ["geometry", "name", "formatted_address"],
    });

    autocomplete.addListener("place_changed", () => {
      const place = autocomplete.getPlace();
      if (place.geometry && place.geometry.location) {
        onPlaceSelect(place);
        setInputValue("");
      }
    });
  }, [placesLib, onPlaceSelect]);

  return (
    <div className="relative flex-1">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20">
        <Search className="w-4 h-4" />
      </div>
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder="Search for a stop (e.g. Navrangpura)"
        className="w-full h-12 bg-brand-dark border border-white/10 rounded-2xl pl-11 pr-5 text-sm text-white focus:outline-none focus:border-white transition-colors placeholder:text-white/10 font-bold"
      />
    </div>
  );
}

export default function RouteManagementPanel() {
  const { routes, loading } = useRoutes();
  const [isCreating, setIsCreating] = useState(false);
  const [newRouteId, setNewRouteId] = useState("");
  const [newRouteName, setNewRouteName] = useState("");
  const [newStops, setNewStops] = useState<RouteStop[]>([]);
  const [newWaypoints, setNewWaypoints] = useState<RouteWaypoint[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [polylineBakeError, setPolylineBakeError] = useState<string | null>(null);
  const map = useMap();
  const routesLib = useMapsLibrary("routes");

  const handlePlaceSelect = (place: google.maps.places.PlaceResult) => {
    if (!place.geometry?.location) return;

    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();
    const name = place.name || place.formatted_address || "Unknown Stop";

    const stop: RouteStop = {
      id: `stop-${Date.now()}`,
      name: name,
      shortName: name.split(",")[0],
      lat,
      lng,
    };

    setNewStops((prev) => [...prev, stop]);
    // Also add to waypoints automatically for a rough path
    setNewWaypoints((prev) => [...prev, { lat, lng }]);

    if (map) {
      map.panTo({ lat, lng });
      map.setZoom(15);
    }
  };

  const handleMapClick = (e: any) => {
    if (!isCreating || !e.detail?.latLng) return;
    setNewWaypoints((prev) => [...prev, { lat: e.detail.latLng.lat, lng: e.detail.latLng.lng }]);
  };

  const handleRemoveStop = (index: number) => {
    setNewStops((prev) => prev.filter((_, i) => i !== index));
  };

  const handleRemoveWaypoint = (index: number) => {
    setNewWaypoints((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveRoute = async () => {
    if (!newRouteId || !newRouteName || newStops.length < 2) {
      alert("Please provide an ID, Name, and at least 2 stops.");
      return;
    }
    
    setIsSaving(true);
    setPolylineBakeError(null);

    // ── Step 1: Bake polyline via backend (server-side Routes API call) ──
    // If this fails, we still save the route but warn the admin — it will
    // render as a straight-line fallback until manually re-baked.
    const waypointsForBake = newWaypoints.length > 0
      ? newWaypoints
      : newStops.map(s => ({ lat: s.lat, lng: s.lng }));

    let bakedPolyline: string | undefined;
    
    if (routesLib && waypointsForBake.length >= 2) {
      const directionsService = new routesLib.DirectionsService();
      
      const origin = waypointsForBake[0];
      const destination = waypointsForBake[waypointsForBake.length - 1];
      const waypoints = waypointsForBake.slice(1, -1).map(wp => ({
        location: new google.maps.LatLng(wp.lat, wp.lng),
        stopover: false
      }));

      try {
        const result = await directionsService.route({
          origin: new google.maps.LatLng(origin.lat, origin.lng),
          destination: new google.maps.LatLng(destination.lat, destination.lng),
          waypoints: waypoints,
          travelMode: google.maps.TravelMode.DRIVING,
        });

        if (result.routes && result.routes.length > 0) {
          bakedPolyline = result.routes[0].overview_polyline;
        }
      } catch (err: any) {
        const msg = err instanceof Error ? err.message : (err?.message || "Google Routes API failed");
        console.warn("⚠️ Polyline bake failed:", msg);
        setPolylineBakeError(
          `⚠️ Polyline bake failed (${msg}). Route saved with straight-line fallback.`
        );
      }
    } else if (!routesLib) {
      setPolylineBakeError("⚠️ Polyline bake failed (Routes API missing). Route saved with straight-line fallback.");
    }

    // ── Step 2: Save to Firestore (always, even if polyline bake failed) ──
    try {
      const routeData: RouteData = {
        id: newRouteId,
        name: newRouteName,
        stops: newStops,
        waypoints: waypointsForBake,
        color: "#3b82f6",
        ...(bakedPolyline ? { polyline: bakedPolyline } : {}),
      };
      
      await setDoc(doc(db, "routes", newRouteId), routeData);
      
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);
      
      // Only reset form if polyline bake also succeeded
      if (bakedPolyline) {
        setIsCreating(false);
        setNewRouteId("");
        setNewRouteName("");
        setNewStops([]);
        setNewWaypoints([]);
      }
    } catch (err) {
      console.error("Error saving route:", err);
      alert("Failed to save route to Firestore.");
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
    <div className="flex w-full h-[800px] bg-brand-dark/20 rounded-[2.5rem] overflow-hidden border border-white/5 shadow-3xl mx-auto max-w-7xl mt-8 mb-20">
      {/* Sidebar - Route List */}
      <div className="w-[380px] border-r border-white/5 flex flex-col bg-brand-surface/40 overflow-y-auto">
        <div className="p-8 border-b border-white/5 flex items-center justify-between sticky top-0 bg-brand-surface/90 backdrop-blur-xl z-20">
          <h2 className="font-bold text-xl tracking-tight" style={{ fontFamily: "Outfit" }}>Infrastructure</h2>
          <button 
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-brand-dark hover:bg-white/90 transition shadow-xl text-xs font-black uppercase tracking-widest"
          >
            <Plus className="w-3.5 h-3.5" /> ADD
          </button>
        </div>

        <div className="p-6 flex flex-col gap-4">
          {loading ? (
             <div className="flex flex-col items-center justify-center py-20 text-white/20">
               <Loader2 className="w-6 h-6 animate-spin mb-4" />
               <span className="text-[10px] font-bold uppercase tracking-widest">Querying routes...</span>
             </div>
          ) : routes.length === 0 ? (
            <div className="text-white/30 text-xs font-bold text-center py-20 uppercase tracking-widest">No active routes.</div>
          ) : (
            routes.map(route => (
              <div key={route.id} className="group bg-brand-dark/30 border border-white/5 rounded-[1.5rem] p-6 flex flex-col gap-3 hover:bg-white/5 transition-all duration-300">
                <div className="flex justify-between items-start">
                   <div className="space-y-1">
                    <h3 className="font-bold text-white tracking-tight group-hover:text-white transition-colors">{route.name}</h3>
                    <div className="text-[10px] text-white/20 font-mono tracking-widest uppercase">{route.id}</div>
                  </div>
                  <button onClick={() => handleDeleteRoute(route.id)} className="p-2.5 rounded-xl bg-white/5 text-red-400 hover:bg-red-500 hover:text-white transition-all opacity-0 group-hover:opacity-100 shadow-xl">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-2">
                   <div className="px-3 py-1 rounded-full bg-white/5 border border-white/5 text-[9px] font-black tracking-widest text-white/40 uppercase">
                     {route.stops?.length || 0} STOPS
                   </div>
                   <div className="px-3 py-1 rounded-full bg-white/5 border border-white/5 text-[9px] font-black tracking-widest text-white/40 uppercase">
                     {route.waypoints?.length || 0} NODES
                   </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Content Area - Editor */}
      <div className="flex-1 flex flex-col relative bg-brand-dark/40">
        {!isCreating ? (
          <div className="flex-1 flex flex-col items-center justify-center text-white/20 text-center p-12">
            <div className="w-20 h-20 rounded-[2rem] bg-white/5 flex items-center justify-center mb-8">
               <Navigation2 className="w-8 h-8 text-white/10" />
            </div>
            <p className="text-sm font-bold uppercase tracking-[0.2em]">Select &apos;ADD&apos; to initialize new route geometry</p>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {/* Editor Toolbar */}
            <div className="p-6 border-b border-white/5 bg-brand-surface/90 backdrop-blur-2xl flex flex-col gap-6 z-10 shadow-lg">
               <div className="flex gap-6 items-end w-full">
                <div className="flex flex-col gap-2 flex-1">
                  <label className="text-[10px] text-white/20 font-black uppercase tracking-[0.2em] px-1">Route ID</label>
                  <input 
                    type="text" 
                    value={newRouteId} 
                    onChange={(e) => setNewRouteId(e.target.value)} 
                    placeholder="e.g. route_101"
                    className="h-12 bg-brand-dark border border-white/10 rounded-2xl px-5 text-sm text-white focus:outline-none focus:border-white transition-colors placeholder:text-white/10 font-bold"
                  />
                </div>
                <div className="flex flex-col gap-2 flex-[2]">
                  <label className="text-[10px] text-white/20 font-black uppercase tracking-[0.2em] px-1">Display Name</label>
                  <input 
                    type="text" 
                    value={newRouteName} 
                    onChange={(e) => setNewRouteName(e.target.value)} 
                    placeholder="e.g. Downtown Express"
                    className="h-12 bg-brand-dark border border-white/10 rounded-2xl px-5 text-sm text-white focus:outline-none focus:border-white transition-colors placeholder:text-white/10 font-bold"
                  />
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={handleSaveRoute} 
                    disabled={isSaving || newStops.length < 2}
                    className="h-12 px-8 rounded-2xl bg-white text-brand-dark font-black transition disabled:opacity-20 disabled:cursor-not-allowed shadow-2xl text-xs uppercase tracking-[0.15em] flex items-center gap-2"
                  >
                    {isSaving ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Baking...</>
                    ) : (
                      "Deploy Route"
                    )}
                  </button>
                  <button 
                    onClick={() => setIsCreating(false)}
                    className="h-12 px-6 rounded-2xl border border-white/5 text-white/40 hover:text-white transition-all text-xs font-black uppercase tracking-widest"
                  >
                    Cancel
                  </button>
                </div>
               </div>

               <div className="flex items-center gap-4 w-full">
                  <SearchBox onPlaceSelect={handlePlaceSelect} />
                  <div className="h-12 w-px bg-white/5" />
                  <div className="text-[10px] text-white/20 font-black uppercase tracking-widest leading-tight">
                    Search keywords to find stops<br/>or click map for path nodes
                  </div>
               </div>
            </div>

            {showSuccess && (
              <div className="absolute top-40 left-1/2 -translate-x-1/2 z-[100] bg-white text-brand-dark px-10 py-4 rounded-[2rem] shadow-3xl font-black uppercase tracking-widest animate-bounce flex items-center gap-3">
                 <CheckCircle className="w-5 h-5" /> Operation Success
              </div>
            )}

            {/* Polyline bake warning — sits below success toast to avoid overlap */}
            {polylineBakeError && (
              <div className="absolute top-56 left-1/2 -translate-x-1/2 z-[100] bg-amber-500 text-white px-8 py-3 rounded-[2rem] shadow-3xl font-bold text-xs uppercase tracking-widest flex items-center gap-3 max-w-lg text-center">
                {polylineBakeError}
                <button
                  onClick={() => setPolylineBakeError(null)}
                  className="ml-2 text-white/70 hover:text-white transition-colors shrink-0"
                  aria-label="Dismiss warning"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Editor Body */}
            <div className="flex-1 flex relative">
               <div className="flex-1 relative">
                 <GoogleMap
                    defaultCenter={{ lat: 23.0347, lng: 72.5483 }}
                    defaultZoom={13}
                    disableDefaultUI={false}
                    mapId="d1d1d1d1d1d1d1"
                    onClick={handleMapClick}
                 >
                    {/* Render Stops */}
                    {newStops.map((stop, i) => (
                      <AdvancedMarker key={`stop-${i}`} position={{ lat: stop.lat, lng: stop.lng }}>
                        <div className="relative group">
                          <div className="w-10 h-10 rounded-2xl bg-emerald-500 border-4 border-brand-dark flex items-center justify-center text-white text-[11px] font-black shadow-2xl">
                            <MapPin className="w-5 h-5" />
                          </div>
                          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1 bg-brand-dark/90 backdrop-blur-md rounded-lg border border-white/10 text-[9px] font-black text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-widest z-50">
                            {stop.shortName}
                          </div>
                        </div>
                      </AdvancedMarker>
                    ))}

                    {/* Render Waypoints */}
                    {newWaypoints.map((wp, i) => (
                      <AdvancedMarker key={`wp-${i}`} position={wp}>
                        <div className="w-6 h-6 rounded-xl bg-white border-4 border-brand-dark flex items-center justify-center text-brand-dark text-[9px] font-black shadow-2xl opacity-50">
                          {i + 1}
                        </div>
                      </AdvancedMarker>
                    ))}
                 </GoogleMap>
               </div>

               {/* Sequence Sidebar */}
               <div className="w-[360px] border-l border-white/5 bg-brand-surface/30 backdrop-blur-2xl flex flex-col overflow-hidden">
                 <div className="flex flex-col h-full">
                    {/* Stops List */}
                    <div className="flex-1 flex flex-col min-h-0 border-b border-white/5">
                      <div className="p-6 bg-emerald-500/5 flex items-center justify-between">
                         <div className="flex items-center gap-3">
                            <MapPin className="w-4 h-4 text-emerald-400" />
                            <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-400">Route Stops</h3>
                         </div>
                         <span className="text-[10px] font-black text-emerald-400/40 bg-emerald-400/10 px-2 py-0.5 rounded-md">{newStops.length}</span>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
                        {newStops.length === 0 ? (
                           <div className="flex-1 flex flex-col items-center justify-center py-12 text-center opacity-10">
                              <Search className="w-8 h-8 mb-3" />
                              <p className="text-[9px] font-bold uppercase tracking-widest leading-relaxed">Search to add official stops<br/>(Stations / Points of Interest)</p>
                           </div>
                        ) : (
                           newStops.map((stop, i) => (
                             <div key={i} className="flex items-center justify-between bg-brand-dark/40 border border-emerald-500/20 rounded-2xl p-4 text-xs group hover:bg-emerald-500/10 transition-all">
                               <div className="flex items-center gap-4">
                                 <span className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-black shadow-lg shadow-emerald-500/20 text-[10px] uppercase">{i + 1}</span>
                                 <div className="flex flex-col overflow-hidden">
                                   <span className="text-white font-bold truncate pr-2 tracking-tight">{stop.name}</span>
                                   <span className="text-emerald-400/30 font-mono text-[8px] uppercase tracking-widest">{stop.shortName}</span>
                                 </div>
                               </div>
                               <button onClick={() => handleRemoveStop(i)} className="p-2 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100">
                                  <X className="w-4 h-4" />
                               </button>
                             </div>
                           ))
                        )}
                      </div>
                    </div>

                    {/* Waypoints List */}
                    <div className="h-[280px] flex flex-col bg-brand-dark/20 min-h-0">
                      <div className="p-6 border-b border-white/5 flex items-center justify-between">
                         <div className="flex items-center gap-3">
                            <ListOrdered className="w-4 h-4 text-white/20" />
                            <h3 className="text-[10px] font-black uppercase tracking-[0.25em] text-white/40">Path Geometry</h3>
                         </div>
                         <div className="flex gap-2">
                            <button 
                              onClick={() => setNewWaypoints([])}
                              className="text-[9px] font-black text-white/20 hover:text-red-400 uppercase tracking-widest transition-colors"
                            >
                              Clear Path
                            </button>
                         </div>
                      </div>
                      
                      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
                        {newWaypoints.length === 0 ? (
                           <div className="flex-1 flex flex-col items-center justify-center py-10 text-center opacity-5">
                              <MapIcon className="w-6 h-6 mb-2" />
                              <p className="text-[8px] font-bold uppercase tracking-widest">Map click to define<br/>detailed route trail</p>
                           </div>
                        ) : (
                           newWaypoints.map((wp, i) => (
                             <div key={i} className="flex items-center justify-between bg-brand-dark/40 border border-white/5 rounded-xl px-4 py-2 text-xs group hover:bg-white/5 transition-all">
                               <div className="flex items-center gap-3">
                                 <span className="w-5 h-5 rounded-md bg-white/5 border border-white/10 text-white/30 flex items-center justify-center font-black text-[8px] group-hover:bg-white group-hover:text-brand-dark transition-all">{i + 1}</span>
                                 <div className="flex flex-col text-white/10 font-mono text-[8px] tracking-tight">
                                   <span>{wp.lat.toFixed(5)}, {wp.lng.toFixed(5)}</span>
                                 </div>
                               </div>
                               <button onClick={() => handleRemoveWaypoint(i)} className="p-1.5 rounded-md text-white/10 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100">
                                  <X className="w-3 h-3" />
                               </button>
                             </div>
                           ))
                        )}
                      </div>
                    </div>
                 </div>
               </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
