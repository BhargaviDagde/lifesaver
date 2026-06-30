"use client";

import { useState } from "react";
import { getInsights, InsightsResponse } from "@/lib/api";

export default function InsightsPage() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<InsightsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleLoadInsights() {
    setLoading(true);
    setError(null);
    try {
      const result = await getInsights();
      setData(result);
    } catch {
      setError("Couldn't load insights. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1E2A3A]">Insights</h1>
        <p className="text-[#6B7A8D] text-sm mt-0.5">
          Patterns, streaks, and a read on how things are going.
        </p>
      </div>

      {!data ? (
        <div className="card border border-dashed border-[#E2E8F0] text-center py-12">
          <span className="text-4xl" aria-hidden>💡</span>
          <p className="font-medium text-[#1E2A3A] mt-3">Ready to look back.</p>
          <p className="text-[#6B7A8D] text-sm mt-1 max-w-sm mx-auto">
            Life Saver will scan your last 30 days and tell you what it noticed — no scoring, just patterns.
          </p>
          {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
          <button className="btn-primary mt-5" onClick={handleLoadInsights} disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden />
                Analyzing…
              </span>
            ) : "Generate insights"}
          </button>
        </div>
      ) : (
        <div className="space-y-4 animate-fade-in">
          {/* Recap */}
          <div className="card border-l-4 border-[#2D7DD2]">
            <p className="text-sm text-[#1E2A3A] leading-relaxed">{data.recap}</p>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Completed" value={data.tasksCompleted} color="text-[#38B2AC]" />
            <StatCard label="On-time rate" value={`${data.onTimeRate}%`} color="text-[#2D7DD2]" />
            <StatCard label="Current streak" value={`${data.currentStreak}d`} color="text-[#F6AE2D]" />
            <StatCard label="Missed" value={data.tasksMissed} color="text-[#6B7A8D]" />
          </div>

          {/* Category breakdown */}
          {Object.keys(data.categoryBreakdown).length > 0 && (
            <div className="card">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[#6B7A8D] mb-3">By category</h2>
              <div className="space-y-2">
                {Object.entries(data.categoryBreakdown).map(([cat, counts]) => {
                  const pct = counts.total > 0 ? Math.round((counts.done / counts.total) * 100) : 0;
                  return (
                    <div key={cat} className="flex items-center gap-3">
                      <span className="text-xs text-[#1E2A3A] w-20 capitalize">{cat}</span>
                      <div className="flex-1 bg-[#E2E8F0] rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full bg-[#38B2AC] rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-[#6B7A8D] w-12 text-right">{counts.done}/{counts.total}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <button className="btn-secondary text-sm" onClick={handleLoadInsights} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="card text-center py-4">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-[#6B7A8D] mt-1">{label}</p>
    </div>
  );
}
