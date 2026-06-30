"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { subscribeActivity, ActivityEntry } from "@/lib/tasks";

const AGENT_META: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  intake:      { label: "Intake",      color: "text-[#2D7DD2]",  bg: "bg-[#2D7DD2]/10",  icon: "📥" },
  prioritizer: { label: "Prioritizer", color: "text-purple-700", bg: "bg-purple-50",      icon: "🎯" },
  scheduler:   { label: "Scheduler",   color: "text-[#38B2AC]",  bg: "bg-[#38B2AC]/10",  icon: "📅" },
  monitor:     { label: "Monitor",     color: "text-[#B8800F]",  bg: "bg-[#F6AE2D]/10",  icon: "👁" },
  insights:    { label: "Insights",    color: "text-green-700",  bg: "bg-green-50",       icon: "💡" },
};

function timeAgo(date: Date): string {
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function ActivityPage() {
  const { user } = useAuth();
  const [log, setLog] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeActivity(user.uid, (entries) => {
      setLog(entries);
      setLoading(false);
    });
    return unsub;
  }, [user]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1E2A3A]">Activity</h1>
        <p className="text-[#6B7A8D] text-sm mt-0.5">
          Everything Life Saver did, and why.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-[#2D7DD2] border-t-transparent rounded-full animate-spin" aria-label="Loading activity" />
        </div>
      ) : log.length === 0 ? (
        <div className="rounded-card border border-dashed border-[#E2E8F0] bg-white text-center py-12">
          <p className="font-medium text-[#1E2A3A]">No activity yet.</p>
          <p className="text-[#6B7A8D] text-sm mt-1 max-w-sm mx-auto">
            Add a task and the agents will get to work. Their reasoning will appear
            here as a plain-language log — so you always know what changed and why.
          </p>
        </div>
      ) : (
        <ol className="space-y-3" aria-label="Agent activity log">
          {log.map((entry) => {
            const meta = AGENT_META[entry.agent] ?? {
              label: entry.agent, color: "text-[#6B7A8D]", bg: "bg-[#6B7A8D]/10", icon: "🤖",
            };
            return (
              <li key={entry.id} className="bg-white rounded-card shadow-card border border-[#E2E8F0] flex gap-4 px-4 py-3.5 animate-fade-in">
                {/* Icon */}
                <div className={`flex-shrink-0 w-9 h-9 rounded-full ${meta.bg} flex items-center justify-center text-base`} aria-hidden>
                  {meta.icon}
                </div>

                <div className="flex-1 min-w-0">
                  {/* Agent + time */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-semibold uppercase tracking-wide ${meta.color}`}>
                      {meta.label}
                    </span>
                    <span className="text-[#6B7A8D] text-xs">{timeAgo(entry.createdAt)}</span>
                  </div>

                  {/* What happened */}
                  <p className="text-sm font-medium text-[#1E2A3A]">{entry.action}</p>

                  {/* Why */}
                  {entry.reasoning && (
                    <p className="text-xs text-[#6B7A8D] mt-1 leading-relaxed">{entry.reasoning}</p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
