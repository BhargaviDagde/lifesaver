/**
 * /dashboard — today's priorities, at-risk tasks, quick-add bar, mic button.
 * Phase 1: shell with static layout.
 * Phase 2: wire up real task data from Firestore onSnapshot.
 */

"use client";

import { useState } from "react";
import Link from "next/link";

export default function DashboardPage() {
  const [taskInput, setTaskInput] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleAddTask(e: React.FormEvent) {
    e.preventDefault();
    if (!taskInput.trim()) return;
    setSubmitting(true);
    // TODO Phase 2: call createTask(taskInput) from lib/api.ts
    await new Promise((r) => setTimeout(r, 400));
    setTaskInput("");
    setSubmitting(false);
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-[#1E2A3A]">Today</h1>
        <p className="text-[#6B7A8D] text-sm mt-1">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* Quick-add bar */}
      <form onSubmit={handleAddTask} className="flex gap-2">
        <input
          type="text"
          value={taskInput}
          onChange={(e) => setTaskInput(e.target.value)}
          placeholder='Add a task — try "essay due Friday, 3 hours"'
          className="flex-1 border border-[#E2E8F0] rounded-lg px-4 py-2.5 text-sm
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2D7DD2]
                     bg-white placeholder-[#6B7A8D]"
          aria-label="Add a new task"
        />
        {/* Mic button — Phase 5 */}
        <button
          type="button"
          className="btn-secondary px-3"
          aria-label="Add task by voice (coming soon)"
          title="Voice input — Phase 5"
        >
          <MicIcon />
        </button>
        <button
          type="submit"
          className="btn-primary"
          disabled={submitting || !taskInput.trim()}
        >
          {submitting ? "Adding…" : "Add"}
        </button>
      </form>

      {/* At-risk section — shown when Monitor Agent flags tasks */}
      <section aria-labelledby="at-risk-heading">
        <h2
          id="at-risk-heading"
          className="text-xs font-semibold uppercase tracking-wider text-[#6B7A8D] mb-3"
        >
          Needs attention
        </h2>
        {/* TODO Phase 3: render at-risk tasks from Firestore */}
        <EmptyState
          title="Nothing at risk right now."
          body="Life Saver is watching. If something needs attention, it'll appear here — and you'll get a notification before it's too late."
        />
      </section>

      {/* Today's priorities */}
      <section aria-labelledby="today-heading">
        <h2
          id="today-heading"
          className="text-xs font-semibold uppercase tracking-wider text-[#6B7A8D] mb-3"
        >
          Scheduled today
        </h2>
        {/* TODO Phase 2: render today's tasks from Firestore */}
        <EmptyState
          title="Nothing scheduled yet."
          body='Add a task above and Life Saver will find a time for it. Try: "finish lab report by Thursday, 2 hours"'
        />
      </section>

      {/* Inbox suggestions from Gmail — Phase 4 */}
      <section aria-labelledby="inbox-heading">
        <h2
          id="inbox-heading"
          className="text-xs font-semibold uppercase tracking-wider text-[#6B7A8D] mb-3"
        >
          Suggested from email
        </h2>
        <EmptyState
          title="No suggestions yet."
          body="Connect Gmail in Settings and Life Saver will spot deadlines in your inbox and surface them here for one-tap approval."
          action={<Link href="/settings" className="text-[#2D7DD2] text-sm">Connect Gmail →</Link>}
        />
      </section>
    </div>
  );
}

function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="card border border-dashed border-[#E2E8F0] bg-[#F7F9FC] text-center py-8">
      <p className="font-medium text-[#1E2A3A] text-sm">{title}</p>
      <p className="text-[#6B7A8D] text-sm mt-1 max-w-sm mx-auto">{body}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

function MicIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
  );
}
