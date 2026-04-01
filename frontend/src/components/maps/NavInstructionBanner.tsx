"use client";

import {
  ArrowUp,
  CornerUpLeft as TurnLeft,
  CornerUpRight as TurnRight,
  RefreshCw,
  MapPin,
  Loader2,
} from "lucide-react";

export interface NavBannerProps {
  instruction: string;
  distanceToTurn: string;
  maneuver: string; // raw value from DirectionsStep.maneuver
  isRerouting: boolean;
}

function ManeuverIcon({ maneuver }: { maneuver: string }) {
  const cls = "w-6 h-6 text-white";
  const m = maneuver?.toLowerCase() || "";
  
  if (m.includes("left")) return <TurnLeft className={cls} />;
  if (m.includes("right")) return <TurnRight className={cls} />;
  if (m.includes("roundabout") || m.includes("u-turn")) return <RefreshCw className={cls} />;
  if (m.includes("destination")) return <MapPin className={cls} />;
  
  // Default straight
  return <ArrowUp className={cls} />;
}

export default function NavInstructionBanner({
  instruction,
  distanceToTurn,
  maneuver,
  isRerouting,
}: NavBannerProps) {
  if (!instruction && !isRerouting) return null;

  return (
    <div
      className="absolute top-4 left-1/2 z-30"
      style={{ transform: "translateX(-50%)", width: "calc(100% - 32px)", maxWidth: 460 }}
    >
      <div className="backdrop-blur-md bg-slate-900/80 border border-white/15 rounded-2xl shadow-2xl flex items-center gap-3 px-4 py-3">
        {isRerouting ? (
          <>
            <div className="shrink-0 bg-blue-600/80 rounded-xl p-2.5 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold text-sm leading-snug truncate">
                Rerouting…
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="shrink-0 bg-blue-600/80 rounded-xl p-2.5 flex items-center justify-center">
              <ManeuverIcon maneuver={maneuver} />
            </div>
            <div className="flex-1 min-w-0">
              <p
                className="text-white font-semibold text-sm leading-snug truncate"
                dangerouslySetInnerHTML={{ __html: instruction || "Continue straightforward" }}
              />
              <p className="text-blue-300 text-xs font-bold mt-0.5">{distanceToTurn || "—"}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
