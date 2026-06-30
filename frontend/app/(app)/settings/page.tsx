"use client";

import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { getOAuthConnectUrl } from "@/lib/api";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8080";

export default function SettingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [calendarConnected, setCalendarConnected] = useState(false);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [workStart, setWorkStart] = useState("09:00");
  const [workEnd, setWorkEnd] = useState("18:00");
  const [savingHours, setSavingHours] = useState(false);
  const [savedHours, setSavedHours] = useState(false);

  // Listen to user profile for connection status
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setCalendarConnected(data.googleCalendarConnected ?? false);
        setGmailConnected(data.gmailConnected ?? false);
        if (data.workHoursStart) setWorkStart(`${String(data.workHoursStart).padStart(2, "0")}:00`);
        if (data.workHoursEnd) setWorkEnd(`${String(data.workHoursEnd).padStart(2, "0")}:00`);
      }
    });
    return unsub;
  }, [user]);

  async function handleSignOut() {
    setSigningOut(true);
    await signOut(auth);
    router.push("/login");
  }

  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  async function handleConnectGoogle() {
    if (!user) return;
    setConnecting(true);
    setConnectError(null);
    try {
      // Get a fresh ID token and pass it as a query param
      // Backend reads it from ?token= since this is a browser redirect (no headers possible)
      const idToken = await user.getIdToken();
      window.location.href = `${BACKEND_URL}/auth/google/authorize?token=${encodeURIComponent(idToken)}`;
    } catch {
      setConnectError("Failed to start connection. Try again.");
      setConnecting(false);
    }
  }

  async function handleSaveHours() {
    if (!user) return;
    setSavingHours(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        workHoursStart: parseInt(workStart.split(":")[0]),
        workHoursEnd: parseInt(workEnd.split(":")[0]),
      });
      setSavedHours(true);
      setTimeout(() => setSavedHours(false), 2000);
    } finally {
      setSavingHours(false);
    }
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <h1 className="text-2xl font-bold text-[#1E2A3A]">Settings</h1>
      </div>

      {/* Account */}
      <section className="card" aria-labelledby="profile-heading">
        <h2 id="profile-heading" className="text-sm font-semibold text-[#1E2A3A] mb-4">
          Account
        </h2>
        {user && (
          <div className="flex items-center gap-3 mb-4">
            {user.photoURL && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.photoURL} alt="" className="w-10 h-10 rounded-full" aria-hidden />
            )}
            <div>
              <p className="text-sm font-medium text-[#1E2A3A]">{user.displayName ?? "—"}</p>
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

      {/* Calendar & Gmail */}
      <section className="card" aria-labelledby="connect-heading">
        <h2 id="connect-heading" className="text-sm font-semibold text-[#1E2A3A] mb-1">
          Google Calendar &amp; Gmail
        </h2>
        <p className="text-xs text-[#6B7A8D] mb-4">
          Life Saver uses Calendar to schedule task blocks and Gmail (read-only) to
          detect deadlines in your inbox. You approve each email-based suggestion before
          anything is scheduled.
        </p>

        <div className="space-y-2 mb-4">
          <StatusRow label="Google Calendar" connected={calendarConnected} />
          <StatusRow label="Gmail (read-only)" connected={gmailConnected} />
        </div>

        {connectError && <p className="text-xs text-red-600 mb-2">{connectError}</p>}

        <button className="btn-primary" onClick={handleConnectGoogle} disabled={connecting}>
          {connecting ? (
            <span className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden />
              Connecting…
            </span>
          ) : calendarConnected && gmailConnected ? "Reconnect" : "Connect Google Calendar & Gmail"}
        </button>
      </section>

      {/* Work hours */}
      <section className="card" aria-labelledby="hours-heading">
        <h2 id="hours-heading" className="text-sm font-semibold text-[#1E2A3A] mb-1">
          Work hours
        </h2>
        <p className="text-xs text-[#6B7A8D] mb-4">
          Life Saver only schedules tasks during these hours.
        </p>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="work-start" className="block text-xs text-[#6B7A8D] mb-1">Start</label>
            <input
              id="work-start"
              type="time"
              value={workStart}
              onChange={(e) => setWorkStart(e.target.value)}
              className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-[#2D7DD2] focus-visible:outline-none"
            />
          </div>
          <div>
            <label htmlFor="work-end" className="block text-xs text-[#6B7A8D] mb-1">End</label>
            <input
              id="work-end"
              type="time"
              value={workEnd}
              onChange={(e) => setWorkEnd(e.target.value)}
              className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-[#2D7DD2] focus-visible:outline-none"
            />
          </div>
        </div>
        <button className="btn-primary" onClick={handleSaveHours} disabled={savingHours}>
          {savedHours ? "Saved ✓" : savingHours ? "Saving…" : "Save hours"}
        </button>
      </section>

      {/* Notifications */}
      <section className="card" aria-labelledby="notifications-heading">
        <h2 id="notifications-heading" className="text-sm font-semibold text-[#1E2A3A] mb-1">
          Push notifications
        </h2>
        <p className="text-xs text-[#6B7A8D] mb-4">
          Life Saver sends calm, specific alerts when a task is at risk or rescheduled —
          not generic pings. Allow notifications once and they register automatically.
        </p>
        <NotificationsButton />
      </section>
    </div>
  );
}

function StatusRow({ label, connected }: { label: string; connected: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-[#6B7A8D]">{label}</span>
      <span className={`flex items-center gap-1.5 text-xs font-medium ${connected ? "text-[#38B2AC]" : "text-[#6B7A8D]"}`}>
        <span className={`w-2 h-2 rounded-full ${connected ? "bg-[#38B2AC]" : "bg-[#CBD5E1]"}`} aria-hidden />
        {connected ? "Connected" : "Not connected"}
      </span>
    </div>
  );
}

function NotificationsButton() {
  const [status, setStatus] = useState<"idle" | "requesting" | "granted" | "denied">("idle");

  async function handleEnable() {
    if (!("Notification" in window)) {
      setStatus("denied");
      return;
    }
    setStatus("requesting");
    try {
      const perm = await Notification.requestPermission();
      setStatus(perm === "granted" ? "granted" : "denied");
    } catch {
      setStatus("denied");
    }
  }

  if (status === "granted") {
    return (
      <div className="flex items-center gap-2 text-sm text-[#38B2AC]">
        <span>✓</span>
        <span>Notifications enabled — you&apos;re all set.</span>
      </div>
    );
  }
  if (status === "denied") {
    return (
      <p className="text-sm text-[#6B7A8D]">
        Notifications blocked. Enable them in your browser settings, then reload.
      </p>
    );
  }
  return (
    <button className="btn-secondary" onClick={handleEnable} disabled={status === "requesting"}>
      {status === "requesting" ? "Requesting permission…" : "Enable notifications"}
    </button>
  );
}
