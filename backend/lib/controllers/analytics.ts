/**
 * lib/controllers/analytics.ts
 *
 * REST controller for admin fleet analytics.
 *
 * FINDINGS REMEDIATED:
 *   #6 — GET /api/analytics/fleet requires requireAdmin (see lib/routes.ts).
 *   #8 — Uses Firebase Admin SDK exclusively for data access.
 */

import type { Request, Response } from 'express';
import { getAdminDatabase, getAdminFirestore } from '@/backend/lib/firebaseAdmin';

// ─── GET /api/analytics/fleet ─────────────────────────────────────────────────

/**
 * Returns aggregated fleet analytics for the admin dashboard.
 * Requires authenticated admin role — enforced by requireAuth + requireAdmin.
 */
export async function getFleetAnalytics(_req: Request, res: Response): Promise<void> {
  try {
    // Fetch active buses from RTDB.
    const rtdbSnapshot = await getAdminDatabase().ref('activeBuses').once('value');
    const activeBusesRaw = rtdbSnapshot.val() as Record<string, Record<string, unknown>> | null;

    const allBuses    = activeBusesRaw ? Object.values(activeBusesRaw) : [];
    const onlineCount = allBuses.filter((b) => b['online'] === true).length;
    const totalCount  = allBuses.length;

    // Fetch vehicle documents from Firestore for fleet size.
    const vehiclesSnap = await getAdminFirestore().collection('vehicles').count().get();
    const fleetSize    = vehiclesSnap.data().count;

    // Fetch pending ride requests count.
    const requestsSnap = await getAdminFirestore()
      .collection('rideRequests')
      .where('status', '==', 'pending')
      .count()
      .get();
    const pendingRequests = requestsSnap.data().count;

    // Fetch total driver count.
    const driversSnap = await getAdminFirestore()
      .collection('users')
      .where('role', '==', 'driver')
      .count()
      .get();
    const totalDrivers = driversSnap.data().count;

    res.json({
      analytics: {
        fleet: {
          total:        fleetSize,
          activeNow:    onlineCount,
          rtdbTracked:  totalCount,
          utilisation:  fleetSize > 0 ? Math.round((onlineCount / fleetSize) * 100) : 0,
        },
        requests: {
          pending: pendingRequests,
        },
        drivers: {
          total: totalDrivers,
        },
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('[analytics] getFleetAnalytics error:', err);
    res.status(500).json({
      type:   'https://bustrack.app/errors/internal',
      title:  'Internal Server Error',
      status: 500,
      detail: 'Failed to retrieve fleet analytics.',
    });
  }
}
