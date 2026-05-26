'use client';

import { useState, useEffect } from 'react';
import { Vehicle, addVehicle, deleteVehicle, getAllVehicles, getAllDrivers, getAllRoutes, UserData, RouteData } from '@/lib/db';
import { Trash2 } from 'lucide-react';

export default function FleetManager() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<(UserData & { uid: string })[]>([]);
  const [routes, setRoutes] = useState<RouteData[]>([]);

  const [busNumber, setBusNumber] = useState('');
  const [busName, setBusName] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    try {
      const [v, d, r] = await Promise.all([
        getAllVehicles(),
        getAllDrivers(),
        getAllRoutes()
      ]);
      setVehicles(v);
      setDrivers(d);
      setRoutes(r);
    } catch (error) {
      console.error('Failed to fetch fleet data', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddVehicle = async () => {
    if (!busNumber || !busName) return;
    setLoading(true);
    try {
      await addVehicle({ busNumber, busName, assignedDriverId: null, assignedRouteIds: [] });
      setBusNumber('');
      setBusName('');
      await fetchData();
    } catch (error) {
      console.error('Failed to add vehicle', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVehicle = async (id?: string) => {
    if (!id) return;
    try {
      await deleteVehicle(id);
      await fetchData();
    } catch (error) {
      console.error('Failed to delete vehicle', error);
    }
  };

  const getDriverName = (id: string | null) => drivers.find(d => d.uid === id)?.name;
  const getRouteNames = (ids: string[]) => ids.map(id => routes.find(r => r.id === id)?.routeName).filter(Boolean).join(', ');

  return (
    <div className="flex flex-col gap-6">
      {/* Add Vehicle Form */}
      <div className="flex flex-col gap-3">
        <input
          type="text"
          placeholder="Bus Number (e.g. KA-01-F-1234)"
          value={busNumber}
          onChange={(e) => setBusNumber(e.target.value)}
          className="bg-[#1A1A1A] border border-[#333333] rounded-lg px-3 py-2 text-[#F5F5F5] placeholder-[#555555] font-[family-name:var(--font-inter)] text-sm w-full outline-none focus:border-[#555555] transition-colors"
        />
        <input
          type="text"
          placeholder="Bus Name (e.g. Route Express A)"
          value={busName}
          onChange={(e) => setBusName(e.target.value)}
          className="bg-[#1A1A1A] border border-[#333333] rounded-lg px-3 py-2 text-[#F5F5F5] placeholder-[#555555] font-[family-name:var(--font-inter)] text-sm w-full outline-none focus:border-[#555555] transition-colors"
        />
        <button
          onClick={handleAddVehicle}
          disabled={loading || !busNumber || !busName}
          className="bg-[#1E1E1E] border border-[#333333] text-[#F5F5F5] font-[family-name:var(--font-dm-mono)] rounded-lg px-4 py-2.5 w-full mt-1 cursor-pointer hover:bg-[#2A2A2A] transition-colors disabled:opacity-50"
        >
          {loading ? 'Adding...' : 'Add Vehicle'}
        </button>
      </div>

      <div className="h-[1px] bg-[#222222] w-full"></div>

      {/* Fleet Vehicles */}
      <div>
        <h3 className="font-[family-name:var(--font-dm-mono)] text-sm text-[#888888] mb-3">Fleet Vehicles</h3>
        {vehicles.length === 0 ? (
          <p className="font-[family-name:var(--font-inter)] text-xs text-[#555555]">No vehicles found.</p>
        ) : (
          <div className="flex flex-col">
            {vehicles.map((vehicle) => (
              <div key={vehicle.id} className="bg-[#141414] border border-[#222222] rounded-lg px-4 py-3 mb-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-[family-name:var(--font-dm-mono)] text-sm text-[#F5F5F5]">{vehicle.busNumber}</span>
                  <button
                    onClick={() => handleDeleteVehicle(vehicle.id)}
                    className="text-[#888888] hover:text-[#C0392B] cursor-pointer transition-colors p-1"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="font-[family-name:var(--font-inter)] text-xs text-[#888888] flex flex-col gap-0.5">
                  <span>{vehicle.busName}</span>
                  {vehicle.assignedDriverId && (
                    <span className="text-[#555555] mt-1">Driver: {getDriverName(vehicle.assignedDriverId)}</span>
                  )}
                  {vehicle.assignedRouteIds && vehicle.assignedRouteIds.length > 0 && (
                    <span className="text-[#555555]">Routes: {getRouteNames(vehicle.assignedRouteIds)}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
