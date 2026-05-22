/**
 * lib/controllers/requests.ts
 *
 * REST controller for passenger ride requests.
 *
 * FINDINGS REMEDIATED:
 *   #5 — POST /api/requests requires requireAuth (see lib/routes.ts).
 *   #9 — GET /api/requests (admin list) requires requireAdmin.
 *   #8 — All token verification is server-side via Firebase Admin.
 */

import type { Request, Response } from 'express';
import { getAdminFirestore } from '@/lib/firebaseAdmin';
import admin from 'firebase-admin';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RideRequest {
  passengerId:  string;
  vehicleId:    string;
  stopName:     string;
  requestedAt:  admin.firestore.FieldValue;
  status:       'pending' | 'accepted' | 'rejected';
}

// ─── POST /api/requests ───────────────────────────────────────────────────────

/**
 * Create a new ride request. The authenticated passenger is the requester.
 * Their uid is taken from the verified token — never from the request body.
 */
export async function createRequest(req: Request, res: Response): Promise<void> {
  // `req.firebaseUser` is guaranteed by requireAuth middleware.
  const passengerId = req.firebaseUser!.uid;

  const { vehicleId, stopName } = req.body as {
    vehicleId?: unknown;
    stopName?:  unknown;
  };

  // Input validation — never trust client body for sensitive identifiers.
  if (typeof vehicleId !== 'string' || vehicleId.trim() === '') {
    res.status(400).json({
      type:   'https://bustrack.app/errors/bad-request',
      title:  'Bad Request',
      status: 400,
      detail: '`vehicleId` must be a non-empty string.',
    });
    return;
  }

  if (typeof stopName !== 'string' || stopName.trim() === '' || stopName.length > 200) {
    res.status(400).json({
      type:   'https://bustrack.app/errors/bad-request',
      title:  'Bad Request',
      status: 400,
      detail: '`stopName` must be a non-empty string (max 200 chars).',
    });
    return;
  }

  try {
    const payload: RideRequest = {
      passengerId,                            // from verified token — not body
      vehicleId:   vehicleId.trim(),
      stopName:    stopName.trim(),
      requestedAt: admin.firestore.FieldValue.serverTimestamp(),
      status:      'pending',
    };

    const ref = await getAdminFirestore().collection('rideRequests').add(payload);

    res.status(201).json({ requestId: ref.id });
  } catch (err) {
    console.error('[requests] createRequest error:', err);
    res.status(500).json({
      type:   'https://bustrack.app/errors/internal',
      title:  'Internal Server Error',
      status: 500,
      detail: 'Failed to create ride request.',
    });
  }
}

// ─── GET /api/requests ────────────────────────────────────────────────────────

/**
 * List all pending ride requests. Admin only (enforced by requireAdmin middleware).
 */
export async function getAllRequests(req: Request, res: Response): Promise<void> {
  try {
    const snapshot = await getAdminFirestore()
      .collection('rideRequests')
      .where('status', '==', 'pending')
      .orderBy('requestedAt', 'desc')
      .limit(100)
      .get();

    const requests = snapshot.docs.map((doc) => ({
      id:   doc.id,
      ...doc.data(),
      // Convert Firestore Timestamp to ISO string for JSON serialisation.
      requestedAt: (doc.data().requestedAt as admin.firestore.Timestamp)?.toDate().toISOString() ?? null,
    }));

    res.json({ requests });
  } catch (err) {
    console.error('[requests] getAllRequests error:', err);
    res.status(500).json({
      type:   'https://bustrack.app/errors/internal',
      title:  'Internal Server Error',
      status: 500,
      detail: 'Failed to retrieve ride requests.',
    });
  }
}
