'use client';

export default function LoadingScreen() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0A0A0A]">
      <h1 className="font-[family-name:var(--font-dm-mono)] text-3xl text-[#F5F5F5] mb-4">BUS TRACK</h1>
      <div>
        <div className="pulse-dot w-1.5 h-1.5 rounded-full bg-[#888888] inline-block mx-1"></div>
        <div className="pulse-dot w-1.5 h-1.5 rounded-full bg-[#888888] inline-block mx-1"></div>
        <div className="pulse-dot w-1.5 h-1.5 rounded-full bg-[#888888] inline-block mx-1"></div>
      </div>
    </div>
  );
}
