/**
 * lib/controllers/buses.ts
 *
 * REST controller for active bus queries.
 *
 * FINDINGS REMEDIATED:
 *   #5 — Route is protected by requireAuth (see lib/routes.ts).
 *   #8 — Token is verified server-side via Firebase Admin before data is returned.
 */

import type { Request, Response } from 'express';
import { getAdminDatabase } from '@/backend/lib/firebaseAdmin';

/**
 * GET /api/buses
 *
 * Returns the list of currently online buses from the Realtime Database.
 * Only authenticated users may call this endpoint (enforced by middleware).
 */
export async function getActiveBuses(req: Request, res: Response): Promise<void> {
  try {
    const snapshot = await getAdminDatabase()
      .ref('activeBuses')
      .orderByChild('online')
      .equalTo(true)
      .once('value');

    const raw = snapshot.val() as Record<string, unknown> | null;

    // Filter to only expose safe, non-sensitive fields to clients.
    const buses = raw
      ? Object.entries(raw).map(([vehicleId, data]) => {
          const d = data as Record<string, unknown>;
          return {
            vehicleId,
            online:        d['online']        ?? false,
            rideSessionId: d['rideSessionId'] ?? null,
            startedAt:     d['startedAt']     ?? null,
            location:      d['location']      ?? null,
            route:         d['route']         ?? null,
            // Never expose driverUid to passenger clients.
          };
        })
      : [];

    res.json({ buses });
  } catch (err) {
    console.error('[buses] getActiveBuses error:', err);
    res.status(500).json({
      type: 'https://bustrack.app/errors/internal',
      title: 'Internal Server Error',
      status: 500,
      detail: 'Failed to retrieve active buses.',
    });
  }
}
