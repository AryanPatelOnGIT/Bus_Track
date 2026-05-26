'use client';

import { useState, useRef, useEffect } from 'react';
import { useRoutes, RouteData, RouteStop } from '@/hooks/useRoutes';
import { Map as GoogleMap, AdvancedMarker, useMapsLibrary, useMap } from '@vis.gl/react-google-maps';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  Trash2, Plus, X, CheckCircle, MapPin,
  Loader2, Search, ChevronDown, ChevronUp,
} from 'lucide-react';

function stopLabel(index: number): string {
  const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (index < 26) return alpha[index];
  return alpha[Math.floor(index / 26) - 1] + alpha[index % 26];
}

interface SearchBoxProps {
  onPlaceSelect: (place: google.maps.places.PlaceResult) => void;
}

function SearchBox({ onPlaceSelect }: SearchBoxProps) {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const placesLib = useMapsLibrary('places');

  useEffect(() => {
    if (!placesLib || !inputRef.current) return;
    const autocomplete = new placesLib.Autocomplete(inputRef.current, {
      fields: ['geometry', 'name', 'formatted_address'],
    });
    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place.geometry?.location) {
        onPlaceSelect(place);
        setInputValue('');
      }
    });
  }, [placesLib, onPlaceSelect]);

  return (
    <div className="relative flex-1">
      <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555555] pointer-events-none">
        <Search className="w-4 h-4" />
      </div>
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder="Search for a stop…"
        className="w-full h-10 bg-[#0A0A0A] border border-[#333333] rounded-xl pl-10 pr-4 text-sm text-[#F5F5F5] focus:outline-none focus:border-[#888888] transition-colors placeholder:text-[#555555] font-[family-name:var(--font-inter)]"
      />
    </div>
  );
}

