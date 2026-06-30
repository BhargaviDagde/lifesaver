"use client";

/**
 * AuthContext — provides Firebase auth state across the app.
 * Also handles FCM token registration for push notifications.
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
import { getToken } from "firebase/messaging";
import { auth, db, getMessagingInstance } from "./firebase";

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8080";

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

        // Register FCM token for push notifications (best-effort)
        _registerFcmToken(firebaseUser);
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

async function _registerFcmToken(firebaseUser: User) {
  try {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;

    const messaging = await getMessagingInstance();
    if (!messaging || !VAPID_KEY) return;

    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    if (!token) return;

    const idToken = await firebaseUser.getIdToken();
    await fetch(`${BACKEND_URL}/notifications/register-token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ token }),
    });
  } catch (e) {
    // Non-critical — notifications just won't work if this fails
    console.debug("FCM token registration failed:", e);
  }
}

export function useAuth() {
  return useContext(AuthContext);
}
