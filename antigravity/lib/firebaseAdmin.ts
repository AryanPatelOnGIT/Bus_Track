/**
 * lib/firebaseAdmin.ts
 *
 * Firebase Admin SDK singleton — supports two credential strategies:
 *
 * Strategy A — Service Account JSON file (local dev):
 *   Set GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json in .env.local
 *   Download the JSON from: Firebase Console → Project Settings →
 *   Service Accounts → Generate New Private Key
 *
 * Strategy B — Individual env vars (production / CI / Vercel):
 *   Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 *
 * The singleton pattern prevents "app already exists" errors during
 * Next.js hot-module reload and ts-node restarts.
 */

import admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';

let adminApp: admin.app.App | null = null;

/**
 * Returns the singleton Firebase Admin App.
 * Initialises it on first call; reuses on subsequent calls.
 */
export function getAdminApp(): admin.app.App {
  // Return cached app.
  if (adminApp) return adminApp;

  // Reuse an app already initialised (e.g. after Next.js HMR).
  if (admin.apps.length > 0) {
    adminApp = admin.apps[0]!;
    return adminApp;
  }

  const databaseURL =
    process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ??
    'https://bustrack-be165-default-rtdb.firebaseio.com';

  // ── Strategy A: GOOGLE_APPLICATION_CREDENTIALS JSON file ────────────────
  const credFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (credFile) {
    const absPath = path.resolve(process.cwd(), credFile);
    if (fs.existsSync(absPath)) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const serviceAccount = require(absPath);
      adminApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL,
      });
      console.info('[firebaseAdmin] ✅ Initialised via service account JSON file');
      return adminApp;
    }
    console.warn(`[firebaseAdmin] ⚠️  GOOGLE_APPLICATION_CREDENTIALS set but file not found: ${absPath}`);
  }

  // ── Strategy B: individual env vars (production) ──────────────────────────
  const projectId   = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // Replace escaped newlines that some platforms store as literal \n.
  const privateKey  = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (projectId && clientEmail && privateKey) {
    adminApp = admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
      databaseURL,
    });
    console.info('[firebaseAdmin] ✅ Initialised via env var credentials');
    return adminApp;
  }

  // ── Strategy C: Application Default Credentials (Cloud Run / GCE) ─────────
  // If neither strategy is configured, fall back to ADC — works automatically
  // when deployed on Google Cloud infrastructure.
  try {
    adminApp = admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      databaseURL,
    });
    console.info('[firebaseAdmin] ✅ Initialised via Application Default Credentials');
    return adminApp;
  } catch {
    throw new Error(
      '[firebaseAdmin] ❌ Could not initialise Firebase Admin SDK.\n' +
      'Set one of:\n' +
      '  • GOOGLE_APPLICATION_CREDENTIALS=./serviceAccountKey.json  (local dev)\n' +
      '  • FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY  (production)\n' +
      'Download the service account key from:\n' +
      '  Firebase Console → Project Settings → Service Accounts → Generate New Private Key'
    );
  }
}

/** Convenience accessor for the Admin Auth service. */
export function getAdminAuth(): admin.auth.Auth {
  return getAdminApp().auth();
}

/** Convenience accessor for the Admin Firestore service. */
export function getAdminFirestore(): admin.firestore.Firestore {
  return getAdminApp().firestore();
}

/** Convenience accessor for the Admin Realtime Database service. */
export function getAdminDatabase(): admin.database.Database {
  return getAdminApp().database();
}
