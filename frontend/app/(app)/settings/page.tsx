/**
 * /settings — manage work hours, calendar/Gmail connection, notifications.
 * Phase 1: shell.
 * Phase 2: wire up OAuth connect/disconnect and profile updates.
 */

"use client";

import { useState } from "react";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { getOAuthConnectUrl } from "@/lib/api";

export default function SettingsPage() {
  const router = useRouter();
  const user = auth.currentUser;
  const [signingOut, setSigningOut] = useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    await signOut(auth);
    router.push("/login");
  }

  function handleConnectGoogle() {
    window.location.href = getOAuthConnectUrl();
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold text-[#1E2A3A]">Settings</h1>
      </div>

      {/* Profile */}
      <section className="card" aria-labelledby="profile-heading">
        <h2
          id="profile-heading"
          className="text-sm font-semibold text-[#1E2A3A] mb-4"
        >
          Account
        </h2>
        {user && (
          <div className="flex items-center gap-3 mb-4">
            {user.photoURL && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.photoURL}
                alt=""
                className="w-10 h-10 rounded-full"
                aria-hidden
              />
            )}
            <div>
              <p className="text-sm font-medium text-[#1E2A3A]">
                {user.displayName ?? "—"}
              </p>
              <p className="text-xs text-[#6B7A8D]">{user.email ?? "—"}</p>
            </div>
          </div>
        )}
        <button
          className="btn-secondary text-red-600 border-red-200 hover:bg-red-50"
          onClick={handleSignOut}
          disabled={signingOut}
        >
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
      </section>

      {/* Calendar & Gmail connection */}
      <section className="card" aria-labelledby="connect-heading">
        <h2
          id="connect-heading"
          className="text-sm font-semibold text-[#1E2A3A] mb-1"
        >
          Google Calendar &amp; Gmail
        </h2>
        <p className="text-xs text-[#6B7A8D] mb-4">
          Required for autonomous scheduling and email-based task detection.
          {/* TODO Phase 2: show connected/disconnected status from Firestore */}
        </p>
        <button className="btn-primary" onClick={handleConnectGoogle}>
          Connect Google Calendar &amp; Gmail
        </button>
      </section>

      {/* Work hours */}
      <section className="card" aria-labelledby="hours-heading">
        <h2
          id="hours-heading"
          className="text-sm font-semibold text-[#1E2A3A] mb-4"
        >
          Work hours
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="settings-work-start"
              className="block text-xs text-[#6B7A8D] mb-1"
            >
              Start
            </label>
            <input
              id="settings-work-start"
              type="time"
              defaultValue="09:00"
              className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-[#2D7DD2] focus-visible:outline-none"
            />
          </div>
          <div>
            <label
              htmlFor="settings-work-end"
              className="block text-xs text-[#6B7A8D] mb-1"
            >
              End
            </label>
            <input
              id="settings-work-end"
              type="time"
              defaultValue="18:00"
              className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-[#2D7DD2] focus-visible:outline-none"
            />
          </div>
        </div>
        <button className="btn-primary mt-4">
          Save hours
        </button>
      </section>

      {/* Notifications */}
      <section className="card" aria-labelledby="notifications-heading">
        <h2
          id="notifications-heading"
          className="text-sm font-semibold text-[#1E2A3A] mb-1"
        >
          Push notifications
        </h2>
        <p className="text-xs text-[#6B7A8D] mb-4">
          Life Saver sends notifications when it reschedules a task or spots
          something at risk. They&apos;re calm and specific — not generic pings.
        </p>
        <button className="btn-secondary">
          Enable notifications
        </button>
        {/* TODO Phase 3: register FCM token on enable */}
      </section>
    </div>
  );
}
