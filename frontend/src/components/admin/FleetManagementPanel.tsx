"use client";

import { useState } from "react";
import { useBuses, BusData } from "@/hooks/useBuses";
import { useDrivers, DriverData } from "@/hooks/useDrivers";
import { useRoutes } from "@/hooks/useRoutes";
import { doc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Bus, User, Trash2, Plus, ArrowRight } from "lucide-react";

export default function FleetManagementPanel() {
  const { buses, loading: busesLoading } = useBuses();
  const { drivers, loading: driversLoading } = useDrivers();
  const { routes } = useRoutes();

  // Bus Form State
  const [newBusId, setNewBusId] = useState("");
  const [newBusName, setNewBusName] = useState("");
  const [newBusRouteId, setNewBusRouteId] = useState("");

  // Driver Form State
  const [newDriverId, setNewDriverId] = useState("");
  const [newDriverName, setNewDriverName] = useState("");
  const [newDriverBusId, setNewDriverBusId] = useState("");
  const [newDriverRoutes, setNewDriverRoutes] = useState<string[]>([]);

  const handleAddBus = async () => {
    if (!newBusId || !newBusName) return;
    try {
      const busData: BusData = {
        id: newBusId,
        name: newBusName,
        assignedRouteId: newBusRouteId || null,
      };
      await setDoc(doc(db, "buses", newBusId), busData);
      setNewBusId("");
      setNewBusName("");
      setNewBusRouteId("");
    } catch (e: any) {
      console.error("Error adding bus", e);
      alert("Failed to add Vehicle: " + e.message);
    }
  };

  const handleDeleteBus = async (id: string) => {
    if (confirm("Delete bus?")) {
      try {
        await deleteDoc(doc(db, "buses", id));
      } catch (e: any) {
        alert("Failed to delete Vehicle: " + e.message);
      }
    }
  };

  const handleAddDriver = async () => {
    if (!newDriverId || !newDriverName) return;
    try {
      const driverData: DriverData = {
        id: newDriverId,
        name: newDriverName,
        assignedBusId: newDriverBusId || null,
        assignedRoutes: newDriverRoutes,
      };
      await setDoc(doc(db, "drivers", newDriverId), driverData);
      setNewDriverId("");
      setNewDriverName("");
      setNewDriverBusId("");
      setNewDriverRoutes([]);
    } catch (e: any) {
      console.error("Error adding driver", e);
      alert("Failed to add Operator: " + e.message);
    }
  };

  const handleDeleteDriver = async (id: string) => {
    if (confirm("Delete driver?")) {
      try {
        await deleteDoc(doc(db, "drivers", id));
      } catch (e: any) {
        alert("Failed to delete Operator: " + e.message);
      }
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row gap-4 md:gap-6 p-2 md:p-4 mb-8 animate-slide-up">
      {/* Buses Section */}
      <div className="flex-1 bg-brand-surface/40 border border-white/5 shadow-3xl rounded-[2rem] md:rounded-[2.5rem] p-4 md:p-5 flex flex-col">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
            <Bus className="w-5 h-5 text-white/40" />
          </div>
          <div>
            <h2 className="font-bold text-xl tracking-tight" style={{ fontFamily: "Outfit" }}>Fleet Vehicles</h2>
            <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-black">Manage Hardware IDs</p>
          </div>
        </div>

        {/* Add Bus Form */}
        <div className="bg-brand-dark/40 p-3 rounded-[1.5rem] border border-white/5 mb-4 flex flex-col gap-2">
          <input 
            type="text" value={newBusId} onChange={(e) => setNewBusId(e.target.value)} 
            placeholder="Hardware ID (e.g. BRTS-101)" 
            className="w-full h-10 bg-white/5 border border-white/10 rounded-xl px-3 text-sm text-white focus:border-white transition-colors placeholder:text-white/20 font-bold"
          />
          <input 
            type="text" value={newBusName} onChange={(e) => setNewBusName(e.target.value)} 
            placeholder="Display Name (e.g. Red Line Express)" 
            className="w-full h-10 bg-white/5 border border-white/10 rounded-xl px-3 text-sm text-white focus:border-white transition-colors placeholder:text-white/20 font-bold"
          />
          <div className="relative group">
            <select 
              value={newBusRouteId} onChange={(e) => setNewBusRouteId(e.target.value)}
              className="w-full h-10 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl px-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20 transition-all placeholder:text-white/20 font-bold appearance-none cursor-pointer"
            >
              <option value="" className="bg-[#1a1c29] text-white">— Unassigned Route —</option>
              {routes.map(r => <option key={r.id} value={r.id} className="bg-[#1a1c29] text-white">{r.name}</option>)}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/40 group-hover:text-white/70 transition-colors">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M6 9l6 6 6-6" /></svg>
            </div>
          </div>
          <button onClick={handleAddBus} className="h-10 bg-white text-brand-dark rounded-xl font-black uppercase text-xs tracking-widest shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2">
            <Plus className="w-4 h-4" /> Add Vehicle
          </button>
        </div>

        {/* Bus List */}
        <div className="flex-1 flex flex-col gap-3 overflow-y-auto">
          {busesLoading ? <p className="text-white/20 text-xs text-center p-4">Loading...</p> : buses.length === 0 ? <p className="text-white/20 text-xs text-center p-4 font-bold uppercase tracking-widest">No matching records.</p> : null}
          {buses.map(bus => (
            <div key={bus.id} className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center justify-between group">
              <div className="flex flex-col">
                <span className="font-bold text-white text-sm">{bus.name}</span>
                <span className="text-[10px] text-white/30 font-mono tracking-widest">{bus.id}</span>
                {bus.assignedRouteId && (
                  <span className="text-[10px] text-emerald-400 font-bold uppercase mt-1 tracking-widest flex items-center gap-1">
                    <ArrowRight className="w-3 h-3" /> Route: {routes.find(r => r.id === bus.assignedRouteId)?.name || bus.assignedRouteId}
                  </span>
                )}
              </div>
              <button onClick={() => handleDeleteBus(bus.id)} className="p-2 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Drivers Section */}
      <div className="flex-1 bg-brand-surface/40 border border-white/5 shadow-3xl rounded-[2rem] md:rounded-[2.5rem] p-4 md:p-5 flex flex-col">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center">
            <User className="w-5 h-5 text-white/40" />
          </div>
          <div>
            <h2 className="font-bold text-xl tracking-tight" style={{ fontFamily: "Outfit" }}>Driver Personnel</h2>
            <p className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-black">Manage Operator IDs</p>
          </div>
        </div>

        {/* Add Driver Form */}
        <div className="bg-brand-dark/40 p-3 rounded-[1.5rem] border border-white/5 mb-4 flex flex-col gap-2">
          <input 
            type="text" value={newDriverId} onChange={(e) => setNewDriverId(e.target.value)} 
            placeholder="Operator ID (e.g. drv_1)" 
            className="w-full h-10 bg-white/5 border border-white/10 rounded-xl px-3 text-sm text-white focus:border-white transition-colors placeholder:text-white/20 font-bold"
          />
          <input 
            type="text" value={newDriverName} onChange={(e) => setNewDriverName(e.target.value)} 
            placeholder="Display Name (e.g. Ravi Kumar)" 
            className="w-full h-10 bg-white/5 border border-white/10 rounded-xl px-3 text-sm text-white focus:border-white transition-colors placeholder:text-white/20 font-bold"
          />
          <div className="relative group">
            <select 
              value={newDriverBusId} onChange={(e) => setNewDriverBusId(e.target.value)}
              className="w-full h-10 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl px-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/20 transition-all placeholder:text-white/20 font-bold appearance-none cursor-pointer"
            >
              <option value="" className="bg-[#1a1c29] text-white">— Unassigned Vehicle —</option>
              {buses.map(b => <option key={b.id} value={b.id} className="bg-[#1a1c29] text-white">{b.name} ({b.id})</option>)}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/40 group-hover:text-white/70 transition-colors">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M6 9l6 6 6-6" /></svg>
            </div>
          </div>

          <div className="flex flex-col gap-2 mt-2">
            <span className="text-[10px] text-white/40 uppercase tracking-[0.1em] font-bold">Assign Allowed Routes</span>
            <div className="max-h-32 overflow-y-auto bg-white/5 border border-white/10 rounded-xl p-2 flex flex-col gap-1 shadow-inner">
              {routes.map(r => (
                <label key={r.id} className="flex items-center gap-3 px-3 py-2 hover:bg-white/5 rounded-lg cursor-pointer">
                  <input 
                    type="radio" 
                    name="driverRoute"
                    className="accent-white w-4 h-4"
                    checked={newDriverRoutes[0] === r.id}
                    onChange={(e) => {
                      if (e.target.checked) setNewDriverRoutes([r.id]);
                    }}
                  />
                  <span className="text-sm font-bold text-white/80">{r.name}</span>
                </label>
              ))}
            </div>
          </div>

          <button onClick={handleAddDriver} className="h-10 bg-white text-brand-dark rounded-xl font-black uppercase text-xs tracking-widest shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2 mt-2">
            <Plus className="w-4 h-4" /> Add Operator
          </button>
        </div>

        {/* Drivers List */}
        <div className="flex-1 flex flex-col gap-3 overflow-y-auto">
          {driversLoading ? <p className="text-white/20 text-xs text-center p-4">Loading...</p> : drivers.length === 0 ? <p className="text-white/20 text-xs text-center p-4 font-bold uppercase tracking-widest">No matching records.</p> : null}
          {drivers.map(driver => (
            <div key={driver.id} className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center justify-between group">
              <div className="flex flex-col">
                <span className="font-bold text-white text-sm">{driver.name}</span>
                <span className="text-[10px] text-white/30 font-mono tracking-widest">{driver.id}</span>
                {driver.assignedBusId && (
                  <span className="text-[10px] text-blue-400 font-bold uppercase mt-2 tracking-widest flex items-center gap-1">
                    <ArrowRight className="w-3 h-3" /> Vehicle: {buses.find(b => b.id === driver.assignedBusId)?.name || driver.assignedBusId}
                  </span>
                )}
                {driver.assignedRoutes && driver.assignedRoutes.length > 0 && (
                  <span className="text-[10px] text-emerald-400 font-bold uppercase mt-1 tracking-widest flex items-center gap-1">
                    <ArrowRight className="w-3 h-3" /> Routes: {driver.assignedRoutes.length} Assigned
                  </span>
                )}
              </div>
              <button onClick={() => handleDeleteDriver(driver.id)} className="p-2 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
