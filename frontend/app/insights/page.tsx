/**
 * /insights — completion rate, current streak, category breakdown, Gemini recap.
 * Phase 3: wire up real Insights Agent call.
 */

"use client";

import { useState } from "react";

export default function InsightsPage() {
  const [loading, setLoading] = useState(false);

  async function handleLoadInsights() {
    setLoading(true);
    // TODO Phase 3: call getInsights() from lib/api.ts
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1E2A3A]">Insights</h1>
        <p className="text-[#6B7A8D] text-sm mt-1">
          Patterns, streaks, and a gentle read on how things are going.
        </p>
      </div>

      <div className="card border border-dashed border-[#E2E8F0] text-center py-16">
        <span className="text-4xl" aria-hidden>💡</span>
        <p className="font-medium text-[#1E2A3A] mt-3">
          Insights available after Phase 3.
        </p>
        <p className="text-[#6B7A8D] text-sm mt-1 max-w-sm mx-auto">
          Complete a few tasks and Life Saver will start noticing patterns —
          what categories tend to slip, where your most productive hours are,
          and where a small habit change could help.
        </p>
        <button
          className="btn-primary mt-5"
          onClick={handleLoadInsights}
          disabled={loading}
        >
          {loading ? "Loading…" : "Generate insights"}
        </button>
      </div>
    </div>
  );
}
