"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const MOCK_LINE_DATA = [
  { time: "06:00", today: 120, yesterday: 100 },
  { time: "09:00", today: 800, yesterday: 750 },
  { time: "12:00", today: 400, yesterday: 380 },
  { time: "15:00", today: 450, yesterday: 430 },
  { time: "18:00", today: 900, yesterday: 890 },
  { time: "21:00", today: 200, yesterday: 210 },
];

const MOCK_PIE_DATA = [
  { name: "Active", value: 42, color: "#22c55e" },
  { name: "Idle", value: 6, color: "#f59e0b" },
  { name: "Maintenance", value: 2, color: "#ef4444" },
];

const MOCK_FEEDBACK = [
  { id: 1, route: "B101", rating: 5, comment: "On time and safe driving.", time: "10 mins ago" },
  { id: 2, route: "B205", rating: 4, comment: "AC wasn't very effective, but fast.", time: "1 hour ago" },
  { id: 3, route: "B108", rating: 2, comment: "Hard braking at Iskon stop.", time: "3 hours ago" },
];

export default function AnalyticsDashboard() {
  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <h2 className="font-display text-xl font-bold text-white mb-6">Analytics & Live Feed</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Pass Load Chart */}
        <div className="md:col-span-2 bg-brand-dark rounded-2xl border border-white/5 p-5 h-64">
          <h3 className="text-white/80 text-sm font-medium mb-4">Passenger volume (Today vs Yesterday)</h3>
          <ResponsiveContainer width="100%" height="85%">
            <LineChart data={MOCK_LINE_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="time" stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: "#121e30", borderColor: "rgba(255,255,255,0.1)", borderRadius: "8px" }}
                itemStyle={{ color: "#fff" }}
              />
              <Line type="monotone" dataKey="today" stroke="#f5a623" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} />
              <Line type="monotone" dataKey="yesterday" stroke="#0f4c81" strokeWidth={2} strokeDasharray="5 5" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Fleet Status Chart */}
        <div className="bg-brand-dark rounded-2xl border border-white/5 p-5 h-64 flex flex-col">
          <h3 className="text-white/80 text-sm font-medium mb-2">Fleet Status Distribution</h3>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={MOCK_PIE_DATA} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={2} dataKey="value">
                  {MOCK_PIE_DATA.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: "#121e30", borderColor: "rgba(255,255,255,0.1)", borderRadius: "8px" }}
                  itemStyle={{ color: "#fff" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Feedback Feed */}
      <div className="mt-6 bg-brand-dark rounded-2xl border border-white/5 p-5">
        <h3 className="text-white/80 text-sm font-medium mb-4">Recent Passenger Feedback</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-xs text-white/40 uppercase tracking-widest">
                <th className="pb-3 px-2 font-medium">Route/Bus</th>
                <th className="pb-3 px-2 font-medium">Rating</th>
                <th className="pb-3 px-2 font-medium">Comment</th>
                <th className="pb-3 px-2 font-medium text-right">Time</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_FEEDBACK.map((fb) => (
                <tr key={fb.id} className="border-b border-white/5 last:border-0 hover:bg-brand-surface/50 transition">
                  <td className="py-3 px-2 font-mono text-xs">{fb.route}</td>
                  <td className="py-3 px-2 text-[#f5a623]">{"★".repeat(fb.rating)}{"☆".repeat(5 - fb.rating)}</td>
                  <td className="py-3 px-2 text-sm text-white/70">{fb.comment}</td>
                  <td className="py-3 px-2 text-xs text-white/40 text-right">{fb.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
