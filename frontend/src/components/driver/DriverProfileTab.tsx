"use client";

interface Props {
  driverId: string;
  busId: string;
}

export default function DriverProfileTab({ driverId, busId }: Props) {
  return (
    <div className="flex-1 overflow-y-auto bg-brand-dark p-6 flex flex-col items-center">
      <div className="w-full max-w-md space-y-8 mt-8">
        {/* Profile Header */}
        <div className="flex flex-col items-center gap-4">
          <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-400 flex items-center justify-center text-3xl shadow-lg border-4 border-white/10">
            👨‍✈️
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-bold font-display tracking-tight text-white mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>
              Driver {driverId.replace("drv_", "#")}
            </h2>
            <p className="text-sm text-white/50">driver_{driverId}@bustrack.app</p>
          </div>
        </div>

        {/* Current Shift Info */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <h3 className="text-xs uppercase tracking-widest text-white/40 mb-3">Current Assignment</h3>
          <div className="flex justify-between items-center mb-2">
            <span className="text-white/80 text-sm">Active Vehicle</span>
            <span className="font-semibold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">{busId}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-white/80 text-sm">Shift Status</span>
            <span className="font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">On Duty</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
            <span className="text-white/40 text-xs uppercase tracking-wider mb-1">Total Hours</span>
            <span className="text-2xl font-bold text-white">42h</span>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
            <span className="text-white/40 text-xs uppercase tracking-wider mb-1">Trips Completed</span>
            <span className="text-2xl font-bold text-white">18</span>
          </div>
        </div>

        {/* Actions List */}
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden mt-6">
          {[
            { label: "Shift History", icon: "📋" },
            { label: "Maintenance Reports", icon: "🔧" },
            { label: "Account Settings", icon: "⚙️" },
            { label: "Log Out", icon: "🚪", color: "text-red-400" },
          ].map((item, idx, arr) => (
            <button
              key={item.label}
              className={`w-full flex items-center justify-between p-4 bg-transparent hover:bg-white/5 transition-colors ${
                idx !== arr.length - 1 ? 'border-b border-white/10' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{item.icon}</span>
                <span className={`font-medium ${item.color || 'text-white/90'}`}>{item.label}</span>
              </div>
              <span className="text-white/20">▶</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
