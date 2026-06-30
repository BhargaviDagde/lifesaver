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
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Insights</h1>
          <p className="text-[#555] text-sm mt-0.5">Habits, streaks, and what Life Saver noticed.</p>
        </div>
        {data && (
          <button className="btn-ghost text-xs" onClick={handleLoadInsights} disabled={loading}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        )}
      </div>

      {!data ? (
        <div className="border border-dashed border-[#2a2a2a] rounded-xl text-center py-14">
          <div className="text-3xl mb-3" aria-hidden>✦</div>
          <p className="font-semibold text-[#ccc]">Ready to look back.</p>
          <p className="text-[#444] text-sm mt-1 max-w-xs mx-auto leading-relaxed">
            Life Saver scans your last 30 days — patterns, streaks, coaching. No failure scores.
          </p>
          {error && <p className="text-[#f87171] text-xs mt-3">{error}</p>}
          <button className="btn-primary mt-5 text-sm" onClick={handleLoadInsights} disabled={loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Analyzing…
              </span>
            ) : "Generate insights"}
          </button>
        </div>
      ) : (
        <div className="space-y-4 animate-fade-in">
          {/* AI Recap */}
          <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-5 border-l-2 border-l-[#2563eb]">
            <div className="flex items-start gap-3">
              <span className="text-[#2563eb] text-base flex-shrink-0 mt-0.5">✦</span>
              <p className="text-sm text-[#ccc] leading-relaxed">{data.recap}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Completed", value: data.tasksCompleted, color: "text-[#34d399]" },
              { label: "On-time rate", value: `${data.onTimeRate}%`, color: "text-[#60a5fa]" },
              { label: "Day streak", value: data.currentStreak, color: data.currentStreak >= 3 ? "text-[#fb923c]" : "text-[#555]" },
              { label: "Missed", value: data.tasksMissed, color: "text-[#555]" },
            ].map((s) => (
              <div key={s.label} className="bg-[#141414] border border-[#2a2a2a] rounded-xl px-4 py-3.5">
                <p className="text-[#444] text-[11px] font-medium mb-1.5">{s.label}</p>
                <p className={`text-xl font-bold leading-none ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Consistency chart */}
          {data.dailyCompletions?.length > 0 && (
            <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-[#555]">Consistency</h2>
                <div className="flex gap-1">
                  {([7, 14, 30] as const).map((w) => (
                    <button key={w} onClick={() => setChartWindow(w)}
                      className={clsx("px-2.5 py-1 rounded-lg text-xs font-medium transition-colors",
                        chartWindow === w ? "bg-[#2563eb] text-white" : "text-[#444] hover:text-[#888]"
                      )}>
                      {w}d
                    </button>
                  ))}
                </div>
              </div>
              <ConsistencyChart data={data.dailyCompletions.slice(-chartWindow)} streak={data.currentStreak} />
            </div>
          )}

          {/* Category breakdown */}
          {Object.keys(data.categoryBreakdown).length > 0 && (
            <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-5">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-[#555] mb-4">By category</h2>
              <div className="space-y-3.5">
                {Object.entries(data.categoryBreakdown).sort((a,b) => b[1].total - a[1].total).map(([cat, counts]) => {
                  const pct = counts.total > 0 ? Math.round((counts.done / counts.total) * 100) : 0;
                  const color = pct >= 80 ? "#34d399" : pct >= 50 ? "#60a5fa" : "#fb923c";
                  return (
                    <div key={cat}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs text-[#888] flex items-center gap-1.5">
                          <span aria-hidden>{CATEGORY_EMOJI[cat] ?? "📌"}</span>
                          <span className="capitalize">{cat}</span>
                        </span>
                        <span className="text-xs text-[#444]">
                          {counts.done}/{counts.total} · <span className="font-medium" style={{ color }}>{pct}%</span>
                        </span>
                      </div>
                      <div className="w-full bg-[#2a2a2a] rounded-full h-1.5 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <HabitTips data={data} />
        </div>
      )}
    </div>
  );
}

function ConsistencyChart({ data, streak }: { data: { date: string; label: string; count: number }[]; streak: number }) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const today = new Date().toISOString().split("T")[0];
  return (
    <div>
      <div className="flex items-end gap-0.5 h-16">
        {data.map((day) => {
          const isToday = day.date === today;
          const h = (day.count / maxCount) * 100;
          const hasActivity = day.count > 0;
          return (
            <div key={day.date} className="flex-1 flex flex-col items-center" title={`${day.label}: ${day.count} task${day.count !== 1 ? "s" : ""}`}>
              <div className="w-full flex items-end" style={{ height: "56px" }}>
                <div className="w-full rounded-sm transition-all"
                  style={{
                    height: hasActivity ? `${Math.max(h, 12)}%` : "3px",
                    backgroundColor: isToday ? "#2563eb" : hasActivity ? "#14b8a6" : "#2a2a2a"
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-between mt-3 text-[10px] text-[#444]">
        <span>{data[0]?.label}</span>
        <span>{data[Math.floor(data.length / 2)]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
      <div className="flex items-center gap-4 mt-2 text-[10px] text-[#444]">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#14b8a6]" />Tasks done</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-[#2563eb]" />Today</span>
        {streak > 0 && <span className="ml-auto text-[#fb923c] font-medium">🔥 {streak} day streak</span>}
      </div>
    </div>
  );
}

function HabitTips({ data }: { data: InsightsResponse }) {
  const tips: { icon: string; text: string }[] = [];
  if (data.currentStreak >= 3) tips.push({ icon: "🔥", text: `${data.currentStreak}-day streak — consistency is building.` });
  if (data.onTimeRate < 50 && data.tasksCompleted > 0) tips.push({ icon: "⏰", text: "Tasks are finishing late. Try scheduling them 20% earlier." });
  if (data.onTimeRate >= 80) tips.push({ icon: "✓", text: `${data.onTimeRate}% on-time rate — you're estimating effort well.` });
  const worst = Object.entries(data.categoryBreakdown).filter(([,c]) => c.total >= 2).sort((a,b) => (a[1].done/a[1].total)-(b[1].done/b[1].total))[0];
  if (worst) {
    const [cat, counts] = worst;
    const pct = Math.round((counts.done / counts.total) * 100);
    if (pct < 60) tips.push({ icon: "💡", text: `${cat.charAt(0).toUpperCase()+cat.slice(1)}s tend to slip — try scheduling them 2 days earlier.` });
  }
  if (tips.length === 0) return null;
  return (
    <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl p-5">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-[#555] mb-3">Coaching</h2>
      <div className="space-y-2.5">
        {tips.map((tip, i) => (
          <div key={i} className="flex items-start gap-3 text-sm">
            <span className="text-base flex-shrink-0 mt-0.5" aria-hidden>{tip.icon}</span>
            <span className="text-[#888] leading-relaxed text-xs">{tip.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
