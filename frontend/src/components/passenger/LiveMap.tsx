"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";
import { PREDEFINED_ROUTES } from "@/lib/predefinedRoutes";

// ── Types ────────────────────────────────────────────────────────────────────
export interface BusLocation {
  busId: string;
  lat: number;
  lng: number;
  heading: number;
  speed: number;
  timestamp: number;
  status: "active" | "idle" | "maintenance";
  routeId?: string;
}

interface LiveMapProps {
  onMapClick?: (lat: number, lng: number) => void;
  selectedPin?: { lat: number; lng: number } | null;
}

// ── SVG Bus Icon Factory ─────────────────────────────────────────────────────
function busIconSvg(heading: number, status: string): string {
  const color = status === "active" ? "#22c55e" : status === "idle" ? "#f59e0b" : "#ef4444";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
    <g transform="rotate(${heading}, 16, 16)">
      <rect x="8" y="6" width="16" height="20" rx="3" fill="${color}" opacity="0.9"/>
      <rect x="10" y="8" width="12" height="8" rx="1" fill="white" opacity="0.3"/>
      <circle cx="11" cy="27" r="2.5" fill="#0a1628"/>
      <circle cx="21" cy="27" r="2.5" fill="#0a1628"/>
      <rect x="14" y="4" width="4" height="3" rx="1" fill="${color}"/>
    </g>
  </svg>`;
}

// ── Start/End Stop Icon ───────────────────────────────────────────────────────
function stopIconHtml(label: string, color: string): string {
  return `<div style="width:32px;height:32px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;color:white;font-size:11px;font-weight:bold;">${label}</div>`;
}

// ── Component ────────────────────────────────────────────────────────────────
function LiveMapInner({ onMapClick, selectedPin }: LiveMapProps) {
  const {
    MapContainer,
    TileLayer,
    Marker,
    Popup,
    Circle,
    Polyline,
    useMapEvents,
  } = require("react-leaflet"); // eslint-disable-line @typescript-eslint/no-require-imports
  const L = require("leaflet");   // eslint-disable-line @typescript-eslint/no-require-imports

  const [buses, setBuses] = useState<Map<string, BusLocation>>(new Map());
  const socketRef = useRef<ReturnType<typeof import("socket.io-client").io> | null>(null);
  const [connected, setConnected] = useState(false);

  // ── Socket: join passenger room to receive bus broadcasts ────────────────
  useEffect(() => {
    import("socket.io-client").then(({ io }) => {
      const socket = io(process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000", {
        transports: ["websocket"],
      });
      socketRef.current = socket;

      socket.on("connect", () => {
        setConnected(true);
        // Tell server we're a passenger — triggers initial bus list
        socket.emit("passenger:join");
      });
      socket.on("disconnect", () => setConnected(false));
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
    return () => { socketRef.current?.disconnect(); };
  }, []);

  // ── Dynamic route tracking based on active buses ──────────────────
  const [predefinedRoute, setPredefinedRoute] = useState<[number, number][]>([]);
  const [activeRouteId, setActiveRouteId] = useState<string | null>(null);

  useEffect(() => {
    // Find the first active bus that has a route assignment
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
              const coords: [number, number][] = data.routes[0].geometry.coordinates.map(
                (c: [number, number]) => [c[1], c[0]]
              );
              setPredefinedRoute(coords);
            }
          })
          .catch((err) => console.error("Error fetching predefined route:", err));
      }
    }
  }, [buses, activeRouteId]);

  // ── Map click handler ─────────────────────────────────────────────────────
  function ClickHandler() {
    useMapEvents({
      click(e: { latlng: { lat: number; lng: number } }) {
        onMapClick?.(e.latlng.lat, e.latlng.lng);
      },
    });
    return null;
  }

  // ── Bus markers ───────────────────────────────────────────────────────────
  const busMarkers = Array.from(buses.values()).map((bus) => {
    const icon = L.divIcon({
      className: "",
      html: busIconSvg(bus.heading, bus.status),
      iconSize: [32, 32],
      iconAnchor: [16, 16],
      popupAnchor: [0, -20],
    });
    return (
      <Marker key={bus.busId} position={[bus.lat, bus.lng]} icon={icon}>
        <Popup>
          <div style={{ fontFamily: "Inter, sans-serif", minWidth: 140 }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>🚌 Bus {bus.busId}</div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>
              Speed: {bus.speed.toFixed(1)} km/h<br />
              Status: {bus.status}<br />
              Heading: {bus.heading}°
            </div>
          </div>
        </Popup>
      </Marker>
    );
  });

  // ── Route stop markers ────────────────────────────────────────────────────
  const startIcon = L.divIcon({
    className: "",
    html: stopIconHtml("A", "#22c55e"),
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  });
  const endIcon = L.divIcon({
    className: "",
    html: stopIconHtml("B", "#ef4444"),
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -18],
  });

  // ── Selected pin marker ───────────────────────────────────────────────────
  const pinIcon = selectedPin
    ? L.divIcon({
        className: "",
        html: `<div style="width:20px;height:20px;border-radius:50%;background:#f5a623;border:3px solid white;box-shadow:0 0 0 4px rgba(245,166,35,0.3)"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      })
    : null;

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <MapContainer
        center={[23.0347, 72.5483]}
        zoom={14}
        style={{ width: "100%", height: "100%" }}
        zoomControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <ClickHandler />

        {/* ── Predefined route: Ahmedabad University → Samras Boys Hostel ── */}
        {/* ── Predefined route ── */}
        {predefinedRoute.length > 0 && (
          <>
            <Polyline
              positions={predefinedRoute}
              color="#3b82f6"
              weight={6}
              opacity={0.8}
              dashArray="12, 8"
            />
            {/* Route markers — placing them at start/end of the fetched path */}
            <Marker position={predefinedRoute[0]} icon={startIcon}>
              <Popup>Route Start</Popup>
            </Marker>
            <Marker position={predefinedRoute[predefinedRoute.length - 1]} icon={endIcon}>
              <Popup>Route End</Popup>
            </Marker>
          </>
        )}

        {/* Live bus markers */}
        {busMarkers}

        {/* Selected pickup/dropoff pin */}
        {selectedPin && pinIcon && (
          <>
            <Marker position={[selectedPin.lat, selectedPin.lng]} icon={pinIcon} />
            <Circle
              center={[selectedPin.lat, selectedPin.lng]}
              radius={100}
              color="#f5a623"
              fillColor="#f5a623"
              fillOpacity={0.1}
            />
          </>
        )}
      </MapContainer>

      {/* ── Overlays (must be OUTSIDE MapContainer to render correctly) ──── */}

      {/* Connection status badge */}
      <div
        style={{
          position: "absolute",
          bottom: 16,
          right: 16,
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "rgba(10,22,40,0.85)",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 8,
          padding: "6px 12px",
          fontSize: 12,
          color: "white",
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: connected ? "#22c55e" : "#ef4444",
          }}
        />
        {connected ? "Live" : "Connecting…"}
      </div>

      {/* Active bus count badge */}
      {buses.size > 0 && (
        <div
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            zIndex: 1000,
            background: "rgba(10,22,40,0.85)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8,
            padding: "6px 12px",
            fontSize: 12,
            color: "white",
          }}
        >
          🚌 {buses.size} bus{buses.size !== 1 ? "es" : ""} active
        </div>
      )}

      {/* Route legend */}
      {predefinedRoute.length > 0 && (
        <div
          style={{
            position: "absolute",
            bottom: 16,
            left: 16,
            zIndex: 1000,
            background: "rgba(10,22,40,0.85)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 8,
            padding: "8px 12px",
            fontSize: 12,
            color: "white",
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 6, color: "#3b82f6" }}>🗺 {PREDEFINED_ROUTES.find(r => r.id === activeRouteId)?.name || "Bus Route"}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#22c55e", display: "inline-block" }} />
            Start Point
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#ef4444", display: "inline-block" }} />
            End Point
          </div>
        </div>
      )}
    </div>
  );
}

// SSR-safe export
export default dynamic(() => Promise.resolve(LiveMapInner), { ssr: false });
