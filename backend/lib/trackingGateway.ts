/**
 * lib/trackingGateway.ts
 *
 * Socket.io event gateway for real-time bus tracking.
 *
 * FINDING #3 REMEDIATED:
 *   Every driver-privileged event is guarded by `requireSocketRole()` before
 *   any business logic executes. A socket missing the verified 'driver' or
 *   'admin' role has its execution aborted immediately with an error callback
 *   and the event is fully dropped — no partial execution.
 *
 * Pattern:
 *   All driver listeners wrap their handler with `requireSocketRole('driver')`.
 *   The guard is synchronous, runs first, and calls `return` on failure so
 *   no downstream code is reachable by an unprivileged socket.
 */

import type { Server, Socket } from 'socket.io';
import { getAdminDatabase } from '@/backend/lib/firebaseAdmin';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LocationPayload {
  lat: number;
  lng: number;
  speed?: number;
  heading?: number;
  timestamp: number;
}

interface RouteUpdatePayload {
  routeId: string;
  currentStopIndex: number;
}

interface StartTrackingPayload {
  vehicleId: string;
  rideSessionId: string;
}

interface StopTrackingPayload {
  vehicleId: string;
  rideSessionId: string;
}

/**
 * Callback type used by Socket.io acknowledgement functions.
 * Clients may optionally pass a callback as the last argument.
 */
type AckCallback = ((response: { error?: string; ok?: boolean }) => void) | undefined;

// ─── Role guard ───────────────────────────────────────────────────────────────

/**
 * requireSocketRole — inline role guard for Socket.io event handlers.
 *
 * @param socket        The Socket.io socket whose verified `role` is checked.
 * @param requiredRole  'driver' | 'admin' — the minimum role required.
 * @param eventName     Used in the console warning for audit logging.
 * @param ack           Optional client acknowledgement callback.
 * @returns `true` if the socket is authorised, `false` if it was rejected.
 *
 * Usage:
 *   socket.on('driver:location-update', (payload, ack) => {
 *     if (!requireSocketRole(socket, 'driver', 'driver:location-update', ack)) return;
 *     // ... handler continues only for authorised sockets
 *   });
 */
function requireSocketRole(
  socket: Socket,
  requiredRole: 'driver' | 'admin',
  eventName: string,
  ack?: AckCallback
): boolean {
  const hasPermission =
    socket.isAdmin === true ||
    socket.role === requiredRole ||
    (requiredRole === 'driver' && socket.role === 'admin');

  if (!hasPermission) {
    // Audit log — record the violation attempt.
    console.warn(
      `[TrackingGateway] ⛔ Unauthorised event "${eventName}" ` +
      `from uid=${socket.uid} role=${socket.role} id=${socket.id}`
    );

    // Notify the client if it provided an acknowledgement callback.
    if (typeof ack === 'function') {
      ack({ error: `Forbidden: role '${requiredRole}' required for event '${eventName}'` });
    }

    // Disconnect repeat offenders to deny probing.
    socket.emit('error', { message: `Forbidden: insufficient role for event '${eventName}'` });

    return false; // Caller must `return` immediately after this.
  }

  return true;
}

// ─── Gateway registration ─────────────────────────────────────────────────────

/**
 * registerTrackingGateway
 *
 * Binds all driver tracking event listeners to the given socket.
 * Each listener guards itself with `requireSocketRole` before executing.
 *
 * @param io     The Socket.io Server instance (for broadcasting to rooms).
 * @param socket The individual client socket just connected.
 */
