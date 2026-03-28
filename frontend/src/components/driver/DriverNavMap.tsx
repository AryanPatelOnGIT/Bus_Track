"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";

interface PassengerRequest {
  requestId: string;
  type: "pickup" | "dropoff";
  lat: number;
  lng: number;
}

interface Props {
  driverLocation: { lat: number; lng: number; heading: number } | null;
  requests: PassengerRequest[];
  selectedRouteId?: string;
}

function DriverNavMapInner({ driverLocation, requests, selectedRouteId }: Props) {
  const { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } = require("react-leaflet"); // eslint-disable-line @typescript-eslint/no-require-imports
  const L = require("leaflet"); // eslint-disable-line @typescript-eslint/no-require-imports

  const [routePath, setRoutePath] = useState<[number, number][]>([]);
  const [assignedPath, setAssignedPath] = useState<[number, number][]>([]);

  // Fetch nearest request route
  useEffect(() => {
    if (driverLocation && requests.length > 0) {
      const startParam = `${driverLocation.lng},${driverLocation.lat}`;
      const endParam = `${requests[0].lng},${requests[0].lat}`;
      
      fetch(`https://router.project-osrm.org/route/v1/driving/${startParam};${endParam}?overview=full&geometries=geojson`)
        .then((res) => res.json())
        .then((data) => {
          if (data.routes && data.routes.length > 0) {
            const coords = data.routes[0].geometry.coordinates.map((c: any) => [c[1], c[0]]);
            setRoutePath(coords);
          }
        })
        .catch((err) => console.error("Error fetching request route:", err));
    } else {
      setRoutePath([]);
    }
  }, [driverLocation, requests]);

  // Fetch assigned path route
  useEffect(() => {
    if (selectedRouteId) {
      const { PREDEFINED_ROUTES } = require("@/lib/predefinedRoutes");
      const route = PREDEFINED_ROUTES.find((r: any) => r.id === selectedRouteId);
      if (route && route.waypoints.length >= 2) {
        const waypointsParam = route.waypoints.map((w: any) => `${w[0]},${w[1]}`).join(";");
        fetch(`https://router.project-osrm.org/route/v1/driving/${waypointsParam}?overview=full&geometries=geojson`)
          .then((res) => res.json())
          .then((data) => {
            if (data.routes && data.routes.length > 0) {
              const coords = data.routes[0].geometry.coordinates.map((c: any) => [c[1], c[0]]);
              setAssignedPath(coords);
            }
          })
          .catch((err) => console.error("Error fetching assigned route:", err));
      }
    } else {
      setAssignedPath([]);
    }
  }, [selectedRouteId]);

  // Map Recenter Component
  function Recenter({ lat, lng }: { lat: number; lng: number }) {
    const map = useMap();
    useEffect(() => {
      map.setView([lat, lng], map.getZoom(), { animate: true });
    }, [lat, lng, map]);
    return null;
  }

  // Icons
  const driverIcon = (heading: number) => L.divIcon({
    className: "",
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 32 32">
        <g transform="rotate(${heading}, 16, 16)">
          <path d="M16 4 L26 26 L16 22 L6 26 Z" fill="#3b82f6" stroke="white" stroke-width="2"/>
        </g>
      </svg>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });

  const requestIcon = (type: "pickup" | "dropoff") => L.divIcon({
    className: "",
    html: `<div style="width:24px;height:24px;border-radius:50%;background:${
      type === "pickup" ? "#22c55e" : "#ef4444"
    };border:3px solid white;box-shadow:0 0 0 4px ${
      type === "pickup" ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"
    }; display:flex; align-items:center; justify-content:center; color:white; font-size:12px; font-weight:bold;">${
      type === "pickup" ? "P" : "D"
    }</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });

  return (
    <MapContainer
      center={driverLocation ? [driverLocation.lat, driverLocation.lng] : [23.0225, 72.5714]}
      zoom={15}
      style={{ width: "100%", height: "100%", zIndex: 0 }}
      zoomControl={false}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      
      {driverLocation && <Recenter lat={driverLocation.lat} lng={driverLocation.lng} />}

      {driverLocation && (
        <Marker position={[driverLocation.lat, driverLocation.lng]} icon={driverIcon(driverLocation.heading)}>
          <Popup>You (Live)</Popup>
        </Marker>
      )}

      {requests.map((r) => (
        <Marker key={r.requestId} position={[r.lat, r.lng]} icon={requestIcon(r.type)}>
          <Popup>{r.type === "pickup" ? "Pickup" : "Drop-off"} Request</Popup>
        </Marker>
      ))}

      {/* Assigned path (Bus Route) */}
      {assignedPath.length > 0 && (
        <Polyline 
          positions={assignedPath} 
          color="#3b82f6" 
          weight={8} 
          opacity={0.4}
        />
      )}

      {/* Highlighted route to the nearest request */}
      {routePath.length > 0 ? (
        <Polyline 
          positions={routePath} 
          color="#3b82f6" 
          weight={6} 
          opacity={0.8}
        />
      ) : driverLocation && requests.length > 0 && (
        <Polyline 
          positions={[
            [driverLocation.lat, driverLocation.lng],
            [requests[0].lat, requests[0].lng]
          ]} 
          color="#3b82f6" 
          dashArray="5, 10" 
          weight={4} 
        />
      )}
    </MapContainer>
  );
}

export default dynamic(() => Promise.resolve(DriverNavMapInner), { ssr: false });
