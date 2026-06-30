/**
 * /login — Google sign-in page.
 * Phase 1: wire up Firebase signInWithPopup.
 */

"use client";

import { useState } from "react";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGoogleSignIn() {
    setLoading(true);
    setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      // New user → onboarding, returning user → dashboard
      // TODO Phase 1: check if user profile exists in Firestore
      router.push("/dashboard");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Sign-in failed. Try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#F7F9FC] px-4">
      <div className="w-full max-w-sm">
        {/* Logo / wordmark */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#2D7DD2] mb-4">
            {/* Catching hand icon — placeholder */}
            <span className="text-white text-2xl" aria-hidden>⚡</span>
          </div>
          <h1 className="text-2xl font-bold text-[#1E2A3A]">Last-Minute Life Saver</h1>
          <p className="text-[#6B7A8D] mt-1 text-sm">
            Your AI companion that acts before you have to ask.
          </p>
        </div>

        {/* Sign-in card */}
        <div className="card">
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="btn-primary w-full"
            aria-label="Sign in with Google"
          >
            {loading ? (
              <span className="animate-pulse-soft">Signing in…</span>
            ) : (
              <>
                <GoogleIcon />
                Continue with Google
              </>
            )}
          </button>

          {error && (
            <p role="alert" className="mt-3 text-sm text-red-600 text-center">
              {error}
            </p>
          )}

          <p className="mt-4 text-xs text-[#6B7A8D] text-center">
            By signing in you agree to let Life Saver read your calendar and email
            to automatically find and schedule your tasks.
          </p>
        </div>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  );
}
