import { Server } from "socket.io";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  BusLocation,
  PassengerRequest,
} from "../types";
import { db } from "../lib/firebaseAdmin";
import {
  startETATracking,
  stopETATracking,
  getAllETAs,
} from "../lib/etaService";

// Initial data for tracking system
export const activeBuses = new Map<string, BusLocation>();
export const busMetadata = new Map<string, { routeId?: string }>();
export const pendingRequests = new Map<string, PassengerRequest>();

// ── Per-socket rate limiting for driver:location-update ──
// Stores { count, windowStart } per socketId. Max 2 events/sec.
const locationRateMap = new Map<string, { count: number; windowStart: number }>();
const RATE_LIMIT_WINDOW_MS = 1000;
const RATE_LIMIT_MAX = 2;

function isRateLimited(socketId: string): boolean {
  const now = Date.now();
  const entry = locationRateMap.get(socketId);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    locationRateMap.set(socketId, { count: 1, windowStart: now });
    return false;
  }
  if (entry.count >= RATE_LIMIT_MAX) {
    return true;
  }
  entry.count++;
  return false;
}

// ── Reverse map: socketId → busId (for abrupt disconnect cleanup) ──
const socketBusMap = new Map<string, string>();

// ── Input validation helpers ──────────────────────────────────────────────────
function isValidLatLng(lat: unknown, lng: unknown): boolean {
  return (
    typeof lat === "number" && isFinite(lat) && lat >= -90 && lat <= 90 &&
    typeof lng === "number" && isFinite(lng) && lng >= -180 && lng <= 180
  );
}

function isNonEmptyString(val: unknown): val is string {
  return typeof val === "string" && val.trim().length > 0 && val.length < 256;
}

function isValidHeading(h: unknown): boolean {
  return typeof h === "number" && isFinite(h) && h >= 0 && h <= 360;
}

function isValidSpeed(s: unknown): boolean {
  return typeof s === "number" && isFinite(s) && s >= 0 && s <= 300;
}

