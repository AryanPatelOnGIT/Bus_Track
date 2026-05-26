/**
 * functions/src/index.ts
 *
 * Firebase Cloud Functions — Custom Claims Management.
 *
 * These functions are the ONLY authoritative way to grant the 'driver' or
 * 'admin' role to a user. They write Firebase Custom Claims, which are then
 * readable in both RTDB Security Rules (auth.token.role) and Socket.io
 * middleware (decoded.role), closing Findings #1, #2, #3, #4.
 *
 * Deployment:
 *   cd functions && npm install && firebase deploy --only functions
 *
 * Security Model:
 *   - setDriverClaim:  only callable by an authenticated admin user.
 *   - setAdminClaim:   only callable by an authenticated admin user.
 *   - onUserCreated:   triggered automatically on new user signup —
 *                      assigns the default 'passenger' role.
 */

import * as functions from 'firebase-functions/v2';
import * as admin from 'firebase-admin';

// Initialise Admin SDK once (Cloud Functions environment provides credentials).
admin.initializeApp();

const firestore = admin.firestore();
const auth      = admin.auth();

// ─── Helper: verify caller is an admin ───────────────────────────────────────

async function assertCallerIsAdmin(callerUid: string): Promise<void> {
  const callerToken = await auth.getUser(callerUid);
  const role = (callerToken.customClaims as Record<string, unknown> | undefined)?.['role'];
  if (role !== 'admin') {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only administrators can assign roles.'
    );
  }
}

// ─── setDriverClaim ───────────────────────────────────────────────────────────

/**
 * Assigns the 'driver' Custom Claim to a target user.
 *
 * Client call:
 *   const setDriverClaim = httpsCallable(functions, 'setDriverClaim');
 *   await setDriverClaim({ targetUid: 'uid-of-driver' });
 */
export const setDriverClaim = functions.https.onCall(async (request) => {
  // Require the caller to be authenticated.
  if (!request.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be signed in to call this function.'
    );
  }

  // Only admins may promote users to driver.
  await assertCallerIsAdmin(request.auth.uid);

  const { targetUid } = request.data as { targetUid?: unknown };

  if (typeof targetUid !== 'string' || targetUid.trim() === '') {
    throw new functions.https.HttpsError(
      'invalid-argument',
      '`targetUid` must be a non-empty string.'
    );
  }

  // Set the Custom Claim — this propagates to all new tokens within ~1 hour.
  await auth.setCustomUserClaims(targetUid.trim(), { role: 'driver' });

  // Mirror the role into Firestore so UI queries work (role field in /users).
  await firestore.doc(`users/${targetUid.trim()}`).set(
    { role: 'driver' },
    { merge: true }
  );

  functions.logger.info(`[setDriverClaim] uid=${targetUid} promoted to driver by uid=${request.auth.uid}`);
  return { success: true, role: 'driver', uid: targetUid };
});

// ─── setAdminClaim ────────────────────────────────────────────────────────────

/**
 * Assigns the 'admin' Custom Claim to a target user.
 * Only callable by an existing admin.
 */
export const setAdminClaim = functions.https.onCall(async (request) => {
  if (!request.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'You must be signed in to call this function.'
    );
  }

  await assertCallerIsAdmin(request.auth.uid);

  const { targetUid } = request.data as { targetUid?: unknown };

  if (typeof targetUid !== 'string' || targetUid.trim() === '') {
    throw new functions.https.HttpsError(
      'invalid-argument',
      '`targetUid` must be a non-empty string.'
    );
  }

  await auth.setCustomUserClaims(targetUid.trim(), { role: 'admin' });

  await firestore.doc(`users/${targetUid.trim()}`).set(
    { role: 'admin' },
    { merge: true }
  );

  functions.logger.info(`[setAdminClaim] uid=${targetUid} promoted to admin by uid=${request.auth.uid}`);
  return { success: true, role: 'admin', uid: targetUid };
});

// ─── revokeDriverClaim ────────────────────────────────────────────────────────

/**
 * Revokes driver role, demoting the user back to 'passenger'.
 */
export const revokeDriverClaim = functions.https.onCall(async (request) => {
  if (!request.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Sign in required.');
  }

  await assertCallerIsAdmin(request.auth.uid);

  const { targetUid } = request.data as { targetUid?: unknown };

  if (typeof targetUid !== 'string' || targetUid.trim() === '') {
    throw new functions.https.HttpsError('invalid-argument', '`targetUid` required.');
  }

  await auth.setCustomUserClaims(targetUid.trim(), { role: 'passenger' });
  await firestore.doc(`users/${targetUid.trim()}`).set(
    { role: 'passenger' },
    { merge: true }
  );

  functions.logger.info(`[revokeDriverClaim] uid=${targetUid} demoted by uid=${request.auth.uid}`);
  return { success: true, role: 'passenger', uid: targetUid };
});

// ─── onUserCreated ────────────────────────────────────────────────────────────

/**
 * Auth trigger — every new sign-up automatically receives the 'passenger'
 * Custom Claim and a Firestore user document. No user starts with elevated
 * privileges by default (principle of least privilege).
 */
export const onUserCreated = functions.auth.beforeUserCreated(async (event) => {
  const user = event.data;
  if (!user) return;

  // Set default 'passenger' claim immediately on account creation.
  await auth.setCustomUserClaims(user.uid, { role: 'passenger' });

  // Create the Firestore user profile.
  await firestore.doc(`users/${user.uid}`).set({
    uid:              user.uid,
    name:             user.displayName ?? '',
    email:            user.email       ?? '',
    photoURL:         user.photoURL    ?? '',
    role:             'passenger',
    vehicleId:        null,
    assignedRouteIds: [],
    createdAt:        admin.firestore.FieldValue.serverTimestamp(),
  });

  functions.logger.info(`[onUserCreated] New user uid=${user.uid} assigned role=passenger`);
});
