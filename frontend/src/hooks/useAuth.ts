"use client";

import { useEffect, useState } from "react";
import { auth, googleProvider, storage, rtdb } from "@/lib/firebase";
import { signInWithPopup, onAuthStateChanged, User, signOut } from "firebase/auth";
import { ref, get, set } from "firebase/database";
import { ref as storageRef, uploadString } from "firebase/storage";

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
          const userDbRef = ref(rtdb, `users/${firebaseUser.uid}`);
          const userSnapshot = await get(userDbRef);
          
          let role: UserRole = "passenger";

          if (userSnapshot.exists()) {
            role = userSnapshot.val().role as UserRole;
          } else {
            // First time login - Force user to be passenger. Admin status must be manually granted in Firebase DB.
            role = "passenger";
            
            // Create user RTDB document with safe string fallbacks
            try {
              await set(userDbRef, {
                uid: firebaseUser.uid,
                email: firebaseUser.email || "",
                displayName: firebaseUser.displayName || "Unknown User",
                photoURL: firebaseUser.photoURL || "",
                role,
                createdAt: Date.now()
              });
              console.log("Successfully recorded user in Firebase Realtime Database!");
            } catch (dbErr) {
              console.error("CRITICAL ERROR: Failed to write user to Realtime Database. Check database.rules.json or your network.", dbErr);
            }
          }

          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            role,
          });

          // 💾 BACKUP TO FIREBASE STORAGE
          // Store a copy of the user "credentials" as a JSON file in Storage
          try {
            const credentialFileRef = storageRef(storage, `users/${firebaseUser.uid}/credential.json`);
            const credentialData = JSON.stringify({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              role,
              lastLogin: Date.now()
            }, null, 2);
            await uploadString(credentialFileRef, credentialData, 'raw', {
              contentType: 'application/json'
            });
            console.log("Credentials stored in Firebase Storage.");
          } catch (storageErr) {
            console.error("Failed to backup to storage:", storageErr);
          }

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