export function trackingGateway(io: Server<ClientToServerEvents, ServerToClientEvents>): void {
  io.on("connection", (socket) => {
    // ── Admin ──────────────────────────────────────────────────────────────
    socket.on("admin:join", () => {
      socket.join("admin");
      // Emit full current state to newly joined admin
      for (const bus of activeBuses.values()) {
        socket.emit("bus:location-update", bus);
      }
      for (const req of pendingRequests.values()) {
        socket.emit("request:new", req);
      }
    });

    // ── Passenger ─────────────────────────────────────────────────────────
    socket.on("passenger:join", () => {
      socket.join("passengers");
      // Send all currently active buses so the map populates immediately
      for (const bus of activeBuses.values()) {
        socket.emit("bus:location-update", bus);
      }
      // Send cached ETAs so passengers don't need to call Google Maps
      for (const eta of getAllETAs()) {
        socket.emit("bus:eta-update", eta);
      }
    });

    // ── Driver ──────────────────────────────────────────────────────────────
    socket.on("driver:start-tracking", async (payload) => {
      // ── Input Validation ──
      const { busId, driverId, routeId } = payload ?? {};
      if (!isNonEmptyString(busId) || !isNonEmptyString(driverId)) {
        socket.emit("request:new", { requestId: "_err", passengerId: "", busId: "", type: "pickup", lat: 0, lng: 0, status: "cancelled", createdAt: 0 });
        console.warn(`[driver:start-tracking] Invalid payload from socket ${socket.id}`);
        return;
      }

      socket.join(`bus:${busId}`);
      socketBusMap.set(socket.id, busId); // Register for abrupt-disconnect cleanup
      if (routeId && isNonEmptyString(routeId)) {
        busMetadata.set(busId, { routeId });
      }

      // If we have an existing location for this bus, broadcast it with potential new routeId immediately
      const existing = activeBuses.get(busId);
      if (existing) {
        const update = { ...existing, status: "active" as const, routeId };
        activeBuses.set(busId, update);
        io.to("admin").emit("bus:location-update", update);
        io.to("passengers").emit("bus:location-update", update);
      }

      // Send any existing requests for this bus to the connecting driver
      for (const req of pendingRequests.values()) {
        if (req.busId === busId) {
          socket.emit("request:new", req);
        }
      }

      // ── Start server-side ETA tracking ──
      // Fetch the route's last stop as destination from Firestore
      if (routeId && isNonEmptyString(routeId)) {
        try {
          const routeDoc = await db.collection("routes").doc(routeId).get();
          const routeData = routeDoc.data();
          if (routeData && routeData.waypoints && routeData.waypoints.length >= 2) {
            const lastWp = routeData.waypoints[routeData.waypoints.length - 1];
            const destination = { lat: lastWp.lat, lng: lastWp.lng };

            const etaIntervalMs = parseInt(process.env.ETA_INTERVAL_MS || "180000", 10);
            startETATracking(
              io as any,
              busId,
              routeId,
              () => {
                const bus = activeBuses.get(busId);
                return bus ? { lat: bus.lat, lng: bus.lng } : null;
              },
              () => destination,
              etaIntervalMs
            );
          }
        } catch (err) {
          console.error(`❌ Failed to start ETA tracking for bus ${busId}:`, err);
        }
      }
    });

    socket.on("driver:route-update", async (payload) => {
      const { busId, routeId } = payload ?? {};
      // ── Input Validation ──
      if (!isNonEmptyString(busId) || !isNonEmptyString(routeId)) {
        console.warn(`[driver:route-update] Invalid payload from socket ${socket.id}`);
        return;
      }

      busMetadata.set(busId, { routeId });

      // Immediately fetch the last location and broadcast the change
      const current = activeBuses.get(busId);
      if (current) {
        const update = { ...current, routeId };
        activeBuses.set(busId, update);
        io.to("admin").emit("bus:location-update", update);
        io.to("passengers").emit("bus:location-update", update);
        io.to(`bus:${busId}`).emit("bus:location-update", update);

        // PERSISTENCE: Save to Firestore
        try {
          await db.collection("bus_locations").doc(busId).set({
            routeId,
            lastSeen: new Date().toISOString()
          }, { merge: true });
          console.log(`✅ [Firestore] Successfully updated routeId for ${busId}`);
        } catch (err) {
          console.error(`❌ [Firestore] Route update FAILED for ${busId}:`, err);
        }
      }
    });

    socket.on("driver:location-update", async (data) => {
      // ── Rate limiting: max 2 location events/sec per socket ──
      if (isRateLimited(socket.id)) {
        return; // Drop silently — prevents Firestore write flooding
      }

      // ── Input Validation ──
      if (
        !data ||
        !isNonEmptyString(data.busId) ||
        !isNonEmptyString(data.driverId) ||
        !isValidLatLng(data.lat, data.lng) ||
        !isValidHeading(data.heading) ||
        !isValidSpeed(data.speed) ||
        typeof data.timestamp !== "number"
      ) {
        console.warn(`[driver:location-update] Invalid payload from socket ${socket.id}:`, JSON.stringify(data));
        return;
      }

      const metadata = busMetadata.get(data.busId);
      const busLocation: BusLocation = {
        busId: data.busId,
        driverId: data.driverId,
        lat: data.lat,
        lng: data.lng,
        heading: data.heading,
        speed: data.speed,
        timestamp: data.timestamp,
        status: "active",
        routeId: metadata?.routeId,
      };

      activeBuses.set(data.busId, busLocation);

      // ── PERSISTENCE: Live location write (independent try/catch) ──
      try {
        await db.collection("bus_locations").doc(data.busId).set({
          ...busLocation,
          lastSeen: new Date().toISOString()
        }, { merge: true });
      } catch (err) {
        console.error(`❌ [Firestore] bus_locations write FAILED for ${data.busId}:`, err);
      }

      io.to("admin").emit("bus:location-update", busLocation);
      io.to("passengers").emit("bus:location-update", busLocation);
      io.to(`bus:${data.busId}`).emit("bus:location-update", busLocation);
    });

    socket.on("driver:stop-tracking", (payload) => {
      const { busId } = payload ?? {};
      if (!isNonEmptyString(busId)) {
        console.warn(`[driver:stop-tracking] Invalid payload from socket ${socket.id}`);
        return;
      }
      activeBuses.delete(busId);
      busMetadata.delete(busId);
      socketBusMap.delete(socket.id);
      stopETATracking(busId);
      locationRateMap.delete(socket.id); // Clean up rate limit entry
      io.to("admin").emit("bus:stop-tracking", { busId });
      io.to("passengers").emit("bus:stop-tracking", { busId });
      // Mark as inactive in Firestore so stale position doesn't show as live
      db.collection("bus_locations").doc(busId).set(
        { status: "idle", lastSeen: new Date().toISOString() },
        { merge: true }
      ).catch((err) => console.warn(`[Firestore] Failed to mark bus ${busId} idle:`, err));
    });

    socket.on("driver:request-done", (payload) => {
      const { requestId } = payload ?? {};
      if (!isNonEmptyString(requestId)) {
        console.warn(`[driver:request-done] Invalid payload from socket ${socket.id}`);
        return;
      }
      const req = pendingRequests.get(requestId);
      if (req) {
        req.status = "completed";
        io.to("admin").emit("request:updated", req);
        pendingRequests.delete(requestId);
      }
    });

    // ── Passenger ──────────────────────────────────────────────────────────
    socket.on("passenger:request", async (data) => {
      // ── Input Validation ──
      if (
        !data ||
        !isNonEmptyString(data.passengerId) ||
        !isNonEmptyString(data.busId) ||
        !["pickup", "dropoff"].includes(data.type) ||
        !isValidLatLng(data.lat, data.lng)
      ) {
        console.warn(`[passenger:request] Invalid payload from socket ${socket.id}:`, JSON.stringify(data));
        return;
      }

      const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const newRequest: PassengerRequest = {
        requestId,
        passengerId: data.passengerId,
        busId: data.busId,
        type: data.type,
        lat: data.lat,
        lng: data.lng,
        status: "pending",
        createdAt: Date.now(),
      };
      pendingRequests.set(requestId, newRequest);

      // PERSISTENCE: Save request to Firestore
      try {
        await db.collection("passenger_requests").doc(requestId).set(newRequest);
      } catch (err) {
        console.warn(`Firestore request save failed:`, err);
      }

      // Dispatch to admin and specific driver
      io.to("admin").emit("request:new", newRequest);
      io.to(`bus:${data.busId}`).emit("request:new", newRequest);
    });

    // ── Socket disconnect cleanup ──
    // Handles abrupt closure (app killed, network drop) where driver:stop-tracking
    // was never emitted. Without this, the bus stays "active" in memory and Firestore.
    socket.on("disconnect", () => {
      locationRateMap.delete(socket.id);
      const busId = socketBusMap.get(socket.id);
      if (busId) {
        socketBusMap.delete(socket.id);
        activeBuses.delete(busId);
        busMetadata.delete(busId);
        stopETATracking(busId);
        io.to("admin").emit("bus:stop-tracking", { busId });
        io.to("passengers").emit("bus:stop-tracking", { busId });
        // Mark as inactive in Firestore
        db.collection("bus_locations").doc(busId).set(
          { status: "idle", lastSeen: new Date().toISOString() },
          { merge: true }
        ).catch((err) => console.warn(`[Firestore] Failed to mark bus ${busId} idle on disconnect:`, err));
        console.log(`🔌 Socket ${socket.id} disconnected — bus ${busId} marked offline.`);
      }
    });
  });
}
