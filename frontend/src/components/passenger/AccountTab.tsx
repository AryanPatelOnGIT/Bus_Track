"use client";

export default function AccountTab() {
  return (
    <div className="flex-1 overflow-y-auto bg-brand-dark p-6 flex flex-col items-center">
      <div className="w-full max-w-md space-y-8 mt-8">
        {/* Profile Header */}
        <div className="flex flex-col items-center gap-4">
          <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-blue-500 to-emerald-400 flex items-center justify-center text-3xl shadow-lg border-4 border-white/10">
            👤
          </div>
          <div className="text-center">
            <h2 className="text-2xl font-bold font-display tracking-tight text-white mb-1" style={{ fontFamily: "Outfit, sans-serif" }}>
              Passenger Name
            </h2>
            <p className="text-sm text-white/50">passenger@bustrack.app</p>
          </div>
        </div>

        {/* Stats / Info Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
            <span className="text-white/40 text-xs uppercase tracking-wider mb-1">Trips Taken</span>
            <span className="text-2xl font-bold text-emerald-400">12</span>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
            <span className="text-white/40 text-xs uppercase tracking-wider mb-1">Saved Routes</span>
            <span className="text-2xl font-bold text-blue-400">3</span>
          </div>
        </div>

        {/* Actions List */}
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden mt-6">
          {[
            { label: "Payment Methods", icon: "💳" },
            { label: "Travel History", icon: "📜" },
            { label: "Notification Settings", icon: "🔔" },
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
