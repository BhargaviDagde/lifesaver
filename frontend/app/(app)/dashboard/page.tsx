"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";
import {
  subscribeTasks,
  updateTaskStatus,
  deleteTask,
  Task,
} from "@/lib/tasks";
import { createTask, triggerGmailScan } from "@/lib/api";
import { TaskCard } from "@/components/TaskCard";

export default function DashboardPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskInput, setTaskInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gmailConnected, setGmailConnected] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Real-time task subscription
  useEffect(() => {
    if (!user) return;
    const unsub = subscribeTasks(user.uid, setTasks);
    return unsub;
  }, [user]);

  // Listen to user profile for Gmail connected status
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) {
        setGmailConnected(snap.data().gmailConnected ?? false);
      }
    });
    return unsub;
  }, [user]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Derived lists
  const atRiskTasks = tasks.filter((t) => t.status === "at_risk");
  const todayTasks = tasks.filter((t) => {
    if (t.status === "done" || t.status === "dismissed" || t.status === "missed") return false;
    if (t.scheduledStart) {
      const start = new Date(t.scheduledStart);
      return start >= today && start < tomorrow;
    }
    return false;
  });
  const inboxTasks = tasks.filter((t) => t.status === "inbox");

  async function handleAddTask(e: React.FormEvent) {
    e.preventDefault();
    const title = taskInput.trim();
    if (!title || !user) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await createTask(title, "manual");
      if (result.status === "needs_clarification") {
        setError(`Need more info: ${result.message}`);
      } else {
        setTaskInput("");
        inputRef.current?.focus();
      }
    } catch (err) {
      console.error("Backend task creation failed:", err);
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(`Couldn't add task: ${msg}. Is the backend running?`);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleScanGmail() {
    setScanning(true);
    setScanMsg(null);
    try {
      await triggerGmailScan();
      setScanMsg("Scanning your inbox… tasks will appear here in ~20 seconds.");
      setTimeout(() => setScanMsg(null), 20000);
    } catch {
      setScanMsg("Scan failed. Make sure Gmail is connected in Settings.");
    } finally {
      setScanning(false);
    }
  }

  async function handleMarkDone(taskId: string) {
    if (!user) return;
    await updateTaskStatus(user.uid, taskId, "done");
  }

  async function handleDelete(taskId: string) {
    if (!user) return;
    await deleteTask(user.uid, taskId);
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[#1E2A3A]">Today</h1>
        <p className="text-[#6B7A8D] text-sm mt-0.5">
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
          ref={inputRef}
          type="text"
          value={taskInput}
          onChange={(e) => setTaskInput(e.target.value)}
          placeholder='Add a task — e.g. "essay due Friday, 3 hours"'
          className="flex-1 border border-[#E2E8F0] rounded-lg px-4 py-2.5 text-sm bg-white
                     placeholder-[#6B7A8D] focus-visible:outline-none focus-visible:ring-2
                     focus-visible:ring-[#2D7DD2]"
          aria-label="New task"
          disabled={submitting}
        />
        <button
          type="button"
          className="btn-secondary px-3"
          aria-label="Voice input — coming in Phase 5"
          title="Voice input coming soon"
        >
          <MicIcon />
        </button>
        <button
          type="submit"
          className="btn-primary"
          disabled={submitting || !taskInput.trim()}
        >
          {submitting ? (
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden />
              Adding…
            </span>
          ) : "Add"}
        </button>
      </form>
      {error && <p role="alert" className="text-red-600 text-sm -mt-4">{error}</p>}

      {/* At-risk */}
      {atRiskTasks.length > 0 && (
        <section aria-labelledby="atrisk-heading">
          <SectionHeader id="atrisk-heading" label="Needs attention" />
          <div className="space-y-2">
            {atRiskTasks.map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                onMarkDone={() => handleMarkDone(t.id)}
                onDelete={() => handleDelete(t.id)}
                highlight="warning"
              />
            ))}
          </div>
        </section>
      )}

      {/* Scheduled today */}
      <section aria-labelledby="today-heading">
        <SectionHeader id="today-heading" label="Scheduled today" />
        {todayTasks.length === 0 ? (
          <EmptyState
            title="Nothing scheduled yet."
            body='Add a task above and Life Saver will find time for it. Try: "finish lab report by Thursday, 2 hours"'
          />
        ) : (
          <div className="space-y-2">
            {todayTasks.map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                onMarkDone={() => handleMarkDone(t.id)}
                onDelete={() => handleDelete(t.id)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Gmail inbox suggestions */}
      {/* Gmail inbox suggestions */}
      <section aria-labelledby="inbox-heading">
        <div className="flex items-center justify-between mb-3">
          <h2 id="inbox-heading" className="text-xs font-semibold uppercase tracking-wider text-[#6B7A8D]">
            Suggested from email
          </h2>
          {gmailConnected && (
            <button
              onClick={handleScanGmail}
              disabled={scanning}
              className="text-xs text-[#2D7DD2] font-medium hover:underline disabled:opacity-50 flex items-center gap-1"
            >
              {scanning ? (
                <><span className="w-3 h-3 border border-[#2D7DD2] border-t-transparent rounded-full animate-spin" />Scanning…</>
              ) : "Scan now"}
            </button>
          )}
        </div>
        {scanMsg && <p className="text-xs text-[#38B2AC] mb-2">{scanMsg}</p>}

        {inboxTasks.length > 0 ? (
          <div className="space-y-2">
            {inboxTasks.map((t) => (
              <TaskCard key={t.id} task={t} onMarkDone={() => handleMarkDone(t.id)} onDelete={() => handleDelete(t.id)} showApprove />
            ))}
          </div>
        ) : gmailConnected ? (
          <EmptyState title="No email suggestions yet." body="Click 'Scan now' to check your inbox for deadline emails." />
        ) : (
          <EmptyState
            title="No suggestions yet."
            body="Connect Gmail in Settings and Life Saver will surface deadline emails here for one-tap approval."
            action={<Link href="/settings" className="text-[#2D7DD2] text-sm font-medium hover:underline">Connect Gmail →</Link>}
          />
        )}
      </section>

      {scanMsg && (
        <p className="text-xs text-[#38B2AC] text-center py-2 animate-fade-in">{scanMsg}</p>
      )}
    </div>
  );
}

function SectionHeader({ id, label }: { id: string; label: string }) {
  return (
    <h2
      id={id}
      className="text-xs font-semibold uppercase tracking-wider text-[#6B7A8D] mb-3"
    >
      {label}
    </h2>
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
    <div className="rounded-card border border-dashed border-[#E2E8F0] bg-white text-center py-8 px-4">
      <p className="font-medium text-[#1E2A3A] text-sm">{title}</p>
      <p className="text-[#6B7A8D] text-sm mt-1 max-w-sm mx-auto leading-relaxed">{body}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

function MicIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" x2="12" y1="19" y2="22" />
    </svg>
  );
}
