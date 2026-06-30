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
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setCalendarConnected(data.googleCalendarConnected ?? false);
        setGmailConnected(data.gmailConnected ?? false);
        if (data.workHoursStart) setWorkStart(`${String(data.workHoursStart).padStart(2,"0")}:00`);
        if (data.workHoursEnd) setWorkEnd(`${String(data.workHoursEnd).padStart(2,"0")}:00`);
      }
    });
  }, [user]);

  async function handleSignOut() {
    setSigningOut(true);
    await signOut(auth);
    router.push("/login");
  }

  async function handleConnectGoogle() {
    if (!user) return;
    setConnecting(true);
    setConnectError(null);
    try {
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
    <div className="space-y-5 max-w-lg">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
      </div>

      {/* Account */}
      <section className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-5" aria-labelledby="profile-heading">
        <h2 id="profile-heading" className="text-xs font-semibold uppercase tracking-widest text-[#555] mb-4">Account</h2>
        {user && (
          <div className="flex items-center gap-3 mb-4">
            {user.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.photoURL} alt="" className="w-9 h-9 rounded-full ring-1 ring-[#2a2a2a]" aria-hidden />
            ) : (
              <div className="w-9 h-9 rounded-full bg-[#2563eb] flex items-center justify-center text-white text-sm font-bold">
                {(user.displayName?.[0] ?? "?").toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-white">{user.displayName ?? "—"}</p>
              <p className="text-xs text-[#555]">{user.email ?? "—"}</p>
            </div>
          </div>
        )}
        <button
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#3b1515] text-[#f87171] text-xs font-medium hover:bg-[#1e0f0f] transition-colors"
          onClick={handleSignOut} disabled={signingOut}
        >
          {signingOut ? "Signing out…" : "Sign out"}
        </button>
      </section>

      {/* Calendar & Gmail */}
      <section className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-5" aria-labelledby="connect-heading">
        <h2 id="connect-heading" className="text-xs font-semibold uppercase tracking-widest text-[#555] mb-1">Google Calendar &amp; Gmail</h2>
        <p className="text-xs text-[#444] mb-4 leading-relaxed">
          Used to schedule task blocks and detect deadlines in your inbox. You approve each email suggestion before anything is scheduled.
        </p>
        <div className="space-y-2 mb-4">
          <StatusRow label="Google Calendar" connected={calendarConnected} />
          <StatusRow label="Gmail (read-only)" connected={gmailConnected} />
        </div>
        {connectError && <p className="text-xs text-[#f87171] mb-2">{connectError}</p>}
        <button className="btn-primary text-xs" onClick={handleConnectGoogle} disabled={connecting}>
          {connecting ? (
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />Connecting…
            </span>
          ) : calendarConnected && gmailConnected ? "Reconnect" : "Connect Google Calendar & Gmail"}
        </button>
      </section>

      {/* Work hours */}
      <section className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-5" aria-labelledby="hours-heading">
        <h2 id="hours-heading" className="text-xs font-semibold uppercase tracking-widest text-[#555] mb-1">Work hours</h2>
        <p className="text-xs text-[#444] mb-4">Life Saver only schedules tasks during these hours.</p>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label htmlFor="work-start" className="block text-xs text-[#555] mb-1.5">Start</label>
            <input id="work-start" type="time" value={workStart} onChange={(e) => setWorkStart(e.target.value)} className="input" />
          </div>
          <div>
            <label htmlFor="work-end" className="block text-xs text-[#555] mb-1.5">End</label>
            <input id="work-end" type="time" value={workEnd} onChange={(e) => setWorkEnd(e.target.value)} className="input" />
          </div>
        </div>
        <button className="btn-primary text-xs" onClick={handleSaveHours} disabled={savingHours}>
          {savedHours ? "Saved ✓" : savingHours ? "Saving…" : "Save hours"}
        </button>
      </section>

      {/* Notifications */}
      <section className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-5" aria-labelledby="notifications-heading">
        <h2 id="notifications-heading" className="text-xs font-semibold uppercase tracking-widest text-[#555] mb-1">Push notifications</h2>
        <p className="text-xs text-[#444] mb-4 leading-relaxed">
          Life Saver sends calm, specific alerts when a task is at risk or rescheduled.
        </p>
        <NotificationsButton />
      </section>
    </div>
  );
}

function StatusRow({ label, connected }: { label: string; connected: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-[#888]">{label}</span>
      <span className={`flex items-center gap-1.5 text-xs font-medium ${connected ? "text-[#4ade80]" : "text-[#555]"}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${connected ? "bg-[#4ade80]" : "bg-[#333]"}`} aria-hidden />
        {connected ? "Connected" : "Not connected"}
      </span>
    </div>
  );
}

function NotificationsButton() {
  const [status, setStatus] = useState<"idle"|"requesting"|"granted"|"denied">("idle");

  async function handleEnable() {
    if (!("Notification" in window)) { setStatus("denied"); return; }
    setStatus("requesting");
    try {
      const perm = await Notification.requestPermission();
      setStatus(perm === "granted" ? "granted" : "denied");
    } catch { setStatus("denied"); }
  }

  if (status === "granted") return (
    <div className="flex items-center gap-2 text-xs text-[#4ade80]">
      <span>✓</span><span>Notifications enabled — you&apos;re all set.</span>
    </div>
  );
  if (status === "denied") return (
    <p className="text-xs text-[#555]">Notifications blocked. Enable them in your browser settings, then reload.</p>
  );
  return (
    <button className="btn-secondary text-xs" onClick={handleEnable} disabled={status === "requesting"}>
      {status === "requesting" ? "Requesting permission…" : "Enable notifications"}
    </button>
  );
}
