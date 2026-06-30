/**
 * /activity — plain-language feed of what each agent did and why.
 *
 * This page is the most important for demonstrating Agentic Depth to a judge.
 * A judge can scan this feed in 30 seconds and understand exactly what the
 * multi-agent system did, why it did it, and what changed as a result.
 *
 * Phase 1: shell with empty state.
 * Phase 3: wire up real activity_log Firestore onSnapshot.
 */

"use client";

import { useState } from "react";

// Agent metadata — used for badge colors and icons
const AGENT_META: Record<
  string,
  { label: string; color: string; bgColor: string; icon: string }
> = {
  intake: {
    label: "Intake",
    color: "text-[#2D7DD2]",
    bgColor: "bg-[#2D7DD2]/10",
    icon: "📥",
  },
  prioritizer: {
    label: "Prioritizer",
    color: "text-purple-700",
    bgColor: "bg-purple-50",
    icon: "🎯",
  },
  scheduler: {
    label: "Scheduler",
    color: "text-[#38B2AC]",
    bgColor: "bg-[#38B2AC]/10",
    icon: "📅",
  },
  monitor: {
    label: "Monitor",
    color: "text-[#B8800F]",
    bgColor: "bg-[#F6AE2D]/10",
    icon: "👁",
  },
  insights: {
    label: "Insights",
    color: "text-green-700",
    bgColor: "bg-green-50",
    icon: "💡",
  },
};

// Placeholder demo entries shown in Phase 0 — replace with real data in Phase 3
const DEMO_LOG = [
  {
    id: "1",
    agent: "monitor",
    action: "Moved 'Chemistry lab report' from Thursday 3pm to Wednesday 1–3pm",
    reasoning:
      "Deadline is Thursday 11:59pm. The Thursday 3pm slot was too close — only 9 hours of buffer. Wednesday 1pm gives a 30-hour lead and the slot was free.",
    createdAt: new Date(Date.now() - 1000 * 60 * 12),
    taskId: "task-1",
  },
  {
    id: "2",
    agent: "scheduler",
    action: "Scheduled 'ECON 201 problem set' for Tuesday 4–5:30pm",
    reasoning:
      "Deadline Friday 5pm. Estimated 90 minutes. Tuesday 4pm is the earliest open block during work hours that leaves a full day of buffer.",
    createdAt: new Date(Date.now() - 1000 * 60 * 45),
    taskId: "task-2",
  },
  {
    id: "3",
    agent: "prioritizer",
    action: "Scored 'Job interview prep' at 94/100",
    reasoning:
      "Interview is tomorrow at 10am — high urgency. Career-impact stakes outweigh all other active tasks. Moved to top of today's queue.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60),
    taskId: "task-3",
  },
  {
    id: "4",
    agent: "intake",
    action: "Detected task from email: 'Submit housing application'",
    reasoning:
      "Email from housing@university.edu mentions deadline October 15th. Extracted: title, deadline, category=other. Waiting for your approval before scheduling.",
    createdAt: new Date(Date.now() - 1000 * 60 * 90),
    taskId: "task-4",
  },
];

function timeAgo(date: Date): string {
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString();
}

export default function ActivityPage() {
  // TODO Phase 3: replace with real Firestore onSnapshot listener
  const [log] = useState(DEMO_LOG);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1E2A3A]">Activity</h1>
        <p className="text-[#6B7A8D] text-sm mt-1">
          Everything Life Saver did, and why it did it.
        </p>
      </div>

      {log.length === 0 ? (
        <div className="card border border-dashed border-[#E2E8F0] text-center py-12">
          <p className="font-medium text-[#1E2A3A]">No activity yet.</p>
          <p className="text-[#6B7A8D] text-sm mt-1">
            Add a task and the agents will get to work. Their reasoning will
            appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {log.map((entry) => {
            const meta = AGENT_META[entry.agent] ?? {
              label: entry.agent,
              color: "text-[#6B7A8D]",
              bgColor: "bg-[#6B7A8D]/10",
              icon: "🤖",
            };
            return (
              <article
                key={entry.id}
                className="card flex gap-4 animate-fade-in"
              >
                {/* Agent icon */}
                <div
                  className={`flex-shrink-0 w-9 h-9 rounded-full ${meta.bgColor} flex items-center justify-center text-base`}
                  aria-hidden
                >
                  {meta.icon}
                </div>

                <div className="flex-1 min-w-0">
                  {/* Agent badge + timestamp */}
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-xs font-semibold uppercase tracking-wide ${meta.color}`}
                    >
                      {meta.label}
                    </span>
                    <span className="text-[#6B7A8D] text-xs">
                      {timeAgo(entry.createdAt)}
                    </span>
                  </div>

                  {/* Action — what happened */}
                  <p className="text-sm font-medium text-[#1E2A3A]">
                    {entry.action}
                  </p>

                  {/* Reasoning — why */}
                  {entry.reasoning && (
                    <p className="text-xs text-[#6B7A8D] mt-1 leading-relaxed">
                      {entry.reasoning}
                    </p>
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
