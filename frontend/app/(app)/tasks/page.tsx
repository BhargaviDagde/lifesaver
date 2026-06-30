"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  subscribeTasks,
  updateTaskStatus,
  deleteTask,
  Task,
  TaskStatus,
} from "@/lib/tasks";
import { TaskCard } from "@/components/TaskCard";

const STATUS_FILTERS: { value: TaskStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "inbox", label: "Inbox" },
  { value: "scheduled", label: "Scheduled" },
  { value: "in_progress", label: "In progress" },
  { value: "at_risk", label: "At risk" },
  { value: "done", label: "Done" },
  { value: "missed", label: "Missed" },
];

export default function TasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<TaskStatus | "all">("all");

  useEffect(() => {
    if (!user) return;
    return subscribeTasks(user.uid, setTasks);
  }, [user]);

  const filtered =
    filter === "all" ? tasks : tasks.filter((t) => t.status === filter);

  async function handleMarkDone(taskId: string) {
    if (!user) return;
    await updateTaskStatus(user.uid, taskId, "done");
  }

  async function handleDelete(taskId: string) {
    if (!user) return;
    await deleteTask(user.uid, taskId);
  }

  const counts: Record<string, number> = { all: tasks.length };
  for (const t of tasks) {
    counts[t.status] = (counts[t.status] ?? 0) + 1;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#1E2A3A]">Tasks</h1>
        <p className="text-[#6B7A8D] text-sm mt-0.5">
          {tasks.length} task{tasks.length !== 1 ? "s" : ""} total
        </p>
      </div>

      {/* Filter tabs */}
      <div
        className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0"
        role="tablist"
        aria-label="Filter tasks by status"
      >
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            role="tab"
            aria-selected={filter === f.value}
            onClick={() => setFilter(f.value)}
            className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-pill text-xs font-medium transition-colors
              ${
                filter === f.value
                  ? "bg-[#2D7DD2] text-white"
                  : "bg-white border border-[#E2E8F0] text-[#6B7A8D] hover:bg-[#EEF2F7]"
              }`}
          >
            {f.label}
            {counts[f.value] !== undefined && counts[f.value] > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                  filter === f.value ? "bg-white/20 text-white" : "bg-[#E2E8F0] text-[#6B7A8D]"
                }`}
              >
                {counts[f.value]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Task list */}
      {filtered.length === 0 ? (
        <div className="rounded-card border border-dashed border-[#E2E8F0] bg-white text-center py-12">
          <p className="font-medium text-[#1E2A3A] text-sm">
            {filter === "all" ? "No tasks yet." : `No ${filter.replace("_", " ")} tasks.`}
          </p>
          <p className="text-[#6B7A8D] text-sm mt-1">
            {filter === "all"
              ? "Add your first task from the dashboard."
              : "Switch to a different filter to see other tasks."}
          </p>
        </div>
      ) : (
        <div className="space-y-2" role="list" aria-label="Tasks">
          {filtered.map((t) => (
            <div key={t.id} role="listitem">
              <TaskCard
                task={t}
                onMarkDone={() => handleMarkDone(t.id)}
                onDelete={() => handleDelete(t.id)}
                highlight={t.status === "at_risk" ? "warning" : "normal"}
                showApprove={t.status === "inbox" && t.source === "gmail"}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
