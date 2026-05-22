import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getDatabase, Database } from 'firebase/database';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
};

let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let rtdb: Database;
let googleProvider: GoogleAuthProvider;

const isValidConfig = firebaseConfig.apiKey && firebaseConfig.apiKey !== 'your_api_key_here';

try {
  if (isValidConfig) {
    if (!getApps().length) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApps()[0];
    }
    auth = getAuth(app);
    db = getFirestore(app);
    rtdb = getDatabase(app);
    googleProvider = new GoogleAuthProvider();
  } else {
    console.warn('Firebase configuration is missing or invalid. Please set your .env.local variables.');
  }
} catch (error) {
  console.error('Failed to initialize Firebase:', error);
}

export { app, auth, db, rtdb, googleProvider };
