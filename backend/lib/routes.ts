/**
 * lib/routes.ts
 *
 * Central Express router — all routes protected with the correct middleware.
 *
 * FINDINGS REMEDIATED:
 *   #5 — requireAuth guards every authenticated route.
 *   #6 — requireAdmin guards admin-only routes.
 *   #8 — Token verification is handled server-side by the middleware.
 *   #9 — Admin analytics and request listing require elevated privileges.
 *
 * Route summary:
 *   GET  /api/buses               → requireAuth           → getActiveBuses
 *   POST /api/requests            → requireAuth           → createRequest
 *   GET  /api/requests            → requireAuth+Admin     → getAllRequests
 *   GET  /api/analytics/fleet     → requireAuth+Admin     → getFleetAnalytics
 */

import { Router } from 'express';
import { requireAuth, requireAdmin } from '@/backend/lib/middleware/auth';
import { createRequest, getAllRequests } from '@/backend/lib/controllers/requests';
import { getActiveBuses } from '@/backend/lib/controllers/buses';
import { getFleetAnalytics } from '@/backend/lib/controllers/analytics';

const router = Router();

// ─── Passenger / General Authenticated Actions ────────────────────────────────

/** List all currently online buses — any authenticated user may call this. */
router.get('/api/buses', requireAuth, getActiveBuses);

/** Submit a ride request — passenger must be authenticated. */
router.post('/api/requests', requireAuth, createRequest);

// ─── Admin-Only Actions ────────────────────────────────────────────────────────

/** List all pending ride requests — restricted to administrators. */
router.get('/api/requests', requireAuth, requireAdmin, getAllRequests);

/** Fleet analytics dashboard data — restricted to administrators. */
router.get('/api/analytics/fleet', requireAuth, requireAdmin, getFleetAnalytics);

export default router;
