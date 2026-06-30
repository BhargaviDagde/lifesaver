"use client";

import { useState } from "react";
import { getInsights, InsightsResponse } from "@/lib/api";
import { clsx } from "clsx";

const CATEGORY_EMOJI: Record<string, string> = {
  assignment: "📝", bill: "💳", interview: "🎯", meeting: "👥", other: "📌",
};

export default function InsightsPage() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<InsightsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chartWindow, setChartWindow] = useState<7 | 14 | 30>(14);

  async function handleLoadInsights() {
    setLoading(true);
    setError(null);
    try {
      const result = await getInsights();
      setData(result);
    } catch {
      setError("Couldn't load insights. Add and complete some tasks first.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1E2A3A]">Insights</h1>
          <p className="text-[#6B7A8D] text-sm mt-0.5">
            Habits, streaks, and what Life Saver noticed.
          </p>
        </div>
        {data && (
          <button className="btn-secondary text-xs" onClick={handleLoadInsights} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        )}
      </div>

      {!data ? (
        <div className="card border border-dashed border-[#E2E8F0] text-center py-14">
          <div className="text-5xl mb-3" aria-hidden>💡</div>
          <p className="font-semibold text-[#1E2A3A]">Ready to look back.</p>
          <p className="text-[#6B7A8D] text-sm mt-1 max-w-xs mx-auto leading-relaxed">
            Life Saver will scan your last 30 days — patterns, streaks, coaching. No failure scores.
          </p>
          {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
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
        <div className="space-y-5 animate-fade-in">

          {/* AI Recap */}
          <div className="card border-l-4 border-[#2D7DD2] bg-gradient-to-r from-[#2D7DD2]/5 to-transparent">
            <div className="flex items-start gap-3">
              <span className="text-xl flex-shrink-0 mt-0.5">💡</span>
              <p className="text-sm text-[#1E2A3A] leading-relaxed">{data.recap}</p>
            </div>
          </div>

          {/* Key stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              label="Completed"
              value={data.tasksCompleted}
              color="text-[#38B2AC]"
              bg="bg-[#38B2AC]/8"
              icon="✓"
            />
            <StatCard
              label="On-time rate"
              value={`${data.onTimeRate}%`}
              color="text-[#2D7DD2]"
              bg="bg-[#2D7DD2]/8"
              icon="⏱"
            />
            <StatCard
              label="Day streak"
              value={data.currentStreak}
              color={data.currentStreak >= 3 ? "text-[#F6AE2D]" : "text-[#6B7A8D]"}
              bg={data.currentStreak >= 3 ? "bg-[#F6AE2D]/10" : "bg-slate-50"}
              icon="🔥"
            />
            <StatCard
              label="Missed"
              value={data.tasksMissed}
              color="text-[#6B7A8D]"
              bg="bg-slate-50"
              icon="○"
            />
          </div>

          {/* Consistency chart */}
          {data.dailyCompletions && data.dailyCompletions.length > 0 && (
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-[#1E2A3A]">Consistency</h2>
                <div className="flex gap-1">
                  {([7, 14, 30] as const).map((w) => (
                    <button
                      key={w}
                      onClick={() => setChartWindow(w)}
                      className={clsx(
                        "px-2.5 py-1 rounded-lg text-xs font-medium transition-colors",
                        chartWindow === w
                          ? "bg-[#2D7DD2] text-white"
                          : "text-[#6B7A8D] hover:bg-[#F1F5F9]"
                      )}
                    >
                      {w}d
                    </button>
                  ))}
                </div>
              </div>
              <ConsistencyChart
                data={data.dailyCompletions.slice(-chartWindow)}
                streak={data.currentStreak}
              />
            </div>
          )}

          {/* Category breakdown */}
          {Object.keys(data.categoryBreakdown).length > 0 && (
            <div className="card">
              <h2 className="text-sm font-semibold text-[#1E2A3A] mb-4">By category</h2>
              <div className="space-y-3">
                {Object.entries(data.categoryBreakdown)
                  .sort((a, b) => b[1].total - a[1].total)
                  .map(([cat, counts]) => {
                    const pct = counts.total > 0 ? Math.round((counts.done / counts.total) * 100) : 0;
                    const color = pct >= 80 ? "#38B2AC" : pct >= 50 ? "#2D7DD2" : "#F6AE2D";
                    return (
                      <div key={cat}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium text-[#1E2A3A] flex items-center gap-1.5">
                            <span aria-hidden>{CATEGORY_EMOJI[cat] ?? "📌"}</span>
                            <span className="capitalize">{cat}</span>
                          </span>
                          <span className="text-xs text-[#6B7A8D]">
                            {counts.done}/{counts.total} · <span className="font-medium" style={{ color }}>{pct}%</span>
                          </span>
                        </div>
                        <div className="w-full bg-[#E8EDF3] rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, backgroundColor: color }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Habit tips */}
          <HabitTips data={data} />

        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Consistency chart — SVG bar chart, no dependencies
// ---------------------------------------------------------------------------

function ConsistencyChart({
  data,
  streak,
}: {
  data: { date: string; label: string; count: number }[];
  streak: number;
}) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const today = new Date().toISOString().split("T")[0];

  return (
    <div>
      {/* Bar chart */}
      <div className="flex items-end gap-0.5 h-20" aria-label="Daily completions chart">
        {data.map((day) => {
          const isToday = day.date === today;
          const heightPct = (day.count / maxCount) * 100;
          const hasActivity = day.count > 0;
          return (
            <div
              key={day.date}
              className="flex-1 flex flex-col items-center gap-1 group relative"
              title={`${day.label}: ${day.count} task${day.count !== 1 ? "s" : ""}`}
            >
              <div className="w-full flex items-end" style={{ height: "64px" }}>
                <div
                  className={clsx(
                    "w-full rounded-t-sm transition-all duration-300",
                    isToday
                      ? "bg-[#2D7DD2]"
                      : hasActivity
                      ? "bg-[#38B2AC]"
                      : "bg-[#E8EDF3]"
                  )}
                  style={{ height: hasActivity ? `${Math.max(heightPct, 8)}%` : "4px" }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* X-axis labels — show every ~5 days */}
      <div className="flex items-end gap-0.5 mt-1.5">
        {data.map((day, i) => (
          <div key={day.date} className="flex-1 text-center">
            {i % Math.max(1, Math.floor(data.length / 6)) === 0 && (
              <span className="text-[9px] text-[#94A3B8]">
                {new Date(day.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 text-xs text-[#6B7A8D]">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-[#38B2AC]" />Tasks completed
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-[#2D7DD2]" />Today
        </span>
        {streak > 0 && (
          <span className="ml-auto text-[#F6AE2D] font-medium">
            🔥 {streak} day streak
          </span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Habit tips — coaching cards based on data
// ---------------------------------------------------------------------------

function HabitTips({ data }: { data: InsightsResponse }) {
  const tips: { icon: string; text: string }[] = [];

  if (data.currentStreak >= 3) {
    tips.push({ icon: "🔥", text: `${data.currentStreak}-day streak going — consistency is building.` });
  }
  if (data.onTimeRate < 50 && data.tasksCompleted > 0) {
    tips.push({ icon: "⏰", text: "Tasks are finishing late. Try scheduling them 20% earlier than you think you need." });
  }
  if (data.onTimeRate >= 80) {
    tips.push({ icon: "✅", text: `${data.onTimeRate}% on-time rate — you're estimating effort well.` });
  }

  // Find worst category
  const worst = Object.entries(data.categoryBreakdown)
    .filter(([, c]) => c.total >= 2)
    .sort((a, b) => (a[1].done / a[1].total) - (b[1].done / b[1].total))[0];
  if (worst) {
    const [cat, counts] = worst;
    const pct = Math.round((counts.done / counts.total) * 100);
    if (pct < 60) {
      tips.push({ icon: "💡", text: `${cat.charAt(0).toUpperCase() + cat.slice(1)}s tend to slip — try scheduling them 2 days earlier.` });
    }
  }

  if (tips.length === 0) return null;

  return (
    <div className="card">
      <h2 className="text-sm font-semibold text-[#1E2A3A] mb-3">Coaching</h2>
      <div className="space-y-2.5">
        {tips.map((tip, i) => (
          <div key={i} className="flex items-start gap-3 text-sm">
            <span className="text-base flex-shrink-0 mt-0.5" aria-hidden>{tip.icon}</span>
            <span className="text-[#475569] leading-relaxed">{tip.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({
  label, value, color, bg, icon,
}: {
  label: string; value: string | number; color: string; bg: string; icon: string;
}) {
  return (
    <div className={clsx("rounded-xl border border-[#E8EDF3] p-4 text-center", bg)}>
      <span className="text-lg" aria-hidden>{icon}</span>
      <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
      <p className="text-[11px] text-[#6B7A8D] mt-0.5">{label}</p>
    </div>
  );
}
