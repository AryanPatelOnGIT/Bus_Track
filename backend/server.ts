/**
 * server.ts
 *
 * Production-grade Express + Socket.io server for Nakshatra Nav (BusTracker).
 *
 * FINDINGS REMEDIATED:
 *   #4 — Socket.io connections now require a valid Firebase ID token.
 *         Failed token verification EXPLICITLY rejects the connection with
 *         `next(new Error("Authentication failed"))` — no silent downgrade.
 *   #7 — The DISABLE_SOCKET_AUTH bypass is strictly gated behind
 *         `process.env.NODE_ENV === 'development'`.  It is dead code in prod.
 */

import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server, Socket } from 'socket.io';
import { getAdminApp } from '@/backend/lib/firebaseAdmin';
import { registerTrackingGateway } from '@/backend/lib/trackingGateway';
import router from '@/backend/lib/routes';

// ─── Environment ─────────────────────────────────────────────────────────────

const PORT        = Number(process.env.PORT ?? 4000);
const NODE_ENV    = process.env.NODE_ENV ?? 'production';
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? 'http://localhost:3000';

// ─── Express app ─────────────────────────────────────────────────────────────

const app = express();

app.use(cors({
  origin: CLIENT_ORIGIN,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '256kb' }));
app.use(express.urlencoded({ extended: false }));

// Mount REST routes (each route is individually protected — see lib/routes.ts).
app.use(router);

// Basic health endpoint — no auth required.
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', env: NODE_ENV, ts: new Date().toISOString() });
});

// ─── HTTP + Socket.io server ──────────────────────────────────────────────────

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_ORIGIN,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  // Limit ping interval to detect stale driver connections quickly.
  pingInterval: 10_000,
  pingTimeout:  5_000,
});

// ─── Socket.io authentication middleware ─────────────────────────────────────

/**
 * Augment the Socket type so TypeScript knows about our custom properties.
 */
declare module 'socket.io' {
  interface Socket {
    /** UID of the verified Firebase user. */
    uid: string;
    /** Custom Claim role: 'admin' | 'driver' | 'passenger' */
    role: string;
    /** True if the user holds the admin Custom Claim. */
    isAdmin: boolean;
  }
}

io.use(async (socket: Socket, next: (err?: Error) => void) => {
  // ── FINDING #7: DEV-ONLY bypass ────────────────────────────────────────────
  // This block is compiled away in production. Never remove the NODE_ENV guard.
  if (NODE_ENV === 'development' && process.env.DISABLE_SOCKET_AUTH === 'true') {
    console.warn('[Socket.io] ⚠️  Auth bypassed — DEVELOPMENT MODE ONLY');
    socket.uid     = 'dev-user';
    socket.role    = 'driver';
    socket.isAdmin = false;
    return next();
  }
  // ── End dev bypass ─────────────────────────────────────────────────────────

  // Extract token from handshake (clients must send via `auth: { token }` or
  // as a query param `?token=` — prefer `auth` object as it is not logged).
  const rawToken =
    (socket.handshake.auth as Record<string, unknown>)?.token ??
    socket.handshake.query?.token;

  if (typeof rawToken !== 'string' || rawToken.trim() === '') {
    // FINDING #4: explicit rejection — no silent downgrade.
    return next(new Error('Authentication failed: no token provided'));
  }

  try {
    // Verify the token server-side using Firebase Admin.
    const decoded = await getAdminApp()
      .auth()
      .verifyIdToken(rawToken.trim(), /* checkRevoked= */ true);

    // Attach verified identity to the socket for use in event handlers.
    socket.uid     = decoded.uid;
    socket.role    = (decoded.role as string) ?? 'passenger';
    socket.isAdmin = decoded.role === 'admin';

    return next();
  } catch (err: unknown) {
    // FINDING #4: catch block MUST call next(Error) — never swallow this.
    const message =
      (err as Error)?.message?.includes('revoked')
        ? 'Authentication failed: token revoked'
        : 'Authentication failed: invalid token';

    console.error('[Socket.io] Auth rejection:', message, {
      socketId: socket.id,
      ip: socket.handshake.address,
    });

    return next(new Error(message));
  }
});

// ─── Register event gateways ─────────────────────────────────────────────────

io.on('connection', (socket: Socket) => {
  console.info(`[Socket.io] ✅ Connected uid=${socket.uid} role=${socket.role} id=${socket.id}`);

  // All driver tracking events are handled inside the gateway.
  registerTrackingGateway(io, socket);

  socket.on('disconnect', (reason) => {
    console.info(`[Socket.io] ❌ Disconnected uid=${socket.uid} reason=${reason}`);
  });
});

// ─── Start server ─────────────────────────────────────────────────────────────

httpServer.listen(PORT, () => {
  console.info(`[Server] 🚀 Listening on port ${PORT} (${NODE_ENV})`);
});

export { io, app };
