'use client';

import { useState, useEffect } from 'react';
import { UserData, Vehicle, RouteData, getAllDrivers, getAllVehicles, getAllRoutes, assignDriverToVehicle } from '@/lib/db';

export default function DriverAssignment() {
  const [drivers, setDrivers] = useState<(UserData & { uid: string })[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [routes, setRoutes] = useState<RouteData[]>([]);

  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [selectedRouteIds, setSelectedRouteIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    try {
      const [d, v, r] = await Promise.all([
        getAllDrivers(),
        getAllVehicles(),
        getAllRoutes(),
      ]);
      setDrivers(d);
      setVehicles(v);
      setRoutes(r);
    } catch (error) {
      console.error('Error fetching data', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRouteToggle = (routeId: string) => {
    setSelectedRouteIds((prev) =>
      prev.includes(routeId)
        ? prev.filter((id) => id !== routeId)
        : [...prev, routeId]
    );
  };

  const handleAssign = async () => {
    if (!selectedDriverId || !selectedVehicleId) return;
    setLoading(true);
    try {
      await assignDriverToVehicle(selectedDriverId, selectedVehicleId, selectedRouteIds);
      // Reset form
      setSelectedDriverId('');
      setSelectedVehicleId('');
      setSelectedRouteIds([]);
      // Refresh assignments display
      await fetchData();
    } catch (error) {
      console.error('Failed to assign driver', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper to get names for the table
  const getVehicleNumber = (id: string | null) => vehicles.find(v => v.id === id)?.busNumber || 'None';
  const getRouteNames = (ids: string[]) => {
    if (!ids || ids.length === 0) return 'None';
    return ids.map(id => routes.find(r => r.id === id)?.routeName).filter(Boolean).join(', ');
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Assignment Form */}
      <div className="flex flex-col gap-3">
        <select
          value={selectedDriverId}
          onChange={(e) => setSelectedDriverId(e.target.value)}
          className="bg-[#1A1A1A] border border-[#333333] rounded-lg px-3 py-2 text-[#F5F5F5] font-[family-name:var(--font-inter)] text-sm w-full outline-none focus:border-[#555555] transition-colors appearance-none"
        >
          <option value="">Select Driver</option>
          {drivers.map(driver => (
            <option key={driver.uid} value={driver.uid}>{driver.name} ({driver.email})</option>
          ))}
        </select>

        <select
          value={selectedVehicleId}
          onChange={(e) => setSelectedVehicleId(e.target.value)}
          className="bg-[#1A1A1A] border border-[#333333] rounded-lg px-3 py-2 text-[#F5F5F5] font-[family-name:var(--font-inter)] text-sm w-full outline-none focus:border-[#555555] transition-colors appearance-none"
        >
          <option value="">Select Vehicle</option>
          {vehicles.map(vehicle => (
            <option key={vehicle.id} value={vehicle.id}>{vehicle.busNumber} - {vehicle.busName}</option>
          ))}
        </select>

        <div className="mt-2">
          <label className="font-[family-name:var(--font-dm-mono)] text-sm text-[#888888] block mb-2">Select Routes</label>
          <div className="flex flex-col gap-1 max-h-48 overflow-y-auto pr-2">
            {routes.map(route => (
              <label key={route.id} className="flex items-center gap-3 bg-[#141414] border border-[#222222] rounded-lg px-3 py-2 cursor-pointer hover:border-[#333333] transition-colors">
                <input
                  type="checkbox"
                  checked={route.id ? selectedRouteIds.includes(route.id) : false}
                  onChange={() => route.id && handleRouteToggle(route.id)}
                  className="w-4 h-4 accent-[#F5F5F5] bg-[#1A1A1A] border-[#333333] rounded"
                />
                <span className="font-[family-name:var(--font-inter)] text-sm text-[#F5F5F5]">{route.routeName}</span>
              </label>
            ))}
          </div>
        </div>

        <button
          onClick={handleAssign}
          disabled={loading || !selectedDriverId || !selectedVehicleId}
          className="bg-[#1E1E1E] border border-[#333333] text-[#F5F5F5] font-[family-name:var(--font-dm-mono)] rounded-lg px-4 py-2.5 w-full mt-2 cursor-pointer hover:bg-[#2A2A2A] transition-colors disabled:opacity-50"
        >
          {loading ? 'Assigning...' : 'Assign'}
        </button>
      </div>

      <div className="h-[1px] bg-[#222222] w-full"></div>

      {/* Current Assignments */}
      <div>
        <h3 className="font-[family-name:var(--font-dm-mono)] text-sm text-[#888888] mb-3">Current Assignments</h3>
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-3 gap-2 px-3 pb-1 border-b border-[#222222]">
            <span className="font-[family-name:var(--font-dm-mono)] text-xs text-[#555555]">Driver</span>
            <span className="font-[family-name:var(--font-dm-mono)] text-xs text-[#555555]">Vehicle</span>
            <span className="font-[family-name:var(--font-dm-mono)] text-xs text-[#555555]">Routes</span>
          </div>
          {drivers.filter(d => d.vehicleId).length === 0 ? (
            <p className="font-[family-name:var(--font-inter)] text-xs text-[#555555] pt-2">No active assignments.</p>
          ) : (
            drivers.filter(d => d.vehicleId).map(driver => (
              <div key={driver.uid} className="bg-[#141414] border border-[#222222] rounded-lg px-3 py-2 grid grid-cols-3 gap-2 items-center">
                <span className="font-[family-name:var(--font-inter)] text-sm text-[#F5F5F5] truncate">{driver.name}</span>
                <span className="font-[family-name:var(--font-inter)] text-sm text-[#888888] truncate">{getVehicleNumber(driver.vehicleId)}</span>
                <span className="font-[family-name:var(--font-inter)] text-xs text-[#888888] truncate">{getRouteNames(driver.assignedRouteIds)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
