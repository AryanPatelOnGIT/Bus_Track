'use client';

import { useState, useEffect } from 'react';
import { useBuses, BusData } from '@/hooks/useBuses';
import { useDrivers, DriverData } from '@/hooks/useDrivers';
import { useRoutes } from '@/hooks/useRoutes';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { db, rtdb } from '@/lib/firebase';
import { ref, onValue } from 'firebase/database';
import {
  Bus, User, Trash2, Plus, ArrowRight,
  ChevronDown, ChevronUp, Wifi, Pencil, Check, X, AlertCircle,
} from 'lucide-react';

interface ActiveBusEntry {
  busId: string;
  driverId?: string;
  routeId?: string;
  lat?: number;
  lng?: number;
  speed?: number;
}

function useActiveBuses(): ActiveBusEntry[] {
  const [active, setActive] = useState<ActiveBusEntry[]>([]);
  useEffect(() => {
    const r = ref(rtdb, 'activeBuses');
    const unsub = onValue(r, (snap) => {
      const data = snap.val() as Record<string, ActiveBusEntry> | null;
      setActive(data ? Object.values(data) : []);
    });
    return () => unsub();
  }, []);
  return active;
}

function ErrorBanner({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <div className="flex items-center gap-2 bg-[#C0392B]/10 border border-[#C0392B]/30 text-[#C0392B] rounded-xl px-3 py-2 text-xs font-bold">
      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
      <span className="flex-1">{message}</span>
      <button onClick={onDismiss} className="shrink-0 hover:text-white transition-colors">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

interface Props {
  mode?: 'fleet' | 'personnel' | 'routes';
}

export default function FleetManagementPanel({ mode = 'fleet' }: Props) {
  const { buses, loading: busesLoading } = useBuses();
  const { drivers, loading: driversLoading } = useDrivers();
  const { routes } = useRoutes();
  const activeEntries = useActiveBuses();
  const activeBusIds = new Set(activeEntries.map((e) => e.busId));

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [newBusId, setNewBusId] = useState('');
  const [newBusName, setNewBusName] = useState('');
  const [newBusRoutes, setNewBusRoutes] = useState<string[]>([]);
  const [busListOpen, setBusListOpen] = useState(true);

  const [editingBusId, setEditingBusId] = useState<string | null>(null);
  const [editBusName, setEditBusName] = useState('');
  const [editBusRoutes, setEditBusRoutes] = useState<string[]>([]);

  const [newDriverId, setNewDriverId] = useState('');
  const [newDriverName, setNewDriverName] = useState('');
  const [newDriverBusId, setNewDriverBusId] = useState('');
  const [driverListOpen, setDriverListOpen] = useState(true);

  const [editingDriverId, setEditingDriverId] = useState<string | null>(null);
  const [editDriverName, setEditDriverName] = useState('');
  const [editDriverBusId, setEditDriverBusId] = useState('');

  const toggleRoute = (id: string) =>
    setNewBusRoutes((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );

  const toggleEditRoute = (id: string) =>
    setEditBusRoutes((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );

  const handleAddBus = async () => {
    if (!newBusId || !newBusName) return;
    try {
      await setDoc(doc(db, 'buses', newBusId), {
        id: newBusId,
        name: newBusName,
        assignedRoutes: newBusRoutes,
      } as BusData);
      setNewBusId(''); setNewBusName(''); setNewBusRoutes([]);
    } catch (e: any) { setErrorMsg('Failed to add Vehicle: ' + e.message); }
  };

  const handleDeleteBus = async (id: string) => {
    if (!confirm('Delete this vehicle? This cannot be undone.')) return;
    try { await deleteDoc(doc(db, 'buses', id)); }
    catch (e: any) { setErrorMsg('Failed to delete Vehicle: ' + e.message); }
  };

  const startEditBus = (bus: BusData) => {
    setEditingBusId(bus.id);
    setEditBusName(bus.name);
    setEditBusRoutes(bus.assignedRoutes ?? []);
    setEditingDriverId(null);
  };

  const handleSaveBus = async (id: string) => {
    try {
      await setDoc(doc(db, 'buses', id), {
        id,
        name: editBusName,
        assignedRoutes: editBusRoutes,
      } as BusData);
      setEditingBusId(null);
    } catch (e: any) { setErrorMsg('Failed to update Vehicle: ' + e.message); }
  };

  const handleAddDriver = async () => {
    if (!newDriverId || !newDriverName) return;
    try {
      await setDoc(doc(db, 'drivers', newDriverId), {
        id: newDriverId,
        name: newDriverName,
        assignedBusId: newDriverBusId || null,
      } as DriverData);
      setNewDriverId(''); setNewDriverName(''); setNewDriverBusId('');
    } catch (e: any) { setErrorMsg('Failed to add Operator: ' + e.message); }
  };

  const handleDeleteDriver = async (id: string) => {
    if (!confirm('Delete this operator? This cannot be undone.')) return;
    try { await deleteDoc(doc(db, 'drivers', id)); }
    catch (e: any) { setErrorMsg('Failed to delete Operator: ' + e.message); }
  };

  const startEditDriver = (driver: DriverData) => {
    setEditingDriverId(driver.id);
    setEditDriverName(driver.name);
    setEditDriverBusId(driver.assignedBusId ?? '');
    setEditingBusId(null);
  };

  const handleSaveDriver = async (id: string) => {
    try {
      await setDoc(doc(db, 'drivers', id), {
        id,
        name: editDriverName,
        assignedBusId: editDriverBusId || null,
      } as DriverData);
      setEditingDriverId(null);
    } catch (e: any) { setErrorMsg('Failed to update Operator: ' + e.message); }
  };

  const liveDriverIds = new Set(activeEntries.map((e) => e.driverId).filter(Boolean));
  const liveDrivers = drivers.filter((d) => liveDriverIds.has(d.id));

  return (
    <div className="w-full max-w-7xl mx-auto flex flex-col gap-5 p-3 md:p-6">
      {errorMsg && (
        <ErrorBanner message={errorMsg} onDismiss={() => setErrorMsg(null)} />
      )}

      {liveDrivers.length > 0 && (
        <div className="bg-[#27AE60]/10 border border-[#27AE60]/25 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-2 h-2 rounded-full bg-[#27AE60] animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-[#27AE60]">
              Live Now — {liveDrivers.length} Driver{liveDrivers.length !== 1 ? 's' : ''} Online
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {liveDrivers.map((d) => {
              const entry = activeEntries.find((e) => e.driverId === d.id);
              if (!entry) return null;
              const bus = buses.find((b) => b.id === entry.busId);
              const route = routes.find((r) => r.id === entry.routeId);
              return (
                <div
                  key={d.id}
                  className="flex items-center gap-3 bg-[#27AE60]/10 border border-[#27AE60]/20 rounded-xl px-3 py-2"
                >
                  <div className="w-7 h-7 rounded-lg bg-[#27AE60]/20 flex items-center justify-center">
                    <Wifi className="w-3.5 h-3.5 text-[#27AE60]" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-[#F5F5F5] leading-tight">{d.name}</span>
                    <span className="text-[9px] text-[#27AE60]/70 font-[family-name:var(--font-dm-mono)]">
                      {bus?.name || entry.busId}
                      {route ? ` · ${route.name}` : ''}
                      {entry.speed != null ? ` · ${Math.round(entry.speed)} km/h` : ''}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-5 w-full max-w-3xl mx-auto">
        {mode === 'fleet' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#1E1E1E] flex items-center justify-center shrink-0">
                <Bus className="w-4 h-4 text-[#888888]" />
              </div>
              <div>
                <h2 className="font-bold text-lg tracking-tight text-[#F5F5F5]">Fleet Vehicles</h2>
                <p className="text-[10px] text-[#555555] uppercase tracking-[0.2em] font-black">Manage Hardware IDs</p>
              </div>
            </div>

            <div className="bg-[#141414] border border-[#222222] rounded-[1.5rem] p-4 flex flex-col gap-2.5">
              <p className="text-[9px] text-[#888888] font-black uppercase tracking-[0.2em]">Register new vehicle</p>
              <input
                value={newBusId} onChange={(e) => setNewBusId(e.target.value)}
                placeholder="Hardware ID (e.g. BRTS-101)"
                className="w-full h-10 bg-[#0A0A0A] border border-[#333333] rounded-xl px-3 text-sm text-[#F5F5F5] focus:border-[#888888] outline-none transition-colors placeholder:text-[#555555] font-bold"
              />
              <input
                value={newBusName} onChange={(e) => setNewBusName(e.target.value)}
                placeholder="Display Name (e.g. Red Line Express)"
                className="w-full h-10 bg-[#0A0A0A] border border-[#333333] rounded-xl px-3 text-sm text-[#F5F5F5] focus:border-[#888888] outline-none transition-colors placeholder:text-[#555555] font-bold"
              />
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] text-[#888888] uppercase tracking-[0.2em] font-black">
                    Assign Allowed Routes
                  </span>
                  {newBusRoutes.length > 0 && (
                    <span className="text-[9px] text-[#F5F5F5] bg-[#333333] font-black px-2 py-0.5 rounded-full">
                      {newBusRoutes.length} selected
                    </span>
                  )}
                </div>
                <div className="max-h-36 overflow-y-auto bg-[#0A0A0A] border border-[#333333] rounded-xl p-2 flex flex-col gap-0.5">
                  {routes.length === 0
                    ? <p className="text-[#555555] text-[10px] text-center py-3 font-bold">No routes available</p>
                    : routes.map((r) => {
                      const checked = newBusRoutes.includes(r.id);
                      return (
                        <label
                          key={r.id}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${checked ? 'bg-[#1E1E1E]' : 'hover:bg-[#141414]'}`}
                        >
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${checked ? 'border-[#F5F5F5] bg-[#F5F5F5]' : 'border-[#555555] bg-transparent'}`}>
                            {checked && (
                              <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 text-[#0A0A0A]" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M2 6l3 3 5-5" />
                              </svg>
                            )}
                          </div>
                          <input type="checkbox" className="sr-only" checked={checked} onChange={() => toggleRoute(r.id)} />
                          <span className={`text-sm font-bold ${checked ? 'text-[#F5F5F5]' : 'text-[#888888]'}`}>{r.name}</span>
                        </label>
                      );
                    })
                  }
                </div>
              </div>
              <button
                onClick={handleAddBus}
                className="h-10 bg-[#F5F5F5] text-[#0A0A0A] rounded-xl font-black uppercase text-xs tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Add Vehicle
              </button>
            </div>

            <div className="bg-[#141414] border border-[#222222] rounded-[1.5rem] overflow-hidden">
              <button
                onClick={() => setBusListOpen((o) => !o)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#1E1E1E] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#888888]">Saved Vehicles</span>
                  <span className="text-[9px] bg-[#333333] text-[#F5F5F5] font-black px-2 py-0.5 rounded-full">{buses.length}</span>
                </div>
                {busListOpen ? <ChevronUp className="w-3.5 h-3.5 text-[#888888]" /> : <ChevronDown className="w-3.5 h-3.5 text-[#888888]" />}
              </button>
              {busListOpen && (
                <div className="px-3 pb-3 flex flex-col gap-2 border-t border-[#222222]">
                  {busesLoading
                    ? <p className="text-[#555555] text-xs text-center py-4 font-bold">Loading…</p>
                    : buses.length === 0
                    ? <p className="text-[#555555] text-xs text-center py-4 font-bold uppercase tracking-widest">No vehicles registered.</p>
                    : buses.map((bus) => {
                      const isOnline = activeBusIds.has(bus.id);
                      const isEditing = editingBusId === bus.id;

                      return (
                        <div key={bus.id} className="bg-[#0A0A0A] border border-[#222222] rounded-2xl overflow-hidden">
                          <div className="p-3.5 flex items-center justify-between gap-2 group">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${isOnline ? 'bg-[#27AE60]/20' : 'bg-[#1E1E1E]'}`}>
                                <Bus className={`w-4 h-4 ${isOnline ? 'text-[#27AE60]' : 'text-[#555555]'}`} />
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="font-bold text-[#F5F5F5] text-sm truncate">{bus.name}</span>
                                <span className="text-[10px] text-[#888888] font-[family-name:var(--font-dm-mono)] tracking-widest">{bus.id}</span>
                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                  {isOnline && (
                                    <span className="text-[9px] text-[#27AE60] font-black uppercase tracking-widest flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-[#27AE60] animate-pulse inline-block" /> Online
                                    </span>
                                  )}
                                  {bus.assignedRoutes && bus.assignedRoutes.length > 0 && (
                                    <span className="text-[9px] text-[#2980B9] font-bold flex items-center gap-1">
                                      <ArrowRight className="w-2.5 h-2.5" />
                                      {bus.assignedRoutes.length} Route{bus.assignedRoutes.length !== 1 ? 's' : ''}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => isEditing ? setEditingBusId(null) : startEditBus(bus)}
                                className="p-3 rounded-lg text-[#555555] hover:text-[#2980B9] hover:bg-[#2980B9]/10 transition-all"
                              >
                                {isEditing ? <X className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
                              </button>
                              <button
                                onClick={() => handleDeleteBus(bus.id)}
                                className="p-3 rounded-lg text-[#555555] hover:text-[#C0392B] hover:bg-[#C0392B]/10 transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {isEditing && (
                            <div className="border-t border-[#222222] px-4 pb-4 pt-3 flex flex-col gap-2.5 bg-[#141414]">
                              <p className="text-[9px] text-[#2980B9] font-black uppercase tracking-[0.2em]">Editing Vehicle</p>
                              <input
                                value={editBusName}
                                onChange={(e) => setEditBusName(e.target.value)}
                                placeholder="Display Name"
                                className="w-full h-10 bg-[#0A0A0A] border border-[#333333] rounded-xl px-3 text-sm text-[#F5F5F5] focus:border-[#2980B9]/60 outline-none transition-colors placeholder:text-[#555555] font-bold"
                              />
                              <div className="flex flex-col gap-1">
                                <span className="text-[9px] text-[#888888] uppercase tracking-[0.2em] font-black">Assigned Routes</span>
                                <div className="max-h-32 overflow-y-auto bg-[#0A0A0A] border border-[#333333] rounded-xl p-2 flex flex-col gap-0.5">
                                  {routes.length === 0
                                    ? <p className="text-[#555555] text-[10px] text-center py-3 font-bold">No routes available</p>
                                    : routes.map((r) => {
                                      const checked = editBusRoutes.includes(r.id);
                                      return (
                                        <label key={r.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors ${checked ? 'bg-[#1E1E1E]' : 'hover:bg-[#1A1A1A]'}`}>
                                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all ${checked ? 'border-[#F5F5F5] bg-[#F5F5F5]' : 'border-[#555555] bg-transparent'}`}>
                                            {checked && <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 text-[#0A0A0A]" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M2 6l3 3 5-5" /></svg>}
                                          </div>
                                          <input type="checkbox" className="sr-only" checked={checked} onChange={() => toggleEditRoute(r.id)} />
                                          <span className={`text-sm font-bold ${checked ? 'text-[#F5F5F5]' : 'text-[#888888]'}`}>{r.name}</span>
                                        </label>
                                      );
                                    })
                                  }
                                </div>
                              </div>
                              <button
                                onClick={() => handleSaveBus(bus.id)}
                                className="h-9 bg-[#2980B9] text-[#F5F5F5] rounded-xl font-black uppercase text-xs tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                              >
                                <Check className="w-4 h-4" /> Save Changes
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        )}

        {mode === 'personnel' && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#1E1E1E] flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-[#888888]" />
              </div>
              <div>
                <h2 className="font-bold text-lg tracking-tight text-[#F5F5F5]">Driver Personnel</h2>
                <p className="text-[10px] text-[#555555] uppercase tracking-[0.2em] font-black">Manage Operator IDs</p>
              </div>
            </div>

            <div className="bg-[#141414] border border-[#222222] rounded-[1.5rem] p-4 flex flex-col gap-2.5">
              <p className="text-[9px] text-[#888888] font-black uppercase tracking-[0.2em]">Register new operator</p>
              <input
                value={newDriverId} onChange={(e) => setNewDriverId(e.target.value)}
                placeholder="Operator ID (e.g. drv_1)"
                className="w-full h-10 bg-[#0A0A0A] border border-[#333333] rounded-xl px-3 text-sm text-[#F5F5F5] focus:border-[#888888] outline-none transition-colors placeholder:text-[#555555] font-bold"
              />
              <input
                value={newDriverName} onChange={(e) => setNewDriverName(e.target.value)}
                placeholder="Display Name (e.g. Ravi Kumar)"
                className="w-full h-10 bg-[#0A0A0A] border border-[#333333] rounded-xl px-3 text-sm text-[#F5F5F5] focus:border-[#888888] outline-none transition-colors placeholder:text-[#555555] font-bold"
              />
              <div className="relative">
                <select
                  value={newDriverBusId} onChange={(e) => setNewDriverBusId(e.target.value)}
                  className="w-full h-10 bg-[#0A0A0A] border border-[#333333] rounded-xl px-3 pr-8 text-sm text-[#F5F5F5] focus:border-[#888888] outline-none transition-colors font-bold appearance-none cursor-pointer"
                >
                  <option value="" className="bg-[#1A1A1A]">— Assign Vehicle —</option>
                  {buses.map((b) => <option key={b.id} value={b.id} className="bg-[#1A1A1A]">{b.name} ({b.id})</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#555555] pointer-events-none" />
              </div>
              <button
                onClick={handleAddDriver}
                className="h-10 bg-[#F5F5F5] text-[#0A0A0A] rounded-xl font-black uppercase text-xs tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Add Operator
              </button>
            </div>

            <div className="bg-[#141414] border border-[#222222] rounded-[1.5rem] overflow-hidden">
              <button
                onClick={() => setDriverListOpen((o) => !o)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-[#1A1A1A] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#888888]">Saved Operators</span>
                  <span className="text-[9px] bg-[#333333] text-[#F5F5F5] font-black px-2 py-0.5 rounded-full">{drivers.length}</span>
                  {liveDrivers.length > 0 && (
                    <span className="text-[9px] bg-[#27AE60]/20 text-[#27AE60] font-black px-2 py-0.5 rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#27AE60] animate-pulse inline-block" />
                      {liveDrivers.length} Live
                    </span>
                  )}
                </div>
                {driverListOpen ? <ChevronUp className="w-3.5 h-3.5 text-[#555555]" /> : <ChevronDown className="w-3.5 h-3.5 text-[#555555]" />}
              </button>
              {driverListOpen && (
                <div className="px-3 pb-3 flex flex-col gap-2 border-t border-[#222222]">
                  {driversLoading
                    ? <p className="text-[#555555] text-xs text-center py-4 font-bold">Loading…</p>
                    : drivers.length === 0
                    ? <p className="text-[#555555] text-xs text-center py-4 font-bold uppercase tracking-widest">No operators registered.</p>
                    : drivers.map((driver) => {
                      const assignedBus = buses.find((b) => b.id === driver.assignedBusId);
                      const isDriving = liveDriverIds.has(driver.id);
                      const isEditing = editingDriverId === driver.id;

                      return (
                        <div
                          key={driver.id}
                          className={`border rounded-2xl overflow-hidden transition-all ${isDriving ? 'bg-[#27AE60]/5 border-[#27AE60]/20' : 'bg-[#0A0A0A] border-[#222222]'}`}
                        >
                          <div className="p-3.5 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${isDriving ? 'bg-[#27AE60]/20' : 'bg-[#1A1A1A]'}`}>
                                <User className={`w-4 h-4 ${isDriving ? 'text-[#27AE60]' : 'text-[#555555]'}`} />
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className="font-bold text-[#F5F5F5] text-sm truncate">{driver.name}</span>
                                <span className="text-[10px] text-[#888888] font-[family-name:var(--font-dm-mono)] tracking-widest">{driver.id}</span>
                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                  {isDriving ? (
                                    <span className="text-[9px] text-[#27AE60] font-black uppercase tracking-widest flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-[#27AE60] animate-pulse inline-block" />
                                      Online · Driving
                                    </span>
                                  ) : (
                                    <span className="text-[9px] text-[#555555] font-black uppercase tracking-widest">Offline</span>
                                  )}
                                  {assignedBus && (
                                    <span className="text-[9px] text-[#2980B9] font-bold flex items-center gap-1">
                                      <ArrowRight className="w-2.5 h-2.5" /> {assignedBus.name}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => isEditing ? setEditingDriverId(null) : startEditDriver(driver)}
                                className="p-3 rounded-lg text-[#555555] hover:text-[#2980B9] hover:bg-[#2980B9]/10 transition-all"
                              >
                                {isEditing ? <X className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
                              </button>
                              <button
                                onClick={() => handleDeleteDriver(driver.id)}
                                className="p-3 rounded-lg text-[#555555] hover:text-[#C0392B] hover:bg-[#C0392B]/10 transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {isEditing && (
                            <div className="border-t border-[#222222] px-4 pb-4 pt-3 flex flex-col gap-2.5 bg-[#141414]">
                              <p className="text-[9px] text-[#2980B9] font-black uppercase tracking-[0.2em]">Editing Operator</p>
                              <input
                                value={editDriverName}
                                onChange={(e) => setEditDriverName(e.target.value)}
                                placeholder="Display Name"
                                className="w-full h-10 bg-[#0A0A0A] border border-[#333333] rounded-xl px-3 text-sm text-[#F5F5F5] focus:border-[#2980B9]/60 outline-none transition-colors placeholder:text-[#555555] font-bold"
                              />
                              <div className="relative">
                                <select
                                  value={editDriverBusId}
                                  onChange={(e) => setEditDriverBusId(e.target.value)}
                                  className="w-full h-10 bg-[#0A0A0A] border border-[#333333] rounded-xl px-3 pr-8 text-sm text-[#F5F5F5] focus:border-[#2980B9]/60 outline-none transition-colors font-bold appearance-none cursor-pointer"
                                >
                                  <option value="" className="bg-[#1A1A1A]">— Unassign Vehicle —</option>
                                  {buses.map((b) => <option key={b.id} value={b.id} className="bg-[#1A1A1A]">{b.name} ({b.id})</option>)}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#555555] pointer-events-none" />
                              </div>
                              <button
                                onClick={() => handleSaveDriver(driver.id)}
                                className="h-9 bg-[#2980B9] text-[#F5F5F5] rounded-xl font-black uppercase text-xs tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                              >
                                <Check className="w-4 h-4" /> Save Changes
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
