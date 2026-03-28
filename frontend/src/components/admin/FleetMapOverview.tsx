"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";
import { PREDEFINED_ROUTES } from "@/lib/predefinedRoutes";

interface BusLocation {
  busId: string;
  driverId: string;
  lat: number;
  lng: number;
  heading: number;
  speed: number;
  timestamp: number;
  status: "active" | "idle" | "maintenance";
  routeId?: string;
}

function busIconSvg(heading: number, status: string): string {
  const color = status === "active" ? "#22c55e" : status === "idle" ? "#f59e0b" : "#ef4444";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
    <circle cx="14" cy="14" r="14" fill="${color}" opacity="0.15" />
    <g transform="rotate(${heading}, 14, 14)">
      <path d="M14 4 L22 22 L14 18 L6 22 Z" fill="${color}" stroke="white" stroke-width="1.5"/>
    </g>
  </svg>`;
}

function FleetMapOverviewInner() {
  const { MapContainer, TileLayer, Marker, Popup, Polyline } = require("react-leaflet"); // eslint-disable-line @typescript-eslint/no-require-imports
  const L = require("leaflet"); // eslint-disable-line @typescript-eslint/no-require-imports

  const [buses, setBuses] = useState<Map<string, BusLocation>>(new Map());

  useEffect(() => {
    let socket: ReturnType<typeof import("socket.io-client").io> | null = null;
    import("socket.io-client").then(({ io }) => {
      socket = io(process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000", {
        transports: ["websocket"],
      });

      socket.emit("admin:join");
      socket.on("bus:location-update", (data: BusLocation) => {
        setBuses((prev) => new Map(prev).set(data.busId, data));
      });
      socket.on("bus:stop-tracking", ({ busId }) => {
        setBuses((prev) => {
          const next = new Map(prev);
          next.delete(busId);
          return next;
        });
      });
    });

    return () => { socket?.disconnect(); };
  }, []);

  const [predefinedRoute, setPredefinedRoute] = useState<[number, number][]>([]);
  const [activeRouteId, setActiveRouteId] = useState<string | null>(null);

  useEffect(() => {
    // Sync with the first active bus's route selection
    const firstBusWithRoute = Array.from(buses.values()).find(b => b.routeId);
    const newRouteId = firstBusWithRoute?.routeId || PREDEFINED_ROUTES[0].id;

    if (newRouteId !== activeRouteId) {
      setActiveRouteId(newRouteId);
      const route = PREDEFINED_ROUTES.find(r => r.id === newRouteId);
      if (route) {
        const waypointsParam = route.waypoints.map(w => `${w[0]},${w[1]}`).join(";");
        fetch(`https://router.project-osrm.org/route/v1/driving/${waypointsParam}?overview=full&geometries=geojson`)
          .then((res) => res.json())
          .then((data) => {
            if (data.routes && data.routes.length > 0) {
              const coords = data.routes[0].geometry.coordinates.map((c: any) => [c[1], c[0]] as [number, number]);
              setPredefinedRoute(coords);
            }
          })
          .catch((err) => console.error("Error fetching predefined route:", err));
      }
    }
  }, [buses, activeRouteId]);

  const markers = Array.from(buses.values()).map((bus) => {
    const icon = L.divIcon({
      className: "",
      html: busIconSvg(bus.heading, bus.status),
      iconSize: [28, 28],
      iconAnchor: [14, 14],
      popupAnchor: [0, -14],
    });
    return (
      <Marker key={bus.busId} position={[bus.lat, bus.lng]} icon={icon}>
        <Popup>
          <div style={{ fontFamily: "Inter, sans-serif" }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Bus {bus.busId}</div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>
              Driver: {bus.driverId}<br />
              Status: <span style={{ textTransform: "capitalize" }}>{bus.status}</span><br />
              Speed: {bus.speed.toFixed(1)} km/h<br />
              Heading: {bus.heading}°
            </div>
          </div>
        </Popup>
      </Marker>
    );
  });

  return (
    <MapContainer
      center={[23.0347, 72.5483]}
      zoom={14}
      style={{ width: "100%", height: "100%", zIndex: 0 }}
      zoomControl={false}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      {predefinedRoute.length > 0 && (
        <Polyline 
          positions={predefinedRoute} 
          color="#3b82f6" 
          weight={6} 
          opacity={0.8}
          dashArray="10, 10"
        />
      )}
      {markers}
    </MapContainer>
  );
}

export default dynamic(() => Promise.resolve(FleetMapOverviewInner), { ssr: false });
