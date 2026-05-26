/**
 * lib/middleware/auth.ts
 *
 * Production-grade Express middleware for Firebase authentication & authorisation.
 *
 * FINDINGS REMEDIATED:
 *   #5 — All REST endpoints now require a valid Firebase ID token.
 *   #6 — Admin-only endpoints require the 'admin' Custom Claim.
 *   #8 — Token verification uses firebase-admin (server-side) not the client SDK.
 *   #9 — Errors return RFC-7807 Problem Details JSON, never stack traces.
 */

import type { Request, Response, NextFunction } from 'express';
import { getAdminApp } from '@/backend/lib/firebaseAdmin';
import admin from 'firebase-admin';

// ─── Augment Express Request to carry verified token data ────────────────────

declare global {
  namespace Express {
    interface Request {
      /** The verified Firebase DecodedIdToken, present after requireAuth. */
      firebaseUser?: admin.auth.DecodedIdToken;
    }
  }
}

// ─── Helper: extract Bearer token from Authorization header ─────────────────

function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.slice(7).trim();
  return token.length > 0 ? token : null;
}

// ─── requireAuth ─────────────────────────────────────────────────────────────

/**
 * Middleware — verifies the Firebase ID token in the Authorization header.
 *
 * On success:  sets `req.firebaseUser` and calls `next()`.
 * On failure:  responds 401 and does NOT call `next()`.
 *
 * Usage:
 *   router.get('/api/buses', requireAuth, getActiveBuses);
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = extractBearerToken(req);

  if (!token) {
    res.status(401).json({
      type: 'https://bustrack.app/errors/unauthenticated',
      title: 'Unauthenticated',
      status: 401,
      detail: 'A valid Bearer token is required. Include it in the Authorization header.',
    });
    return;
  }

  try {
    // `checkRevoked: true` ensures revoked tokens (signed-out users) are rejected.
    const decodedToken = await getAdminApp().auth().verifyIdToken(token, true);
    req.firebaseUser = decodedToken;
    next();
  } catch (error: unknown) {
    const code = (error as admin.FirebaseError)?.code ?? 'unknown';

    // Distinguish revoked vs. simply invalid tokens for better diagnostics.
    const detail =
      code === 'auth/id-token-revoked'
        ? 'Your session has been revoked. Please sign in again.'
        : 'The supplied token is invalid or has expired.';

    res.status(401).json({
      type: 'https://bustrack.app/errors/unauthenticated',
      title: 'Unauthenticated',
      status: 401,
      detail,
    });
  }
}

// ─── requireAdmin ─────────────────────────────────────────────────────────────

/**
 * Middleware — requires that the authenticated user has the `admin` Custom Claim.
 *
 * MUST be placed AFTER `requireAuth` in the middleware chain.
 *
 * On success:  calls `next()`.
 * On failure:  responds 403 and does NOT call `next()`.
 *
 * Usage:
 *   router.get('/api/analytics/fleet', requireAuth, requireAdmin, getFleetAnalytics);
 */
export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Guard: requireAuth must have run first.
  if (!req.firebaseUser) {
    res.status(401).json({
      type: 'https://bustrack.app/errors/unauthenticated',
      title: 'Unauthenticated',
      status: 401,
      detail: 'requireAuth middleware must precede requireAdmin.',
    });
    return;
  }

  // Custom Claim check — role is set by the setAdminClaim Cloud Function.
  const role = req.firebaseUser.role as string | undefined;

  if (role !== 'admin') {
    res.status(403).json({
      type: 'https://bustrack.app/errors/forbidden',
      title: 'Forbidden',
      status: 403,
      detail: 'This endpoint is restricted to administrators.',
    });
    return;
  }

  next();
}

// ─── requireDriver ────────────────────────────────────────────────────────────

/**
 * Middleware — requires that the authenticated user has the `driver` Custom Claim.
 *
 * MUST be placed AFTER `requireAuth`.
 */
export function requireDriver(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!req.firebaseUser) {
    res.status(401).json({
      type: 'https://bustrack.app/errors/unauthenticated',
      title: 'Unauthenticated',
      status: 401,
      detail: 'requireAuth middleware must precede requireDriver.',
    });
    return;
  }

  const role = req.firebaseUser.role as string | undefined;

  if (role !== 'driver' && role !== 'admin') {
    res.status(403).json({
      type: 'https://bustrack.app/errors/forbidden',
      title: 'Forbidden',
      status: 403,
      detail: 'This endpoint is restricted to drivers.',
    });
    return;
  }

  next();
}
