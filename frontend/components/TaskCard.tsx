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
  inbox:       { label: "Inbox",       className: "bg-blue-50 text-blue-700" },
  scheduled:   { label: "Scheduled",   className: "bg-teal-50 text-teal-700" },
  in_progress: { label: "In progress", className: "bg-purple-50 text-purple-700" },
  done:        { label: "Done",        className: "bg-green-50 text-green-700" },
  at_risk:     { label: "At risk",     className: "bg-amber-50 text-amber-700" },
  missed:      { label: "Missed",      className: "bg-red-50 text-red-600" },
  dismissed:   { label: "Dismissed",   className: "bg-slate-50 text-slate-500" },
};

const CATEGORY_EMOJI: Record<string, string> = {
  assignment: "📝",
  bill: "💳",
  interview: "🎯",
  meeting: "👥",
  other: "📌",
};

function formatDeadline(date: Date): string {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (diff < 0) return "Overdue";
  if (hours < 1) return "Under an hour left";
  if (hours < 24) return `${hours}h left`;
  if (days === 1) return "Due tomorrow";
  return `Due ${date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function cleanReasoning(text: string): string {
  // Remove raw ISO timestamps — replace with friendly format
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

function PriorityBar({ score }: { score: number }) {
  const color = score >= 75 ? "#F6AE2D" : score >= 50 ? "#2D7DD2" : "#38B2AC";
  return (
    <div className="flex items-center gap-1.5" title={`Priority: ${score}/100`}>
      <div className="w-16 h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-[10px] font-medium" style={{ color }}>{score}</span>
    </div>
  );
}

export function TaskCard({ task, onMarkDone, onDelete, highlight, showApprove }: TaskCardProps) {
  const [approving, setApproving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const isAtRisk = task.status === "at_risk" || highlight === "warning";
  const isDone = task.status === "done";
  const statusCfg = STATUS_CONFIG[task.status];

  async function handleApprove() {
    setApproving(true);
    try { await approveTask(task.id); } catch { /* handled by onSnapshot */ }
    finally { setApproving(false); }
  }

  return (
    <article
      className={clsx(
        "bg-white rounded-xl border transition-all duration-150",
        "hover:shadow-md",
        isAtRisk
          ? "border-[#F6AE2D]/40 shadow-[0_0_0_1px_rgba(246,174,45,0.15)] bg-[#FFFEF7]"
          : "border-[#E8EDF3] shadow-sm",
        isDone && "opacity-55"
      )}
    >
      {/* At-risk accent stripe */}
      {isAtRisk && (
        <div className="h-0.5 bg-gradient-to-r from-[#F6AE2D] to-[#F6AE2D]/30 rounded-t-xl" />
      )}

      <div className="px-4 py-3.5 flex gap-3 items-start">
        {/* Checkbox */}
        <button
          onClick={onMarkDone}
          className={clsx(
            "flex-shrink-0 mt-0.5 w-5 h-5 rounded-full border-2 transition-all duration-150 flex items-center justify-center",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2D7DD2]",
            isDone
              ? "bg-[#38B2AC] border-[#38B2AC]"
              : "border-[#CBD5E1] hover:border-[#38B2AC] hover:bg-[#38B2AC]/5"
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
          {/* Title row */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2 min-w-0">
              {task.category && (
                <span className="text-sm mt-0.5 flex-shrink-0" aria-hidden>
                  {CATEGORY_EMOJI[task.category] ?? "📌"}
                </span>
              )}
              <p className={clsx(
                "text-sm font-semibold leading-snug",
                isDone ? "line-through text-[#94A3B8]" : "text-[#1E2A3A]"
              )}>
                {task.title}
              </p>
            </div>

            {/* Menu */}
            <div className="relative flex-shrink-0">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="w-6 h-6 flex items-center justify-center rounded-lg text-[#94A3B8] hover:bg-[#F1F5F9] hover:text-[#475569] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#2D7DD2]"
                aria-label="Task options"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
                </svg>
              </button>
              {menuOpen && (
                <div
                  className="absolute right-0 top-7 bg-white rounded-xl shadow-lg border border-[#E8EDF3] py-1 w-36 z-10 animate-fade-in"
                  role="menu"
                >
                  <button className="w-full text-left px-3 py-2 text-sm text-[#1E2A3A] hover:bg-[#F7F9FC] rounded-lg mx-auto"
                    onClick={() => { onMarkDone(); setMenuOpen(false); }} role="menuitem">
                    Mark done
                  </button>
                  <button className="w-full text-left px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg"
                    onClick={() => { onDelete(); setMenuOpen(false); }} role="menuitem">
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Meta chips */}
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {/* Status badge */}
            <span className={clsx("inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium", statusCfg.className)}>
              {statusCfg.label}
            </span>

            {/* Deadline */}
            {task.deadline && (
              <span className={clsx(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium",
                isAtRisk ? "bg-amber-50 text-amber-700" : "bg-slate-50 text-slate-600"
              )}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
                {formatDeadline(task.deadline)}
              </span>
            )}

            {/* Scheduled time */}
            {task.scheduledStart && !isDone && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-teal-50 text-teal-700">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                  <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                {formatTime(task.scheduledStart)}
                {task.scheduledEnd && ` – ${formatTime(task.scheduledEnd)}`}
              </span>
            )}

            {/* Duration */}
            {task.estimatedMinutes && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-50 text-slate-500">
                ~{task.estimatedMinutes >= 60
                  ? `${Math.round(task.estimatedMinutes / 60)}h`
                  : `${task.estimatedMinutes}min`}
              </span>
            )}
          </div>

          {/* Priority bar + reasoning */}
          {task.priorityScore != null && !isDone && (
            <div className="mt-2.5 space-y-1">
              <PriorityBar score={task.priorityScore} />
              {task.priorityReasoning && (
                <p className="text-[11px] text-[#64748B] leading-relaxed">
                  {cleanReasoning(task.priorityReasoning)}
                </p>
              )}
            </div>
          )}

          {/* Approve button for Gmail suggestions */}
          {showApprove && task.status === "inbox" && (
            <button
              onClick={handleApprove}
              disabled={approving}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2D7DD2] text-white text-xs font-medium hover:bg-[#2568B8] transition-colors disabled:opacity-50"
            >
              {approving ? (
                <><span className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" aria-hidden />Scheduling…</>
              ) : (
                <>Schedule this <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12h14M12 5l7 7-7 7"/></svg></>
              )}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
