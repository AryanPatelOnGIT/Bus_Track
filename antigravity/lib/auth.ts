import { auth, googleProvider } from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';

export const signInWithGoogle = async () => {
  if (!auth) {
    throw new Error('Firebase Auth is not configured. Please set your .env.local variables.');
  }
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const token = await result.user.getIdToken();
    // Set a basic cookie for middleware
    document.cookie = `auth-token=${token}; path=/; max-age=3600`;
    return result.user;
  } catch (error) {
    console.error('Error signing in with Google', error);
    throw error;
  }
};

export const signOutUser = async () => {
  if (!auth) return;
  try {
    await signOut(auth);
    document.cookie = 'auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  } catch (error) {
    console.error('Error signing out', error);
    throw error;
  }
};

export const onAuthChange = (callback: (user: User | null) => void) => {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
};
