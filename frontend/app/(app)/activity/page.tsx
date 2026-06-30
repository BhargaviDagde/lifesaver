"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { subscribeActivity, ActivityEntry } from "@/lib/tasks";

const AGENT_META: Record<string, { label: string; color: string; dot: string; icon: string }> = {
  intake:      { label: "Intake",      color: "text-[#60a5fa]", dot: "bg-[#2563eb]", icon: "↓" },
  prioritizer: { label: "Prioritizer", color: "text-[#a78bfa]", dot: "bg-[#7c3aed]", icon: "↑" },
  scheduler:   { label: "Scheduler",   color: "text-[#34d399]", dot: "bg-[#059669]", icon: "◷" },
  monitor:     { label: "Monitor",     color: "text-[#fb923c]", dot: "bg-[#ea580c]", icon: "◉" },
  insights:    { label: "Insights",    color: "text-[#4ade80]", dot: "bg-[#16a34a]", icon: "✦" },
};

function timeAgo(date: Date): string {
  const m = Math.floor((Date.now() - date.getTime()) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "yesterday";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function ActivityPage() {
  const { user } = useAuth();
  const [log, setLog] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    return subscribeActivity(user.uid, (entries) => {
      setLog(entries);
      setLoading(false);
    });
  }, [user]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-white">Activity</h1>
        <p className="text-[#555] text-sm mt-0.5">Everything Life Saver did, and why.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-5 h-5 border-2 border-[#2563eb] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : log.length === 0 ? (
        <div className="border border-dashed border-[#2a2a2a] rounded-xl text-center py-12">
          <p className="text-[#555] text-sm">No activity yet.</p>
          <p className="text-[#333] text-xs mt-1 max-w-xs mx-auto">Add a task and the agents will get to work. Their reasoning appears here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {log.map((entry) => {
            const meta = AGENT_META[entry.agent] ?? { label: entry.agent, color: "text-[#555]", dot: "bg-[#333]", icon: "·" };
            return (
              <article key={entry.id} className="bg-[#141414] border border-[#2a2a2a] rounded-xl px-4 py-3.5 flex gap-3 animate-fade-in hover:border-[#333] transition-colors">
                {/* Icon */}
                <div className="flex-shrink-0 pt-0.5">
                  <div className={`w-6 h-6 rounded-lg ${meta.dot} flex items-center justify-center text-white text-[11px] font-bold`} aria-hidden>
                    {meta.icon}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[11px] font-semibold uppercase tracking-wide ${meta.color}`}>{meta.label}</span>
                    <span className="text-[#333] text-[11px]">{timeAgo(entry.createdAt)}</span>
                  </div>
                  <p className="text-sm text-[#ccc] font-medium">{entry.action}</p>
                  {entry.reasoning && (
                    <p className="text-xs text-[#444] mt-1 leading-relaxed">{entry.reasoning}</p>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
