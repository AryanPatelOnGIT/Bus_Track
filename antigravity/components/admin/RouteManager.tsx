'use client';

import { useState, useEffect } from 'react';
import { RouteData, RouteStop, addRoute, deleteRoute, getAllRoutes } from '@/lib/db';
import { Plus, X, Trash2 } from 'lucide-react';

export default function RouteManager() {
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [routeName, setRouteName] = useState('');
  const [stopName, setStopName] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [stops, setStops] = useState<RouteStop[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRoutes = async () => {
    try {
      const data = await getAllRoutes();
      setRoutes(data);
    } catch (error) {
      console.error('Failed to fetch routes', error);
    }
  };

  useEffect(() => {
    fetchRoutes();
  }, []);

  const handleAddStop = () => {
    if (!stopName || !lat || !lng) return;
    setStops([...stops, { name: stopName, lat: parseFloat(lat), lng: parseFloat(lng) }]);
    setStopName('');
    setLat('');
    setLng('');
  };

  const handleRemoveStop = (index: number) => {
    setStops(stops.filter((_, i) => i !== index));
  };

  const handleSaveRoute = async () => {
    if (!routeName || stops.length === 0) return;
    setLoading(true);
    try {
      await addRoute({ routeName, stops });
      setRouteName('');
      setStops([]);
      await fetchRoutes();
    } catch (error) {
      console.error('Failed to save route', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRoute = async (id?: string) => {
    if (!id) return;
    try {
      await deleteRoute(id);
      await fetchRoutes();
    } catch (error) {
      console.error('Failed to delete route', error);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Add Route Form */}
      <div className="flex flex-col gap-3">
        <input
          type="text"
          placeholder="Route Name (e.g. Campus Loop)"
          value={routeName}
          onChange={(e) => setRouteName(e.target.value)}
          className="bg-[#1A1A1A] border border-[#333333] rounded-lg px-3 py-2 text-[#F5F5F5] placeholder-[#555555] font-[family-name:var(--font-inter)] text-sm w-full outline-none focus:border-[#555555] transition-colors"
        />

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Stop Name"
            value={stopName}
            onChange={(e) => setStopName(e.target.value)}
            className="flex-1 bg-[#1A1A1A] border border-[#333333] rounded-lg px-3 py-2 text-[#F5F5F5] placeholder-[#555555] font-[family-name:var(--font-inter)] text-sm outline-none focus:border-[#555555] transition-colors"
          />
          <input
            type="number"
            placeholder="Lat"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            className="w-24 bg-[#1A1A1A] border border-[#333333] rounded-lg px-3 py-2 text-[#F5F5F5] placeholder-[#555555] font-[family-name:var(--font-inter)] text-sm outline-none focus:border-[#555555] transition-colors"
          />
          <input
            type="number"
            placeholder="Lng"
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            className="w-24 bg-[#1A1A1A] border border-[#333333] rounded-lg px-3 py-2 text-[#F5F5F5] placeholder-[#555555] font-[family-name:var(--font-inter)] text-sm outline-none focus:border-[#555555] transition-colors"
          />
          <button
            onClick={handleAddStop}
            className="bg-[#1E1E1E] border border-[#333333] text-[#F5F5F5] font-[family-name:var(--font-dm-mono)] text-sm rounded-lg px-3 py-2 flex items-center justify-center cursor-pointer hover:bg-[#2A2A2A] transition-colors"
          >
            <Plus size={14} />
          </button>
        </div>

        {/* Stops List */}
        {stops.length > 0 && (
          <div className="flex flex-col mt-2">
            {stops.map((stop, index) => (
              <div key={index} className="flex items-center bg-[#141414] border border-[#222222] rounded-lg px-3 py-2 mb-2">
                <span className="font-[family-name:var(--font-dm-mono)] text-[#888888] mr-3">{(index + 1).toString().padStart(2, '0')}.</span>
                <div className="flex-1 flex items-center gap-2">
                  <span className="font-[family-name:var(--font-inter)] text-sm text-[#F5F5F5]">{stop.name}</span>
                  <span className="font-[family-name:var(--font-inter)] text-xs text-[#555555]">
                    ({stop.lat}, {stop.lng})
                  </span>
                </div>
                <button
                  onClick={() => handleRemoveStop(index)}
                  className="text-[#888888] hover:text-[#C0392B] cursor-pointer transition-colors p-1"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={handleSaveRoute}
          disabled={loading || !routeName || stops.length === 0}
          className="bg-[#1E1E1E] border border-[#333333] text-[#F5F5F5] font-[family-name:var(--font-dm-mono)] rounded-lg px-4 py-2.5 w-full mt-2 cursor-pointer hover:bg-[#2A2A2A] transition-colors disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Route'}
        </button>
      </div>

      <div className="h-[1px] bg-[#222222] w-full"></div>

      {/* Existing Routes */}
      <div>
        <h3 className="font-[family-name:var(--font-dm-mono)] text-sm text-[#888888] mb-3">Existing Routes</h3>
        {routes.length === 0 ? (
          <p className="font-[family-name:var(--font-inter)] text-xs text-[#555555]">No routes found.</p>
        ) : (
          <div className="flex flex-col">
            {routes.map((route) => (
              <div key={route.id} className="bg-[#141414] border border-[#222222] rounded-lg px-4 py-3 mb-2 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="font-[family-name:var(--font-dm-mono)] text-sm text-[#F5F5F5]">{route.routeName}</span>
                  <span className="font-[family-name:var(--font-inter)] text-xs text-[#888888]">{route.stops.length} stops</span>
                </div>
                <button
                  onClick={() => handleDeleteRoute(route.id)}
                  className="text-[#888888] hover:text-[#C0392B] cursor-pointer transition-colors p-2"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
