/**
 * BusTrack Backend - Main Server Entry Point
 *
 * Responsibilities:
 * - Initialize Express app with middleware (CORS, JSON, dotenv) - Ref: Architecture Plan
 * - Create HTTP server and attach Socket.io - Ref: PRD Sec 1, 2, 3 (Real-time sync)
 * - Mount REST API route groups (/api/buses, /api/analytics, /api/requests)
 * - Initialize the tracking Socket.io gateway
 * - Start the server and listen on PORT from .env
 */

import "dotenv/config";

import express from "express";
import http from "http";
import cors from "cors";
import { Server as SocketServer } from "socket.io";
import { trackingGateway } from "./sockets/trackingGateway";
import { registerBusLocationHandlers } from "./socket/busLocationHandler";
import { preloadRoutePolylines } from "./lib/etaService";
import busRoutes from "./routes/buses";
import analyticsRoutes from "./routes/analytics";
import requestRoutes from "./routes/requests";

const PORT = process.env.PORT || 4000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3000";

const app = express();
const httpServer = http.createServer(app);

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json());

// ── REST Routes ───────────────────────────────────────────────────────────────
// TODO: Implement full route logic in respective route files
app.use("/api/buses", busRoutes);         // Fleet data & driver status - Ref: PRD Sec 2, 3
app.use("/api/analytics", analyticsRoutes); // Aggregate stats for admin - Ref: PRD Sec 3
app.use("/api/requests", requestRoutes);   // Passenger pickup/dropoff - Ref: PRD Sec 1

// ── Socket.io ─────────────────────────────────────────────────────────────────
const io = new SocketServer(httpServer, {
  cors: { origin: CORS_ORIGIN, methods: ["GET", "POST"] },
});
trackingGateway(io); // Delegate all real-time events to gateway - Ref: PRD Sec 1, 2, 3

// ── Additive: bus:location simulation handler ─────────────────────────────────
io.on("connection", (socket) => {
  registerBusLocationHandlers(io, socket);
});

// ── Health Check ──────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Start Server ──────────────────────────────────────────────────────────────
httpServer.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`✅ BusTrack backend running on port ${PORT} (0.0.0.0)`);
  // Pre-load route polylines from Firestore into memory for zero-cost serving
  preloadRoutePolylines().catch((err) =>
    console.error("Failed to preload polylines:", err)
  );
});

export { io };
