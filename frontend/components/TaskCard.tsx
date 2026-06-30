"use client";

import { useState } from "react";
import { clsx } from "clsx";
import { Task, TaskStatus } from "@/lib/tasks";
import { approveTask } from "@/lib/api";

interface TaskCardProps {
  task: Task;
  onMarkDone: () => void;
  onDelete: () => void;
  highlight?: "warning" | "normal";
  showApprove?: boolean;
}

const STATUS_BADGE: Record<TaskStatus, string> = {
  inbox: "badge-inbox",
  scheduled: "badge-scheduled",
  in_progress: "badge-in-progress",
  done: "badge-done",
  at_risk: "badge-at-risk",
  missed: "badge-missed",
  dismissed: "badge-missed",
};

const STATUS_LABEL: Record<TaskStatus, string> = {
  inbox: "Inbox",
  scheduled: "Scheduled",
  in_progress: "In progress",
  done: "Done",
  at_risk: "At risk",
  missed: "Missed",
  dismissed: "Dismissed",
};

const CATEGORY_LABEL: Record<string, string> = {
  assignment: "Assignment",
  bill: "Bill",
  interview: "Interview",
  meeting: "Meeting",
  other: "Other",
};

function formatDeadline(date: Date): string {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (diff < 0) return "Overdue";
  if (hours < 1) return "Due in under an hour";
  if (hours < 24) return `Due in ${hours}h`;
  if (days === 1) return "Due tomorrow";
  return `Due ${date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function TaskCard({ task, onMarkDone, onDelete, highlight, showApprove }: TaskCardProps) {
  const [approving, setApproving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const isAtRisk = task.status === "at_risk" || highlight === "warning";
  const isDone = task.status === "done";

  async function handleApprove() {
    setApproving(true);
    try {
      await approveTask(task.id);
    } catch {
      // Will be wired to real pipeline in Phase 2
    } finally {
      setApproving(false);
    }
  }

  return (
    <article
      className={clsx(
        "bg-white rounded-card shadow-card px-4 py-3.5 flex gap-3 items-start",
        "border transition-colors",
        isAtRisk
          ? "border-[#F6AE2D]/50 bg-[#FFFDF5]"
          : "border-[#E2E8F0]",
        isDone && "opacity-60"
      )}
    >
      {/* Checkbox */}
      <button
        onClick={onMarkDone}
        className={clsx(
          "flex-shrink-0 mt-0.5 w-5 h-5 rounded-full border-2 transition-colors",
          "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2D7DD2]",
          isDone
            ? "bg-[#38B2AC] border-[#38B2AC]"
            : "border-[#CBD5E1] hover:border-[#38B2AC]"
        )}
        aria-label={isDone ? "Mark as not done" : "Mark as done"}
      >
        {isDone && (
          <svg viewBox="0 0 12 12" fill="none" className="w-full h-full p-0.5" aria-hidden>
            <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={clsx("text-sm font-medium text-[#1E2A3A] leading-snug", isDone && "line-through text-[#6B7A8D]")}>
            {task.title}
          </p>

          {/* 3-dot menu */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="w-6 h-6 flex items-center justify-center rounded text-[#6B7A8D]
                         hover:bg-[#F1F5F9] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2D7DD2]"
              aria-label="Task options"
              aria-expanded={menuOpen}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
              </svg>
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-7 bg-white rounded-lg shadow-card-hover border border-[#E2E8F0] py-1 w-36 z-10"
                role="menu">
                <button
                  className="w-full text-left px-3 py-2 text-sm text-[#1E2A3A] hover:bg-[#F7F9FC]"
                  onClick={() => { onMarkDone(); setMenuOpen(false); }}
                  role="menuitem"
                >
                  Mark done
                </button>
                <button
                  className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  onClick={() => { onDelete(); setMenuOpen(false); }}
                  role="menuitem"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-2 mt-1.5">
          <span className={STATUS_BADGE[task.status]}>{STATUS_LABEL[task.status]}</span>

          {task.category && task.category !== "other" && (
            <span className="text-xs text-[#6B7A8D]">{CATEGORY_LABEL[task.category]}</span>
          )}

          {task.deadline && (
            <span className={clsx("text-xs", isAtRisk ? "text-[#B8800F] font-medium" : "text-[#6B7A8D]")}>
              {formatDeadline(task.deadline)}
            </span>
          )}

          {task.scheduledStart && !isDone && (
            <span className="text-xs text-[#38B2AC]">
              {formatTime(task.scheduledStart)}
              {task.scheduledEnd && ` – ${formatTime(task.scheduledEnd)}`}
            </span>
          )}

          {task.estimatedMinutes && (
            <span className="text-xs text-[#6B7A8D]">~{task.estimatedMinutes}min</span>
          )}
        </div>

        {/* Priority reasoning — shown when agent has scored the task */}
        {task.priorityReasoning && !isDone && (
          <p className="text-xs text-[#6B7A8D] mt-1.5 leading-relaxed italic">
            {task.priorityReasoning}
          </p>
        )}

        {/* Approve button for Gmail suggestions */}
        {showApprove && task.status === "inbox" && (
          <button
            onClick={handleApprove}
            disabled={approving}
            className="mt-2 btn-primary text-xs px-3 py-1.5"
          >
            {approving ? "Scheduling…" : "Schedule this →"}
          </button>
        )}
      </div>
    </article>
  );
}
