/**
 * /onboarding — explains what the app does, requests calendar/email access,
 * sets work hours and timezone.
 *
 * Phase 1: UI shell with work hours form.
 * Phase 2: wire up OAuth connect button → backend /auth/google/authorize.
 */

"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getOAuthConnectUrl } from "@/lib/api";

const STEPS = ["welcome", "connect", "hours", "done"] as const;
type Step = (typeof STEPS)[number];

export default function OnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const justConnected = searchParams.get("connected") === "true";

  const [step, setStep] = useState<Step>(justConnected ? "hours" : "welcome");
  const [workStart, setWorkStart] = useState("09:00");
  const [workEnd, setWorkEnd] = useState("18:00");
  const [saving, setSaving] = useState(false);

  function handleConnect() {
    // Redirect to backend OAuth flow. Backend will redirect back here with ?connected=true.
    window.location.href = getOAuthConnectUrl();
  }

  async function handleSaveHours() {
    setSaving(true);
    // TODO Phase 1: save work hours to Firestore user profile
    await new Promise((r) => setTimeout(r, 500)); // placeholder
    setSaving(false);
    setStep("done");
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#F7F9FC] px-4 py-12">
      <div className="w-full max-w-lg">
        {step === "welcome" && (
          <div className="card animate-fade-in">
            <h1 className="text-2xl font-bold text-[#1E2A3A] mb-2">
              Let me take it from here.
            </h1>
            <p className="text-[#6B7A8D] mb-6">
              Life Saver watches your calendar, spots deadlines in your email,
              and quietly schedules work time — before you have to ask. When
              something&apos;s about to slip, it moves things around and tells you
              what it did.
            </p>
            <div className="space-y-3 mb-6">
              <Feature icon="📅" text="Finds open calendar slots and books them for you" />
              <Feature icon="📬" text="Spots deadlines in your email and turns them into tasks" />
              <Feature icon="🔔" text="Sends calm, specific alerts — not generic pings" />
              <Feature icon="🎙️" text="Add tasks by voice, get them scheduled automatically" />
            </div>
            <button
              className="btn-primary w-full"
              onClick={() => setStep("connect")}
            >
              Get started
            </button>
          </div>
        )}

        {step === "connect" && (
          <div className="card animate-fade-in">
            <h2 className="text-xl font-bold text-[#1E2A3A] mb-2">
              Connect your Google account
            </h2>
            <p className="text-[#6B7A8D] mb-4 text-sm">
              To schedule tasks and check deadlines in your email, Life Saver
              needs read/write access to your Google Calendar and read-only
              access to Gmail. Here&apos;s what that means for you:
            </p>
            <ul className="space-y-3 mb-6 text-sm">
              <li className="flex items-start gap-3">
                <span className="text-[#38B2AC] font-bold mt-0.5">✓</span>
                <span>
                  <strong>Calendar:</strong> Life Saver books time blocks for
                  your tasks and moves them when plans change.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[#38B2AC] font-bold mt-0.5">✓</span>
                <span>
                  <strong>Email (read-only):</strong> Scans your last 2 days
                  of email for deadline mentions. You approve each suggested
                  task with one tap before anything is scheduled.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-[#38B2AC] font-bold mt-0.5">✓</span>
                <span>
                  <strong>Your data stays yours:</strong> Tokens are encrypted
                  at rest and used only to act on your behalf.
                </span>
              </li>
            </ul>
            <button className="btn-primary w-full" onClick={handleConnect}>
              Connect Google Calendar &amp; Gmail
            </button>
            <button
              className="btn-secondary w-full mt-3"
              onClick={() => setStep("hours")}
            >
              Skip for now (calendar features won&apos;t work)
            </button>
          </div>
        )}

        {step === "hours" && (
          <div className="card animate-fade-in">
            {justConnected && (
              <div className="flex items-center gap-2 mb-4 p-3 bg-[#38B2AC]/10 rounded-lg text-sm text-[#2A8A87]">
                <span>✓</span>
                <span>Google Calendar &amp; Gmail connected.</span>
              </div>
            )}
            <h2 className="text-xl font-bold text-[#1E2A3A] mb-2">
              When do you work?
            </h2>
            <p className="text-[#6B7A8D] mb-5 text-sm">
              Life Saver only schedules tasks during these hours. You can change
              this anytime in Settings.
            </p>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label
                  htmlFor="work-start"
                  className="block text-sm font-medium text-[#1E2A3A] mb-1"
                >
                  Work starts
                </label>
                <input
                  id="work-start"
                  type="time"
                  value={workStart}
                  onChange={(e) => setWorkStart(e.target.value)}
                  className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D7DD2]"
                />
              </div>
              <div>
                <label
                  htmlFor="work-end"
                  className="block text-sm font-medium text-[#1E2A3A] mb-1"
                >
                  Work ends
                </label>
                <input
                  id="work-end"
                  type="time"
                  value={workEnd}
                  onChange={(e) => setWorkEnd(e.target.value)}
                  className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D7DD2]"
                />
              </div>
            </div>
            <button
              className="btn-primary w-full"
              onClick={handleSaveHours}
              disabled={saving}
            >
              {saving ? "Saving…" : "Save and continue"}
            </button>
          </div>
        )}

        {step === "done" && (
          <div className="card animate-fade-in text-center">
            <div className="text-5xl mb-4">✓</div>
            <h2 className="text-xl font-bold text-[#1E2A3A] mb-2">
              You&apos;re all set.
            </h2>
            <p className="text-[#6B7A8D] mb-6 text-sm">
              Add your first task and watch Life Saver find time for it.
            </p>
            <button
              className="btn-primary w-full"
              onClick={() => router.push("/dashboard")}
            >
              Go to dashboard
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

function Feature({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <span className="text-lg" aria-hidden>
        {icon}
      </span>
      <span className="text-[#6B7A8D]">{text}</span>
    </div>
  );
}
