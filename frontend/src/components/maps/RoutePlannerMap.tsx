"use client";

import { useEffect, useRef } from "react";
import { Map as GoogleMap, AdvancedMarker, useMap, useMapsLibrary } from "@vis.gl/react-google-maps";

interface Stop {
  id: string;
  name: string;
  shortName: string;
  lat: number;
  lng: number;
}

interface RoutePlannerMapProps {
  stopsOnSegment: Stop[];
  polyline: string;
  routeColor: string;
  startStopId: string;
  endStopId: string;
  viaStopId?: string | null;
  onStopClick?: (stop: Stop) => void;
}

const DEFAULT_CENTER = { lat: 23.033, lng: 72.545 }; // Ahmedabad

function RoutePlannerMapInner({
  stopsOnSegment,
  polyline,
  routeColor,
  startStopId,
  endStopId,
  viaStopId,
  onStopClick,
}: RoutePlannerMapProps) {
  const map = useMap();
  const geometryLib = useMapsLibrary("geometry");
  const segmentPolyRef = useRef<google.maps.Polyline | null>(null);

  // ── Draw segment polyline ──────────────────────────────────────────────────
  useEffect(() => {
    if (!map) return;

    // Create the segment polyline once
    segmentPolyRef.current = new google.maps.Polyline({
      map,
      strokeColor: routeColor,
      strokeWeight: 7,
      strokeOpacity: 0.9,
      zIndex: 50,
      icons: [
        {
          icon: {
            path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
            scale: 3,
            strokeColor: "#ffffff",
            strokeWeight: 1,
            fillColor: routeColor,
            fillOpacity: 1,
          },
          offset: "50%",
          repeat: "200px",
        },
      ],
    });

    return () => {
      segmentPolyRef.current?.setMap(null);
      segmentPolyRef.current = null;
    };
  }, [map, routeColor]);

  // ── Update path when polyline data changes ─────────────────────────────────
  useEffect(() => {
    if (!segmentPolyRef.current || !geometryLib || !polyline) return;

    try {
      const decoded = geometryLib.encoding.decodePath(polyline);
      segmentPolyRef.current.setPath(decoded);

      // Fit map to the segment bounds
      if (decoded.length > 0 && map) {
        const bounds = new google.maps.LatLngBounds();
        decoded.forEach((pt) => bounds.extend(pt));
        map.fitBounds(bounds, { top: 80, bottom: 240, left: 32, right: 32 });
      }
    } catch (err) {
      console.warn("Failed to decode segment polyline:", err);
    }
  }, [geometryLib, polyline, map]);

  return (
    <GoogleMap
      defaultCenter={DEFAULT_CENTER}
      defaultZoom={13}
      disableDefaultUI={true}
      mapId="brts-route-planner"
      gestureHandling="greedy"
      style={{ width: "100%", height: "100%" }}
    >
      {stopsOnSegment.map((stop, i) => {
        const isStart = stop.id === startStopId;
        const isEnd   = stop.id === endStopId;
        const isVia   = stop.id === viaStopId;
        const isTerminal = isStart || isEnd;

        return (
          <AdvancedMarker
            key={`planner-stop-${stop.id}-${i}`}
            position={{ lat: stop.lat, lng: stop.lng }}
            title={stop.name}
            onClick={() => onStopClick?.(stop)}
          >
            <div
              className="flex flex-col items-center cursor-pointer group"
              style={{ transform: "translateY(-50%)" }}
            >
              {/* Label pill — always visible for terminals, hover for intermediates */}
              <div
                style={{
                  background: isStart ? "#22c55e" : isEnd ? "#ef4444" : isVia ? "#f59e0b" : "rgba(26,28,41,0.95)",
                  border: `2px solid ${isTerminal || isVia ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.15)"}`,
                  color: "#ffffff",
                  padding: "3px 10px",
                  borderRadius: "999px",
                  fontSize: "10px",
                  fontWeight: 800,
                  letterSpacing: "0.1em",
                  whiteSpace: "nowrap",
                  marginBottom: "6px",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
                  opacity: isTerminal || isVia ? 1 : 0,
                  transition: "opacity 0.2s",
                  pointerEvents: "none",
                }}
                className="group-hover:!opacity-100"
              >
                {stop.shortName}
              </div>

              {/* The dot marker */}
              {isTerminal ? (
                <div style={{ position: "relative" }}>
                  {/* Ripple for terminals */}
                  <div
                    style={{
                      position: "absolute",
                      inset: "-8px",
                      borderRadius: "50%",
                      background: isStart ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)",
                      animation: "pulse 2s infinite",
                    }}
                  />
                  <div
                    style={{
                      width: "22px",
                      height: "22px",
                      borderRadius: "50%",
                      background: isStart ? "#22c55e" : "#ef4444",
                      border: "4px solid #0f1117",
                      boxShadow: `0 0 0 3px ${isStart ? "rgba(34,197,94,0.4)" : "rgba(239,68,68,0.4)"}`,
                      position: "relative",
                      zIndex: 10,
                    }}
                  />
                </div>
              ) : (
                <div
                  style={{
                    width: isVia ? "16px" : "12px",
                    height: isVia ? "16px" : "12px",
                    borderRadius: "50%",
                    background: isVia ? "#f59e0b" : routeColor,
                    border: "3px solid #0f1117",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
                    transition: "transform 0.2s",
                  }}
                  className="group-hover:scale-150"
                />
              )}
            </div>
          </AdvancedMarker>
        );
      })}
    </GoogleMap>
  );
}

export default function RoutePlannerMap(props: RoutePlannerMapProps) {
  return (
    <div style={{ width: "100%", height: "100%" }}>
      <RoutePlannerMapInner {...props} />
    </div>
  );
}