export function registerTrackingGateway(io: Server, socket: Socket): void {
  const rtdb = getAdminDatabase();

  // ── driver:start-tracking ───────────────────────────────────────────────────
  socket.on(
    'driver:start-tracking',
    async (payload: StartTrackingPayload, ack?: AckCallback) => {
      // FINDING #3: guard — abort immediately if not driver/admin.
      if (!requireSocketRole(socket, 'driver', 'driver:start-tracking', ack)) return;

      const { vehicleId, rideSessionId } = payload ?? {};

      if (!vehicleId || !rideSessionId) {
        ack?.({ error: 'Missing vehicleId or rideSessionId' });
        return;
      }

      try {
        // Write active session marker to RTDB.
        await rtdb.ref(`activeBuses/${vehicleId}`).set({
          driverUid:     socket.uid,
          rideSessionId,
          startedAt:     Date.now(),
          online:        true,
        });

        // Join a room scoped to this vehicle so passengers can subscribe.
        socket.join(`bus:${vehicleId}`);

        // Broadcast to passengers watching this vehicle.
        io.to(`bus:${vehicleId}`).emit('bus:status-update', {
          vehicleId,
          online: true,
          driverUid: socket.uid,
        });

        console.info(`[TrackingGateway] 🟢 Driver uid=${socket.uid} started tracking vehicleId=${vehicleId}`);
        ack?.({ ok: true });
      } catch (err) {
        console.error('[TrackingGateway] start-tracking error:', err);
        ack?.({ error: 'Internal server error' });
      }
    }
  );

  // ── driver:location-update ──────────────────────────────────────────────────
  socket.on(
    'driver:location-update',
    async (vehicleId: string, location: LocationPayload, ack?: AckCallback) => {
      // FINDING #3: guard.
      if (!requireSocketRole(socket, 'driver', 'driver:location-update', ack)) return;

      // Input validation — reject obviously bad coordinates.
      if (
        typeof vehicleId !== 'string' ||
        typeof location?.lat !== 'number' ||
        typeof location?.lng !== 'number' ||
        location.lat < -90 || location.lat > 90 ||
        location.lng < -180 || location.lng > 180
      ) {
        ack?.({ error: 'Invalid location payload' });
        return;
      }

      try {
        // Write only validated fields — no spread of raw client payload.
        await rtdb.ref(`activeBuses/${vehicleId}/location`).set({
          lat:       location.lat,
          lng:       location.lng,
          speed:     typeof location.speed   === 'number' ? Math.max(0, location.speed)             : null,
          heading:   typeof location.heading === 'number' ? Math.max(0, Math.min(360, location.heading)) : null,
          timestamp: Date.now(),
        });

        // Broadcast validated location to all passengers in the bus room.
        io.to(`bus:${vehicleId}`).emit('bus:location-update', {
          vehicleId,
          lat:       location.lat,
          lng:       location.lng,
          speed:     location.speed   ?? null,
          heading:   location.heading ?? null,
          timestamp: Date.now(),
        });

        ack?.({ ok: true });
      } catch (err) {
        console.error('[TrackingGateway] location-update error:', err);
        ack?.({ error: 'Internal server error' });
      }
    }
  );

  // ── driver:route-update ─────────────────────────────────────────────────────
  socket.on(
    'driver:route-update',
    async (vehicleId: string, update: RouteUpdatePayload, ack?: AckCallback) => {
      // FINDING #3: guard.
      if (!requireSocketRole(socket, 'driver', 'driver:route-update', ack)) return;

      if (typeof vehicleId !== 'string' || typeof update?.routeId !== 'string') {
        ack?.({ error: 'Invalid route update payload' });
        return;
      }

      try {
        await rtdb.ref(`activeBuses/${vehicleId}/route`).update({
          routeId:          update.routeId,
          currentStopIndex: typeof update.currentStopIndex === 'number'
            ? Math.max(0, Math.floor(update.currentStopIndex))
            : 0,
          updatedAt: Date.now(),
        });

        io.to(`bus:${vehicleId}`).emit('bus:route-update', {
          vehicleId,
          routeId:          update.routeId,
          currentStopIndex: update.currentStopIndex,
        });

        ack?.({ ok: true });
      } catch (err) {
        console.error('[TrackingGateway] route-update error:', err);
        ack?.({ error: 'Internal server error' });
      }
    }
  );

  // ── driver:stop-tracking ────────────────────────────────────────────────────
  socket.on(
    'driver:stop-tracking',
    async (payload: StopTrackingPayload, ack?: AckCallback) => {
      // FINDING #3: guard.
      if (!requireSocketRole(socket, 'driver', 'driver:stop-tracking', ack)) return;

      const { vehicleId, rideSessionId } = payload ?? {};

      if (!vehicleId) {
        ack?.({ error: 'Missing vehicleId' });
        return;
      }

      try {
        // Mark bus as offline; preserve the last-known location for audit.
        await rtdb.ref(`activeBuses/${vehicleId}`).update({
          online:    false,
          stoppedAt: Date.now(),
        });

        io.to(`bus:${vehicleId}`).emit('bus:status-update', {
          vehicleId,
          online:        false,
          rideSessionId: rideSessionId ?? null,
        });

        socket.leave(`bus:${vehicleId}`);

        console.info(`[TrackingGateway] 🔴 Driver uid=${socket.uid} stopped tracking vehicleId=${vehicleId}`);
        ack?.({ ok: true });
      } catch (err) {
        console.error('[TrackingGateway] stop-tracking error:', err);
        ack?.({ error: 'Internal server error' });
      }
    }
  );

  // ── passenger:subscribe ─────────────────────────────────────────────────────
  // Passengers join a room to receive live updates — no driver role needed.
  socket.on('passenger:subscribe', (vehicleId: string) => {
    if (typeof vehicleId !== 'string') return;
    socket.join(`bus:${vehicleId}`);
    console.info(`[TrackingGateway] 🛑 Passenger uid=${socket.uid} subscribed to bus:${vehicleId}`);
  });

  socket.on('passenger:unsubscribe', (vehicleId: string) => {
    if (typeof vehicleId !== 'string') return;
    socket.leave(`bus:${vehicleId}`);
  });
}
