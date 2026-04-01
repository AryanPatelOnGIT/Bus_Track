import { Server } from "socket.io";
import * as admin from "firebase-admin";
import type {
  ServerToClientEvents,
  ClientToServerEvents,
  BusLocation,
  PassengerRequest,
} from "../types";
import { db } from "../lib/firebaseAdmin";

// Initial data for tracking system
export const activeBuses = new Map<string, BusLocation>();
export const busMetadata = new Map<string, { routeId?: string }>();
export const pendingRequests = new Map<string, PassengerRequest>();

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
    });

    // ── Driver ──────────────────────────────────────────────────────────────
    socket.on("driver:start-tracking", ({ busId, driverId, routeId }) => {
      socket.join(`bus:${busId}`);
      if (routeId) {
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
    });

    socket.on("driver:route-update", async ({ busId, routeId }) => {
      if (routeId) {
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
      }
    });

    socket.on("driver:location-update", async (data) => {
      const metadata = busMetadata.get(data.busId);
      const busLocation: BusLocation = {
        ...data,
        status: "active",
        routeId: metadata?.routeId,
      };
      
      activeBuses.set(data.busId, busLocation);
      
      // PERSISTENCE: Save to Firestore
      console.log(`📡 [Firestore] Attempting to save location for bus ${data.busId}...`);
      try {
        await db.collection("bus_locations").doc(data.busId).set({
          ...busLocation,
          lastSeen: new Date().toISOString()
        }, { merge: true });
        console.log(`✅ [Firestore] Successfully updated bus_locations for ${data.busId}`);
        
        // Optional: Log movement to history collection for replay
        await db.collection("bus_history").add({
          ...busLocation,
          historyTimestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`✅ [Firestore] Successfully added bus_history entry for ${data.busId}`);
      } catch (err) {
        console.error(`❌ [Firestore] Save FAILED for ${data.busId}:`, err);
      }

      io.to("admin").emit("bus:location-update", busLocation);
      io.to("passengers").emit("bus:location-update", busLocation);
      io.to(`bus:${data.busId}`).emit("bus:location-update", busLocation);
    });

    socket.on("driver:stop-tracking", ({ busId }) => {
      activeBuses.delete(busId);
      busMetadata.delete(busId);
      io.to("admin").emit("bus:stop-tracking", { busId });
      io.to("passengers").emit("bus:stop-tracking", { busId });
    });

    socket.on("driver:request-done", ({ requestId }) => {
      const req = pendingRequests.get(requestId);
      if (req) {
        req.status = "completed";
        io.to("admin").emit("request:updated", req);
        pendingRequests.delete(requestId);
      }
    });

    // ── Passenger ──────────────────────────────────────────────────────────
    socket.on("passenger:request", async (data) => {
      const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const newRequest: PassengerRequest = {
        ...data,
        requestId,
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
  });
}
