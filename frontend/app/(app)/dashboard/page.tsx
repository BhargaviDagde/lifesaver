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

  useEffect(() => {
    if (!user) return;
    return subscribeTasks(user.uid, setTasks);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    return onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) setGmailConnected(snap.data().gmailConnected ?? false);
    });
  }, [user]);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const atRiskTasks = tasks.filter((t) => t.status === "at_risk");
  const todayTasks = tasks.filter((t) => {
    if (["done","dismissed","missed"].includes(t.status)) return false;
    if (t.scheduledStart) {
      const s = new Date(t.scheduledStart);
      return s >= today && s < tomorrow;
    }
    return false;
  });
  const inboxTasks = tasks.filter((t) => t.status === "inbox");

  // Stats
  const avgPriority = todayTasks.length
    ? Math.round(todayTasks.reduce((s, t) => s + (t.priorityScore ?? 0), 0) / todayTasks.length)
    : 0;
  const nextDue = tasks
    .filter((t) => t.deadline && !["done","dismissed","missed"].includes(t.status))
    .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())[0];
  const nextDueHours = nextDue?.deadline
    ? Math.max(0, Math.round((new Date(nextDue.deadline).getTime() - Date.now()) / 3600000))
    : null;

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Today</h1>
          <p className="text-[#555] text-sm mt-0.5">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#2e1b5e] text-[#a78bfa] text-xs font-semibold border border-[#3b2875]">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
          AI prioritized
        </span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3">
        <StatCard label="Tasks today" value={todayTasks.length} />
        <StatCard label="Avg priority" value={todayTasks.length ? `${avgPriority}/100` : "—"} />
        <StatCard label="Suggested" value={inboxTasks.length} />
        <StatCard label="Next due" value={nextDueHours !== null ? `${nextDueHours}h` : "—"} />
      </div>

      {/* Quick-add */}
      <form onSubmit={handleAddTask} className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={taskInput}
          onChange={(e) => setTaskInput(e.target.value)}
          placeholder='Add a task — e.g. "essay due Friday, 3 hours"'
          className="input flex-1"
          aria-label="New task"
          disabled={submitting}
        />
        <button
          type="button"
          className="btn-secondary px-3"
          aria-label="Voice input"
          title="Voice input coming soon"
        >
          <MicIcon />
        </button>
        <button type="submit" className="btn-primary px-5" disabled={submitting || !taskInput.trim()}>
          {submitting ? (
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              Adding…
            </span>
          ) : "Add"}
        </button>
      </form>
      {error && <p role="alert" className="text-[#f87171] text-xs -mt-4">{error}</p>}

      {/* At risk */}
      {atRiskTasks.length > 0 && (
        <section aria-labelledby="atrisk-heading">
          <SectionHeader id="atrisk-heading" label="Needs attention" />
          <div className="space-y-2">
            {atRiskTasks.map((t) => (
              <TaskCard key={t.id} task={t} onMarkDone={() => handleMarkDone(t.id)} onDelete={() => handleDelete(t.id)} highlight="warning" />
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
            body='Add a task above and Life Saver will find time for it.'
          />
        ) : (
          <div className="space-y-2">
            {todayTasks.map((t) => (
              <TaskCard key={t.id} task={t} onMarkDone={() => handleMarkDone(t.id)} onDelete={() => handleDelete(t.id)} />
            ))}
          </div>
        )}
      </section>

      {/* Gmail suggestions */}
      <section aria-labelledby="inbox-heading">
        <div className="flex items-center justify-between mb-3">
          <h2 id="inbox-heading" className="text-xs font-semibold uppercase tracking-widest text-[#555]">
            Suggested from email
          </h2>
          {gmailConnected && (
            <button
              onClick={handleScanGmail}
              disabled={scanning}
              className="text-xs text-[#2563eb] font-medium hover:text-[#60a5fa] disabled:opacity-50 flex items-center gap-1 transition-colors"
            >
              {scanning ? (
                <><span className="w-3 h-3 border border-[#2563eb] border-t-transparent rounded-full animate-spin" />Scanning…</>
              ) : "Scan now"}
            </button>
          )}
        </div>
        {scanMsg && <p className="text-xs text-[#4ade80] mb-2">{scanMsg}</p>}

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
            body="Connect Gmail in Settings and Life Saver will surface deadline emails here."
            action={<Link href="/settings" className="text-[#2563eb] text-xs font-medium hover:underline">Connect Gmail →</Link>}
          />
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-[#141414] border border-[#2a2a2a] rounded-xl px-4 py-3.5">
      <p className="text-[#555] text-[11px] font-medium mb-1.5">{label}</p>
      <p className="text-white text-xl font-bold leading-none">{value}</p>
    </div>
  );
}

function SectionHeader({ id, label }: { id: string; label: string }) {
  return (
    <h2 id={id} className="text-xs font-semibold uppercase tracking-widest text-[#555] mb-3">{label}</h2>
  );
}

function EmptyState({ title, body, action }: { title: string; body: string; action?: React.ReactNode }) {
  return (
    <div className="border border-dashed border-[#2a2a2a] rounded-xl text-center py-8 px-4">
      <p className="text-[#555] text-sm font-medium">{title}</p>
      <p className="text-[#444] text-xs mt-1 max-w-sm mx-auto leading-relaxed">{body}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

function MicIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
      <line x1="12" x2="12" y1="19" y2="22"/>
    </svg>
  );
}
