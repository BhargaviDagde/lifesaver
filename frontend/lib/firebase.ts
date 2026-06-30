/**
 * Firebase client initialization.
 * All config values are NEXT_PUBLIC_ — safe for client bundles (Firebase design).
 * Never put server secrets (service account keys, etc.) in this file.
 */

import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, Auth } from "firebase/auth";
import {
  getFirestore,
  Firestore,
} from "firebase/firestore";
import { getMessaging, Messaging, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "AIzaSyDwa6MA2U3NMJ7U7row9lQhiNf1p0bM450",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "lifesaver-501004.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "lifesaver-501004",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "lifesaver-501004.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "989807541983",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "1:989807541983:web:27b4554391851ce2f8336a",
  measurementId: "G-YE7TMGLLY5",
};

// Initialize once — handle Next.js hot-reload re-initialization
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Request Calendar and Gmail scopes in addition to default profile/email.
// Note: this does NOT give us a server-usable refresh token — that requires
// the separate offline OAuth flow (backend /auth/google/authorize).
googleProvider.addScope("profile");
googleProvider.addScope("email");

// FCM — only available in browser, not SSR
export async function getMessagingInstance(): Promise<Messaging | null> {
  if (typeof window === "undefined") return null;
  const supported = await isSupported();
  if (!supported) return null;
  return getMessaging(app);
}

export { app };
