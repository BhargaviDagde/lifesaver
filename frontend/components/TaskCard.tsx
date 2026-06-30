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

const STATUS_CONFIG: Record<TaskStatus, { label: string; className: string }> = {
  inbox:       { label: "Inbox",       className: "bg-[#1e3a5f] text-[#60a5fa]" },
  scheduled:   { label: "Scheduled",   className: "bg-[#14532d] text-[#4ade80]" },
  in_progress: { label: "In progress", className: "bg-[#2e1d5e] text-[#a78bfa]" },
  done:        { label: "Done",        className: "bg-[#1e3a2f] text-[#34d399]" },
  at_risk:     { label: "At risk",     className: "bg-[#451a03] text-[#fb923c]" },
  missed:      { label: "Missed",      className: "bg-[#3b1515] text-[#f87171]" },
  dismissed:   { label: "Dismissed",   className: "bg-[#1a1a1a] text-[#555]" },
};

function formatDeadline(date: Date): string {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (diff < 0) return "Overdue";
  if (hours < 1) return "Under 1h left";
  if (hours < 24) return `${hours}h left`;
  if (days === 1) return "Due tomorrow";
  return `Due ${date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function cleanReasoning(text: string): string {
  return text.replace(
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})/g,
    (iso) => {
      try {
        const d = new Date(iso);
        return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
      } catch { return iso; }
    }
  );
}

export function TaskCard({ task, onMarkDone, onDelete, highlight, showApprove }: TaskCardProps) {
  const [approving, setApproving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const isAtRisk = task.status === "at_risk" || highlight === "warning";
  const isDone = task.status === "done";
  const statusCfg = STATUS_CONFIG[task.status];

  const priorityColor = (task.priorityScore ?? 0) >= 75
    ? "#f59e0b"
    : (task.priorityScore ?? 0) >= 50
    ? "#2563eb"
    : "#14b8a6";

  async function handleApprove() {
    setApproving(true);
    try { await approveTask(task.id); } catch { /* handled by onSnapshot */ }
    finally { setApproving(false); }
  }

  return (
    <article
      className={clsx(
        "bg-[#141414] border rounded-xl transition-all duration-150",
        "hover:border-[#333] hover:bg-[#161616]",
        isAtRisk ? "border-[#451a03]" : "border-[#2a2a2a]",
        isDone && "opacity-50"
      )}
    >
      {/* At-risk top line */}
      {isAtRisk && <div className="h-px bg-gradient-to-r from-[#f59e0b] to-transparent rounded-t-xl" />}

      <div className="px-4 py-3.5 flex gap-3 items-start">
        {/* Checkbox */}
        <button
          onClick={onMarkDone}
          className={clsx(
            "flex-shrink-0 mt-0.5 w-4 h-4 rounded border transition-all duration-150 flex items-center justify-center",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2563eb]",
            isDone
              ? "bg-[#14b8a6] border-[#14b8a6]"
              : "border-[#333] hover:border-[#555] bg-transparent"
          )}
          aria-label={isDone ? "Mark as not done" : "Mark as done"}
        >
          {isDone && (
            <svg viewBox="0 0 10 10" fill="none" className="w-2.5 h-2.5" aria-hidden>
              <path d="M1.5 5l2.5 2.5 4.5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title + menu */}
          <div className="flex items-start justify-between gap-2">
            <p className={clsx(
              "text-sm font-semibold leading-snug",
              isDone ? "line-through text-[#444]" : "text-[#e5e5e5]"
            )}>
              {task.title}
            </p>

            <div className="relative flex-shrink-0">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="w-5 h-5 flex items-center justify-center rounded text-[#444] hover:text-[#888] hover:bg-[#1e1e1e] transition-colors"
                aria-label="Task options"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
                </svg>
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-6 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg py-1 w-32 z-10 shadow-xl animate-fade-in" role="menu">
                  <button className="w-full text-left px-3 py-2 text-xs text-[#ccc] hover:bg-[#222] transition-colors"
                    onClick={() => { onMarkDone(); setMenuOpen(false); }} role="menuitem">
                    Mark done
                  </button>
                  <button className="w-full text-left px-3 py-2 text-xs text-[#f87171] hover:bg-[#1e1010] transition-colors"
                    onClick={() => { onDelete(); setMenuOpen(false); }} role="menuitem">
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className={clsx("inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold", statusCfg.className)}>
              {statusCfg.label}
            </span>

            {task.deadline && (
              <span className={clsx("text-xs", isAtRisk ? "text-[#fb923c]" : "text-[#555]")}>
                {formatDeadline(task.deadline)}
              </span>
            )}

            {task.scheduledStart && !isDone && (
              <span className="text-xs text-[#555]">
                {formatTime(task.scheduledStart)}
                {task.scheduledEnd && ` – ${formatTime(task.scheduledEnd)}`}
              </span>
            )}

            {task.estimatedMinutes && (
              <span className="text-xs text-[#444]">
                ~{task.estimatedMinutes >= 60 ? `${Math.round(task.estimatedMinutes/60)}h` : `${task.estimatedMinutes}m`}
              </span>
            )}
          </div>

          {/* Priority bar */}
          {task.priorityScore != null && !isDone && (
            <div className="mt-2.5">
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1 bg-[#2a2a2a] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${task.priorityScore}%`, backgroundColor: priorityColor }}
                  />
                </div>
                <span className="text-[11px] font-medium text-[#555] w-6 text-right">{task.priorityScore}</span>
              </div>
              {task.priorityReasoning && (
                <p className="text-[11px] text-[#444] mt-1.5 leading-relaxed">
                  {cleanReasoning(task.priorityReasoning)}
                </p>
              )}
            </div>
          )}

          {/* Approve button */}
          {showApprove && task.status === "inbox" && (
            <button
              onClick={handleApprove}
              disabled={approving}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2563eb] text-white text-xs font-semibold hover:bg-[#1d4ed8] transition-colors disabled:opacity-50"
            >
              {approving ? (
                <><span className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />Scheduling…</>
              ) : "Schedule"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
