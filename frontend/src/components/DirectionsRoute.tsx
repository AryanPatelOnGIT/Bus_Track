import { useEffect, useState } from "react";
import { useMap, useMapsLibrary, AdvancedMarker } from "@vis.gl/react-google-maps";

interface DirectionsRouteProps {
  waypoints: google.maps.LatLngLiteral[];
  /** Pre-computed encoded polyline from Firestore — if provided, NO API call is made */
  encodedPolyline?: string;
  showMarkers?: boolean;
  onRouteResultV2?: (result: any) => void;
}

export function DirectionsRoute({ waypoints, encodedPolyline, showMarkers = true, onRouteResultV2 }: DirectionsRouteProps) {
  const map = useMap();
  const geometryLib = useMapsLibrary("geometry");
  const [polyline, setPolyline] = useState<google.maps.Polyline | null>(null);

  // Initialize a single, clean Polyline
  useEffect(() => {
    if (!map) return;

    const pl = new google.maps.Polyline({
      map,
      strokeColor: "#4285F4", // Standard Google Blue
      strokeWeight: 6,
      strokeOpacity: 0.8,
      zIndex: 50,
    });

    setPolyline(pl);
    return () => pl.setMap(null);
  }, [map]);

  // Display route — use pre-computed polyline if available, otherwise fallback to waypoints
  useEffect(() => {
    if (!polyline || !geometryLib) return;

    // PRIORITY 1: Use the pre-computed encoded polyline (ZERO API cost)
    if (encodedPolyline) {
      try {
        const decodedPath = geometryLib.encoding.decodePath(encodedPolyline);
        polyline.setOptions({ strokeOpacity: 0.8, icons: [] });
        polyline.setPath(decodedPath);

        if (onRouteResultV2) {
          // Provide a synthetic result for backward compatibility
          onRouteResultV2({
            routes: [{
              polyline: { encodedPolyline },
              distanceMeters: 0,
              duration: "0s",
            }]
          });
        }
        return;
      } catch (err) {
        console.warn("Failed to decode pre-computed polyline, falling back:", err);
      }
    }

    // PRIORITY 2: Fallback — draw straight lines between waypoints (no API call)
    if (waypoints.length >= 2) {
      polyline.setOptions({ strokeOpacity: 0.5, icons: [] });
      polyline.setPath(waypoints);

      if (onRouteResultV2) {
        onRouteResultV2({
          routes: [{
            polyline: { encodedPolyline: "" },
            distanceMeters: 0,
            duration: "0s",
          }]
        });
      }
    }
  }, [polyline, geometryLib, waypoints, encodedPolyline, onRouteResultV2]);

  return (
    <>
      {showMarkers && waypoints.map((wp, i) => (
        <AdvancedMarker key={`stop-${i}`} position={wp}>
          <div className="group relative flex items-center justify-center">
            {/* Soft Glow */}
            <div className="absolute inset-0 bg-blue-500/20 blur-md rounded-full" />
            
            {/* Stop Circle */}
            <div className="relative w-7 h-7 rounded-full bg-slate-900 border-2 border-white flex items-center justify-center text-white text-[10px] font-bold shadow-2xl transition-transform hover:scale-110">
              {i === 0 ? "A" : i === waypoints.length - 1 ? "B" : i + 1}
            </div>
            
            {/* Number Tooltip on Hover */}
            <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white px-2 py-0.5 rounded text-[10px] font-bold border border-white/20 whitespace-nowrap z-50">
               {i === 0 ? "Start" : i === waypoints.length - 1 ? "End" : `Stop ${i+1}`}
            </div>
          </div>
        </AdvancedMarker>
      ))}
    </>
  );
}
