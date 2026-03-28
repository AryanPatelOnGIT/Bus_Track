/**
 * BusTrack - Shared TypeScript Types
 *
 * All types shared across backend modules.
 * Ref: PRD Sec 1 (Passenger), Sec 2 (Driver), Sec 3 (Admin)
 */

// ── Driver / Bus ──────────────────────────────────────────────────────────────

export interface BusLocation {
  busId: string;
  driverId: string;
  lat: number;
  lng: number;
  heading: number;     // degrees, 0 = North
  speed: number;       // km/h
  timestamp: number;   // Unix ms
  status: "active" | "idle" | "maintenance";
  routeId?: string;    // The ID from PREDEFINED_ROUTES
}

// ── Passenger Requests ────────────────────────────────────────────────────────

export type RequestType = "pickup" | "dropoff";

export interface PassengerRequest {
  requestId: string;
  passengerId: string;
  busId: string;       // Target bus
  type: RequestType;
  lat: number;
  lng: number;
  status: "pending" | "accepted" | "completed" | "cancelled";
  createdAt: number;   // Unix ms
}

// ── Analytics ─────────────────────────────────────────────────────────────────

export interface FleetStats {
  totalBuses: number;
  activeBuses: number;
  maintenanceBuses: number;
  ongoingTrips: number;
  passengerCount: number;
}

// ── Socket Events ─────────────────────────────────────────────────────────────

export interface ServerToClientEvents {
  "bus:location-update": (data: BusLocation) => void;
  "bus:stop-tracking": (data: { busId: string }) => void;
  "request:new": (req: PassengerRequest) => void;
  "request:updated": (req: PassengerRequest) => void;
  "fleet:stats": (stats: FleetStats) => void;
}

export interface ClientToServerEvents {
  "driver:start-tracking": (data: { busId: string; driverId: string; routeId?: string }) => void;
  "driver:location-update": (data: Omit<BusLocation, "status">) => void;
  "driver:stop-tracking": (data: { busId: string }) => void;
  "driver:request-done": (data: { requestId: string }) => void;
  "passenger:request": (data: Omit<PassengerRequest, "requestId" | "status" | "createdAt">) => void;
  "passenger:join": () => void;
  "admin:join": () => void;
}
