/**
 * /tasks — full task list with filtering.
 * Phase 1: static shell.
 * Phase 2: wire up Firestore onSnapshot.
 */

"use client";

import { useState } from "react";

type Status =
  | "all"
  | "inbox"
  | "scheduled"
  | "in_progress"
  | "done"
  | "at_risk"
  | "missed";

const STATUS_FILTERS: { value: Status; label: string }[] = [
  { value: "all", label: "All" },
  { value: "inbox", label: "Inbox" },
  { value: "scheduled", label: "Scheduled" },
  { value: "in_progress", label: "In progress" },
  { value: "at_risk", label: "At risk" },
  { value: "done", label: "Done" },
  { value: "missed", label: "Missed" },
];

export default function TasksPage() {
  const [filter, setFilter] = useState<Status>("all");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1E2A3A]">Tasks</h1>
        <p className="text-[#6B7A8D] text-sm mt-1">
          Everything on your plate, in one place.
        </p>
      </div>

      {/* Filter bar */}
      <div
        className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0"
        role="tablist"
        aria-label="Filter tasks by status"
      >
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            role="tab"
            aria-selected={filter === f.value}
            onClick={() => setFilter(f.value)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-pill text-xs font-medium transition-colors
              ${
                filter === f.value
                  ? "bg-[#2D7DD2] text-white"
                  : "bg-white border border-[#E2E8F0] text-[#6B7A8D] hover:bg-[#EEF2F7]"
              }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Task list — TODO Phase 2: replace with real data */}
      <div className="card border border-dashed border-[#E2E8F0] text-center py-12">
        <p className="font-medium text-[#1E2A3A]">No tasks here yet.</p>
        <p className="text-[#6B7A8D] text-sm mt-1">
          Add a task from the dashboard and it will appear here once Life Saver
          processes it.
        </p>
      </div>
    </div>
  );
}
