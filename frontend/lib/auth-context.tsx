"use client";

/**
 * AuthContext — provides Firebase auth state across the app.
 * Wrap the entire app in <AuthProvider> and consume with useAuth().
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  isNewUser: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  isNewUser: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Check if user profile exists in Firestore
        const userRef = doc(db, "users", firebaseUser.uid);
        const userSnap = await getDoc(userRef);

        if (!userSnap.exists()) {
          // First sign-in — create profile
          await setDoc(userRef, {
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            workHoursStart: 9,
            workHoursEnd: 18,
            quietHoursStart: 22,
            quietHoursEnd: 8,
            fcmTokens: [],
            googleCalendarConnected: false,
            gmailConnected: false,
            createdAt: serverTimestamp(),
          });
          setIsNewUser(true);
        } else {
          setIsNewUser(false);
        }
      }
      setUser(firebaseUser);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, isNewUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
