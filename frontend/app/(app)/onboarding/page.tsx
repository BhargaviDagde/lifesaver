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
    window.location.href = getOAuthConnectUrl();
  }

  async function handleSaveHours() {
    setSaving(true);
    await new Promise((r) => setTimeout(r, 500));
    setSaving(false);
    setStep("done");
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0a0a0a] px-4 py-12">
      <div className="w-full max-w-md">
        {step === "welcome" && (
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-6 animate-fade-in">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#14b8a6] to-[#2563eb] flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
              </div>
              <div>
                <h1 className="text-lg font-bold text-white leading-none">Let me take it from here.</h1>
                <p className="text-[#555] text-xs mt-0.5">Life Saver setup</p>
              </div>
            </div>
            <p className="text-[#666] text-sm mb-5 leading-relaxed">
              Life Saver watches your calendar, spots deadlines in your email, and quietly schedules work time — before you have to ask.
            </p>
            <div className="space-y-3 mb-5">
              {[
                ["◷", "Finds open slots and books them for you"],
                ["✉", "Spots deadlines in email, surfaces for approval"],
                ["◉", "Sends calm, specific alerts — not generic pings"],
              ].map(([icon, text]) => (
                <div key={text} className="flex items-center gap-3 text-sm">
                  <span className="w-6 h-6 rounded-md bg-[#1e1e1e] border border-[#2a2a2a] flex items-center justify-center text-[#2563eb] text-xs flex-shrink-0">{icon}</span>
                  <span className="text-[#666]">{text}</span>
                </div>
              ))}
            </div>
            <button className="btn-primary w-full" onClick={() => setStep("connect")}>Get started →</button>
          </div>
        )}

        {step === "connect" && (
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-6 animate-fade-in">
            <h2 className="text-lg font-bold text-white mb-1">Connect Google</h2>
            <p className="text-[#555] text-sm mb-4 leading-relaxed">
              Life Saver needs Calendar access to schedule tasks and Gmail (read-only) to spot deadlines.
            </p>
            <div className="space-y-2.5 mb-5 text-sm">
              {[
                ["Calendar", "Books and moves task blocks on your behalf."],
                ["Gmail (read-only)", "Scans last 2 days for deadlines. You approve before anything is scheduled."],
                ["Your data", "Tokens are encrypted at rest and used only to act on your behalf."],
              ].map(([label, desc]) => (
                <div key={label} className="flex items-start gap-3">
                  <span className="text-[#34d399] font-bold mt-0.5 flex-shrink-0">✓</span>
                  <span className="text-[#666]"><strong className="text-[#888]">{label}:</strong> {desc}</span>
                </div>
              ))}
            </div>
            <button className="btn-primary w-full mb-2" onClick={handleConnect}>Connect Google Calendar &amp; Gmail</button>
            <button className="btn-secondary w-full text-xs" onClick={() => setStep("hours")}>Skip (calendar features won't work)</button>
          </div>
        )}

        {step === "hours" && (
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-6 animate-fade-in">
            {justConnected && (
              <div className="flex items-center gap-2 mb-4 p-3 bg-[#0d2d1a] border border-[#14532d] rounded-lg text-xs text-[#34d399]">
                <span>✓</span><span>Google Calendar &amp; Gmail connected.</span>
              </div>
            )}
            <h2 className="text-lg font-bold text-white mb-1">When do you work?</h2>
            <p className="text-[#555] text-sm mb-5">Life Saver only schedules tasks during these hours.</p>
            <div className="grid grid-cols-2 gap-3 mb-5">
              <div>
                <label htmlFor="onboard-start" className="block text-xs text-[#555] mb-1.5">Work starts</label>
                <input id="onboard-start" type="time" value={workStart} onChange={(e) => setWorkStart(e.target.value)} className="input" />
              </div>
              <div>
                <label htmlFor="onboard-end" className="block text-xs text-[#555] mb-1.5">Work ends</label>
                <input id="onboard-end" type="time" value={workEnd} onChange={(e) => setWorkEnd(e.target.value)} className="input" />
              </div>
            </div>
            <button className="btn-primary w-full" onClick={handleSaveHours} disabled={saving}>
              {saving ? "Saving…" : "Save and continue"}
            </button>
          </div>
        )}

        {step === "done" && (
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-6 animate-fade-in text-center">
            <div className="text-4xl mb-4">✓</div>
            <h2 className="text-lg font-bold text-white mb-2">You&apos;re all set.</h2>
            <p className="text-[#555] text-sm mb-6">Add your first task and watch Life Saver find time for it.</p>
            <button className="btn-primary w-full" onClick={() => router.push("/dashboard")}>Go to dashboard →</button>
          </div>
        )}
      </div>
    </main>
  );
}
