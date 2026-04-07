"use client";

import { useEffect, useState } from "react";
import { auth, googleProvider, storage, rtdb, db } from "@/lib/firebase";
import { signInWithPopup, onAuthStateChanged, User, signOut } from "firebase/auth";
import { ref, set } from "firebase/database";
import { doc, getDoc, setDoc, DocumentSnapshot } from "firebase/firestore";
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
          // 1. SOURCE OF TRUTH: FIRESTORE
          const userDocRef = doc(db, "users", firebaseUser.uid);

          // Wrap getDoc in a timeout so the loading screen can never hang forever
          const getDocWithTimeout = (ms: number): Promise<DocumentSnapshot> =>
            new Promise((resolve, reject) => {
              const timer = setTimeout(() => reject(new Error("Firestore timeout")), ms);
              getDoc(userDocRef)
                .then((snap) => { clearTimeout(timer); resolve(snap); })
                .catch((err) => { clearTimeout(timer); reject(err); });
            });

          let role: UserRole = "passenger";

          try {
            const userSnapshot = await getDocWithTimeout(5000);

            if (userSnapshot && userSnapshot.exists()) {
              role = (userSnapshot.data()?.role as UserRole) ?? "passenger";
            } else {
              // First time login - Force user to be passenger
              role = "passenger";
              
              const userData = {
                uid: firebaseUser.uid,
                email: firebaseUser.email || "",
                displayName: firebaseUser.displayName || "Unknown User",
                photoURL: firebaseUser.photoURL || "",
                role,
                createdAt: Date.now()
              };

              try {
                // Write to Firestore (Source of truth for Roles & Admin Panel)
                await setDoc(userDocRef, userData);
                
                // Write to RTDB (mirror)
                const userDbRef = ref(rtdb, `users/${firebaseUser.uid}`);
                await set(userDbRef, userData);
                
                console.log("Successfully recorded user in Firestore and RTDB!");
              } catch (dbErr) {
                console.error("CRITICAL ERROR: Failed to write user. Check rules...", dbErr);
              }
            }
          } catch (firestoreErr) {
            // Firestore timed out or threw — still let the user in with their cached auth
            console.warn("Firestore role fetch failed or timed out, defaulting to passenger:", firestoreErr);
            role = "passenger";
          }

          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            role,
          });

          // 💾 BACKUP TO FIREBASE STORAGE
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
          } catch (storageErr) {
            console.error("Failed to backup to storage:", storageErr);
          }

        } catch (err) {
          console.error("Error in auth state handler:", err);
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
