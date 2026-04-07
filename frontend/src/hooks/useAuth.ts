"use client";

import { useEffect, useState } from "react";
import { auth, googleProvider, db } from "@/lib/firebase";
import { signInWithPopup, onAuthStateChanged, User, signOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

export type UserRole = "passenger" | "driver" | "admin" | null;

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: UserRole;
}

export function useAuth() {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userDocRef = doc(db, "users", firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          let role: UserRole = "passenger";

          if (userDoc.exists()) {
            role = userDoc.data().role as UserRole;
          } else {
            // First time login - Check if this is the root admin email
            const isAdmin = process.env.NEXT_PUBLIC_ADMIN_EMAIL && firebaseUser.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL;
            role = isAdmin ? "admin" : "passenger";
            
            // Create user document
            await setDoc(userDocRef, {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
              role,
              createdAt: Date.now()
            });
          }

          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            role,
          });
        } catch (err) {
          console.error("Error fetching user role:", err);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return { user, loading, loginWithGoogle, logout };
}
