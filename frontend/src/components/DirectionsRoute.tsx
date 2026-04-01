import { useEffect, useState } from "react";
import { useMap, useMapsLibrary, AdvancedMarker } from "@vis.gl/react-google-maps";
import { computeRouteV2 } from "@/lib/googleMapsRoutes";

interface DirectionsRouteProps {
  waypoints: google.maps.LatLngLiteral[];
  showMarkers?: boolean;
  onRouteResultV2?: (result: any) => void;
}

export function DirectionsRoute({ waypoints, showMarkers = true, onRouteResultV2 }: DirectionsRouteProps) {
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

  // Compute Route V2
  useEffect(() => {
    if (!polyline || !geometryLib || waypoints.length < 2) return;

    const origin = waypoints[0];
    const destination = waypoints[waypoints.length - 1];
    const intermediates = waypoints.slice(1, -1);

    const fetchRoute = async () => {
      try {
        const result = await computeRouteV2({
          origin,
          destination,
          intermediates,
        });

        if (result.routes && result.routes[0]) {
          const route = result.routes[0];
          const encodedPolyline = route.polyline.encodedPolyline;
          const decodedPath = geometryLib.encoding.decodePath(encodedPolyline);
          
          // Switch to solid line on success
          polyline.setOptions({ strokeOpacity: 0.8, icons: [] });
          polyline.setPath(decodedPath);
          
          if (onRouteResultV2) onRouteResultV2(result);
        }
      } catch (err) {
        console.error("Routes API v2 failed - no path will be shown:", err);
        if (polyline) polyline.setPath([]);
      }
    };

    fetchRoute();
  }, [polyline, geometryLib, waypoints, onRouteResultV2]);

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
