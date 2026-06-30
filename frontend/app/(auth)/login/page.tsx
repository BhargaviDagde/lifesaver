"use client";

import { useEffect, useState } from "react";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, isNewUser } = useAuth();
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) router.replace(isNewUser ? "/onboarding" : "/dashboard");
  }, [user, loading, isNewUser, router]);

  async function handleGoogleSignIn() {
    setSigningIn(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes("popup-closed")) {
        setError("Sign-in window closed. Try again.");
      } else {
        setError("Sign-in failed. Try again.");
      }
      setSigningIn(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="w-5 h-5 border-2 border-[#2563eb] border-t-transparent rounded-full animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0a0a0a] px-4 relative overflow-hidden">
      {/* Subtle background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#2563eb]/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-[#14b8a6] to-[#2563eb] mb-5">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Life Saver</h1>
          <p className="text-[#555] mt-1.5 text-sm">Your AI companion that acts before you have to ask.</p>
        </div>

        {/* Features */}
        <div className="space-y-2.5 mb-8">
          {[
            ["◷", "Schedules tasks automatically"],
            ["◉", "Reschedules when deadlines shift"],
            ["✉", "Spots deadlines in your email"],
          ].map(([icon, text]) => (
            <div key={text} className="flex items-center gap-3">
              <span className="w-6 h-6 rounded-md bg-[#141414] border border-[#2a2a2a] flex items-center justify-center text-[#2563eb] text-xs flex-shrink-0">{icon}</span>
              <span className="text-[#666] text-sm">{text}</span>
            </div>
          ))}
        </div>

        {/* Sign in */}
        <button
          onClick={handleGoogleSignIn}
          disabled={signingIn}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-white text-[#0a0a0a] font-semibold text-sm hover:bg-[#f0f0f0] transition-colors disabled:opacity-60 shadow-lg"
          aria-label="Sign in with Google"
        >
          {signingIn ? (
            <><div className="w-4 h-4 border-2 border-[#2563eb] border-t-transparent rounded-full animate-spin" />Signing in…</>
          ) : (
            <><GoogleIcon />Continue with Google</>
          )}
        </button>

        {error && <p role="alert" className="mt-3 text-xs text-[#f87171] text-center">{error}</p>}

        <p className="mt-5 text-[10px] text-[#333] text-center leading-relaxed">
          Calendar &amp; Gmail access requested in the next step.<br />Your data is never sold or shared.
        </p>
      </div>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden>
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}