function RouteCard({
  route,
  onDelete,
}: {
  route: RouteData;
  onDelete: (id: string) => void;
}) {
  const [stopsOpen, setStopsOpen] = useState(false);

  return (
    <div className="group bg-[#141414] border border-[#222222] rounded-[1.2rem] overflow-hidden hover:bg-[#1A1A1A] transition-all duration-300">
      <div className="flex justify-between items-start p-4 gap-3">
        <div className="space-y-1 min-w-0">
          <h3 className="font-bold text-[#F5F5F5] tracking-tight truncate">{route.name}</h3>
          <div className="text-[10px] text-[#555555] font-[family-name:var(--font-dm-mono)] tracking-widest uppercase">{route.id}</div>
        </div>
        <button
          onClick={() => onDelete(route.id)}
          className="p-2 rounded-xl bg-[#222222] text-[#C0392B] hover:bg-[#C0392B] hover:text-[#F5F5F5] transition-all opacity-0 group-hover:opacity-100 shadow-xl shrink-0"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="px-4 pb-3 flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setStopsOpen((o) => !o)}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#222222] border border-[#333333] text-[9px] font-black tracking-widest text-[#888888] uppercase hover:bg-[#333333] hover:text-[#F5F5F5] transition-all"
        >
          <MapPin className="w-2.5 h-2.5" />
          {route.stops?.length || 0} Stops
          {stopsOpen ? (
            <ChevronUp className="w-2.5 h-2.5 ml-0.5" />
          ) : (
            <ChevronDown className="w-2.5 h-2.5 ml-0.5" />
          )}
        </button>
      </div>

      {stopsOpen && route.stops && route.stops.length > 0 && (
        <div className="border-t border-[#222222] px-4 py-3 flex flex-col gap-0">
          {route.stops.map((stop, i) => (
            <div key={i} className="flex items-stretch gap-3">
              <div className="flex flex-col items-center shrink-0">
                <div className="w-7 h-7 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400 font-black text-[10px] shrink-0 font-[family-name:var(--font-dm-mono)]">
                  {stopLabel(i)}
                </div>
                {i < route.stops!.length - 1 && (
                  <div className="flex-1 w-px my-1 bg-[#333333] min-h-[14px]" />
                )}
              </div>
              <div className="pb-3 flex flex-col justify-center min-w-0">
                <span className="text-sm font-bold text-[#F5F5F5] leading-tight truncate">
                  {stop.name}
                </span>
                {stop.shortName && stop.shortName !== stop.name && (
                  <span className="text-[9px] text-[#555555] font-[family-name:var(--font-dm-mono)] tracking-widest truncate">
                    {stop.shortName}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function RouteManagementPanel() {
  const { routes, loading } = useRoutes();
  const [isCreating, setIsCreating] = useState(false);
  const [newRouteId, setNewRouteId] = useState('');
  const [newRouteName, setNewRouteName] = useState('');
  const [newStops, setNewStops] = useState<RouteStop[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [polylineBakeError, setPolylineBakeError] = useState<string | null>(null);
  const map = useMap();

  const handlePlaceSelect = (place: google.maps.places.PlaceResult) => {
    if (!place.geometry?.location) return;
    const lat = place.geometry.location.lat();
    const lng = place.geometry.location.lng();
    const name = place.name || place.formatted_address || 'Unknown Stop';
    const stop: RouteStop = {
      id: `stop-${Date.now()}`,
      name,
      shortName: name.split(',')[0],
      lat,
      lng,
    };
    setNewStops((prev) => [...prev, stop]);
    if (map) { map.panTo({ lat, lng }); map.setZoom(15); }
  };

  const handleRemoveStop = (index: number) =>
    setNewStops((prev) => prev.filter((_, i) => i !== index));

  const handleSaveRoute = async () => {
    if (!newRouteId || !newRouteName || newStops.length < 2) {
      alert('Please provide an ID, Name, and at least 2 stops.');
      return;
    }
    setIsSaving(true);
    setPolylineBakeError(null);

    const waypointsForBake = newStops.map((s) => ({ lat: s.lat, lng: s.lng }));
    let bakedPolyline: string | undefined;

    try {
      const { auth } = await import('@/lib/firebase');
      const { getIdToken } = await import('firebase/auth');
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('Must be logged in to create routes');
      const token = await getIdToken(currentUser);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
      const polyRes = await fetch(`${backendUrl}/api/routes/compute-polyline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ waypoints: waypointsForBake }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!polyRes.ok) {
        const errData = (await polyRes.json().catch(() => ({}))) as Record<string, string>;
        throw new Error(errData.error || `HTTP ${polyRes.status}`);
      }
      const polyData = (await polyRes.json()) as { polyline: string };
      bakedPolyline = polyData.polyline;
    } catch (err) {
      const isTimeout = err instanceof Error && err.name === 'AbortError';
      const msg = isTimeout ? 'Backend unreachable (timeout)' : err instanceof Error ? err.message : 'Unknown error';
      console.warn('⚠️ Polyline bake failed:', msg);
      setPolylineBakeError(`⚠️ Polyline bake skipped (${msg}). Route saved with straight-line fallback.`);
    }

    try {
      const routeData: RouteData = {
        id: newRouteId,
        name: newRouteName,
        stops: newStops,
        waypoints: waypointsForBake,
        color: '#E8E8E8',
        ...(bakedPolyline ? { polyline: bakedPolyline } : {}),
      };
      await setDoc(doc(db, 'routes', newRouteId), routeData);

      setIsCreating(false);
      setNewRouteId('');
      setNewRouteName('');
      setNewStops([]);

      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 5000);
    } catch (err) {
      console.error('Error saving route:', err);
      alert('Failed to save route to Firestore. Check your permissions.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteRoute = async (id: string) => {
    if (confirm('Are you sure you want to delete this route?')) {
      try {
        await deleteDoc(doc(db, 'routes', id));
      } catch (e) {
        console.error('Error deleting route:', e);
      }
    }
  };

  if (!isCreating) {
    return (
      <div className="w-full max-w-4xl mx-auto p-3 md:p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-xl tracking-tight text-[#F5F5F5]">Infrastructure</h2>
            <p className="text-[10px] text-[#555555] uppercase tracking-[0.2em] font-black mt-0.5">Saved Routes</p>
          </div>
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#F5F5F5] text-[#0A0A0A] hover:bg-[#E8E8E8] transition shadow-xl text-xs font-black uppercase tracking-widest"
          >
            <Plus className="w-3.5 h-3.5" /> ADD ROUTE
          </button>
        </div>

        {showSuccess && (
          <div className="flex items-center gap-2 bg-[#27AE60]/20 border border-[#27AE60]/30 text-[#27AE60] rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-widest">
            <CheckCircle className="w-4 h-4 shrink-0" /> Route deployed successfully!
          </div>
        )}

        <div className="flex flex-col gap-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-[#555555]">
              <Loader2 className="w-6 h-6 animate-spin mb-3" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Querying routes…</span>
            </div>
          ) : routes.length === 0 ? (
            <div className="text-[#555555] text-xs font-bold text-center py-16 uppercase tracking-widest">
              No active routes.
            </div>
          ) : (
            routes.map((route) => (
              <RouteCard key={route.id} route={route} onDelete={handleDeleteRoute} />
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full" style={{ height: 'calc(100vh - 56px)' }}>
      <div className="shrink-0 border-b border-[#222222] bg-[#141414]/90 backdrop-blur-2xl z-10 shadow-lg px-3 md:px-5 py-3 flex flex-col gap-3">
        <div className="flex flex-wrap gap-2 items-end">
          <div className="flex flex-col gap-1 flex-1 min-w-[130px]">
            <label className="text-[9px] text-[#555555] font-black uppercase tracking-[0.2em] px-1">Route ID</label>
            <input
              type="text"
              value={newRouteId}
              onChange={(e) => setNewRouteId(e.target.value)}
              placeholder="e.g. route_101"
              className="h-9 bg-[#0A0A0A] border border-[#333333] rounded-xl px-3 text-sm text-[#F5F5F5] focus:outline-none focus:border-[#888888] transition-colors placeholder:text-[#333333] font-bold"
            />
          </div>
          <div className="flex flex-col gap-1 flex-[2] min-w-[160px]">
            <label className="text-[9px] text-[#555555] font-black uppercase tracking-[0.2em] px-1">Display Name</label>
            <input
              type="text"
              value={newRouteName}
              onChange={(e) => setNewRouteName(e.target.value)}
              placeholder="e.g. Downtown Express"
              className="h-9 bg-[#0A0A0A] border border-[#333333] rounded-xl px-3 text-sm text-[#F5F5F5] focus:outline-none focus:border-[#888888] transition-colors placeholder:text-[#333333] font-bold"
            />
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={handleSaveRoute}
              disabled={isSaving || newStops.length < 2}
              className="h-9 px-4 rounded-xl bg-[#F5F5F5] text-[#0A0A0A] font-black transition disabled:opacity-20 disabled:cursor-not-allowed shadow-2xl text-xs uppercase tracking-[0.15em] flex items-center gap-2"
            >
              {isSaving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Baking…</> : 'Deploy'}
            </button>
            <button
              onClick={() => setIsCreating(false)}
              className="h-9 px-4 rounded-xl border border-[#333333] text-[#888888] hover:text-[#F5F5F5] hover:border-[#555555] transition-all text-xs font-black uppercase tracking-widest"
            >
              Cancel
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <SearchBox onPlaceSelect={handlePlaceSelect} />
          <span className="hidden md:inline text-[9px] text-[#555555] font-black uppercase tracking-widest shrink-0">
            Min. 2 stops to deploy
          </span>
        </div>

        {polylineBakeError && (
          <div className="flex items-center gap-2 bg-amber-500/20 border border-amber-500/30 text-amber-400 rounded-xl px-4 py-2 text-xs font-bold">
            <span className="flex-1">{polylineBakeError}</span>
            <button onClick={() => setPolylineBakeError(null)} className="shrink-0 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
        <div className="w-full h-[55vw] min-h-[260px] max-h-[460px] lg:h-auto lg:max-h-none lg:flex-1 relative">
          <GoogleMap
            defaultCenter={{ lat: 23.0347, lng: 72.5483 }}
            defaultZoom={13}
            disableDefaultUI={false}
            mapId="d1d1d1d1d1d1d1"
            style={{ width: '100%', height: '100%' }}
          >
            {newStops.map((stop, i) => (
              <AdvancedMarker key={`stop-${i}`} position={{ lat: stop.lat, lng: stop.lng }}>
                <div className="relative group">
                  <div className="w-9 h-9 rounded-2xl bg-orange-500 border-4 border-[#0A0A0A] flex items-center justify-center text-white text-[10px] font-black shadow-2xl font-[family-name:var(--font-dm-mono)]">
                    {stopLabel(i)}
                  </div>
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1 bg-[#0A0A0A]/90 backdrop-blur-md rounded-lg border border-[#333333] text-[9px] font-black text-[#F5F5F5] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-widest z-50">
                    {stop.shortName}
                  </div>
                </div>
              </AdvancedMarker>
            ))}
          </GoogleMap>
        </div>

        <div className="w-full lg:w-[320px] shrink-0 flex flex-col border-t lg:border-t-0 lg:border-l border-[#222222] bg-[#141414] overflow-y-auto">
          <div className="px-4 py-3 bg-orange-500/5 flex items-center justify-between sticky top-0 backdrop-blur-xl z-10 border-b border-[#222222]">
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-400">Route Stops</span>
            </div>
            <span className="text-[9px] font-black text-orange-400 bg-orange-400/10 px-2 py-0.5 rounded-md">
              {newStops.length}
            </span>
          </div>

          <div className="p-3 flex flex-col gap-0">
            {newStops.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-[#555555]">
                <Search className="w-6 h-6 mb-2" />
                <p className="text-[9px] font-bold uppercase tracking-widest leading-relaxed">
                  Search to add stops
                </p>
              </div>
            ) : (
              newStops.map((stop, i) => (
                <div key={i} className="flex items-stretch gap-3">
                  <div className="flex flex-col items-center shrink-0 pt-1">
                    <span className="w-7 h-7 rounded-xl bg-orange-500 text-white flex items-center justify-center font-black shadow-lg text-[10px] font-[family-name:var(--font-dm-mono)]">
                      {stopLabel(i)}
                    </span>
                    {i < newStops.length - 1 && (
                      <div className="flex-1 w-px my-1 bg-[#333333] min-h-[10px]" />
                    )}
                  </div>
                  <div className="flex-1 pb-3 flex items-start justify-between group min-w-0 pt-1">
                    <div className="flex flex-col overflow-hidden pr-2">
                      <span className="text-[#F5F5F5] font-bold text-xs truncate tracking-tight">{stop.name}</span>
                      <span className="text-[#888888] font-[family-name:var(--font-dm-mono)] text-[8px] uppercase tracking-widest">{stop.shortName}</span>
                    </div>
                    <button
                      onClick={() => handleRemoveStop(i)}
                      className="p-1.5 rounded-lg text-[#555555] hover:text-[#C0392B] hover:bg-[#C0392B]/10 transition-all opacity-0 group-hover:opacity-100 shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
