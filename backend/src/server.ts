/**
 * BusTrack Backend - Main Server Entry Point
 *
 * Responsibilities:
 * - Initialize Express app with middleware (CORS, JSON, Helmet, rate-limit, dotenv)
 * - Create HTTP server and attach Socket.io
 * - Mount REST API route groups (/api/buses, /api/analytics, /api/requests)
 * - Initialize the tracking Socket.io gateway
 * - Start the server and listen on PORT from .env
 */

import "dotenv/config";

import express from "express";
import http from "http";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { Server as SocketServer } from "socket.io";
import { trackingGateway } from "./sockets/trackingGateway";
import { preloadRoutePolylines } from "./lib/etaService";
import busRoutes from "./routes/buses";
import analyticsRoutes from "./routes/analytics";
import requestRoutes from "./routes/requests";
import polylineRoutes from "./routes/polyline";
import planRoutes from "./routes/plan";
import routesListRoutes from "./routes/routesList";

const PORT = process.env.PORT || 4000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3000";

const app = express();
const httpServer = http.createServer(app);

// ── Security Middleware ───────────────────────────────────────────────────────
// Helmet sets safe HTTP headers (X-Content-Type-Options, X-Frame-Options, etc.)
app.use(helmet({
  // Disable CSP here — Socket.io and Google Maps require specific policies
  // that should be configured in the reverse proxy / CDN instead
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// Global HTTP rate limiter — prevents DoS on all REST endpoints
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minute window
  max: 200,             // Max 200 requests per IP per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please slow down." },
});
app.use(globalLimiter);

// Tighter limit for write-heavy mutation endpoints
const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Write rate limit exceeded." },
});

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(cors({ origin: CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: "16kb" })); // Prevent request body size attacks

// ── REST Routes ───────────────────────────────────────────────────────────────
app.use("/api/buses", busRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/requests", writeLimiter, requestRoutes);
app.use("/api/routes", writeLimiter, polylineRoutes);
// Route planner — zero Google Maps API cost at runtime
app.use("/api/plan", planRoutes);
app.use("/api/routes-list", routesListRoutes);

// ── Socket.io ─────────────────────────────────────────────────────────────────
const io = new SocketServer(httpServer, {
  cors: { origin: CORS_ORIGIN, methods: ["GET", "POST"] },
});

// All socket logic is consolidated in trackingGateway — no duplicate listeners
trackingGateway(io);

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
