/**
 * Task data layer — Firestore CRUD for tasks.
 * Simple operations (list, create, update, delete) go directly
 * frontend → Firestore via client SDK.
 * Agent-involved operations (AI pipeline, approvals) go via backend API.
 */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  QuerySnapshot,
  DocumentData,
} from "firebase/firestore";
import { db } from "./firebase";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TaskStatus =
  | "inbox"
  | "scheduled"
  | "in_progress"
  | "done"
  | "at_risk"
  | "missed"
  | "dismissed";

export type TaskCategory =
  | "assignment"
  | "bill"
  | "interview"
  | "meeting"
  | "other";

export interface Task {
  id: string;
  title: string;
  description?: string;
  source: "manual" | "voice" | "gmail";
  sourceRef?: string;
  deadline?: Date;
  estimatedMinutes?: number;
  category: TaskCategory;
  priorityScore?: number;
  priorityReasoning?: string;
  status: TaskStatus;
  calendarEventId?: string;
  scheduledStart?: Date;
  scheduledEnd?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toDate(val: unknown): Date | undefined {
  if (!val) return undefined;
  if (val instanceof Timestamp) return val.toDate();
  if (val instanceof Date) return val;
  return undefined;
}

function docToTask(id: string, data: DocumentData): Task {
  return {
    id,
    title: data.title ?? "",
    description: data.description,
    source: data.source ?? "manual",
    sourceRef: data.sourceRef,
    deadline: toDate(data.deadline),
    estimatedMinutes: data.estimatedMinutes,
    category: data.category ?? "other",
    priorityScore: data.priorityScore,
    priorityReasoning: data.priorityReasoning,
    status: data.status ?? "inbox",
    calendarEventId: data.calendarEventId,
    scheduledStart: toDate(data.scheduledStart),
    scheduledEnd: toDate(data.scheduledEnd),
    createdAt: toDate(data.createdAt) ?? new Date(),
    updatedAt: toDate(data.updatedAt) ?? new Date(),
  };
}

// ---------------------------------------------------------------------------
// Real-time listener
// ---------------------------------------------------------------------------

/**
 * Subscribe to all tasks for a user in real time.
 * Returns an unsubscribe function.
 */
export function subscribeTasks(
  uid: string,
  onChange: (tasks: Task[]) => void
): () => void {
  const q = query(
    collection(db, "users", uid, "tasks"),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(q, (snap: QuerySnapshot) => {
    const tasks = snap.docs.map((d) => docToTask(d.id, d.data()));
    onChange(tasks);
  });
}

// ---------------------------------------------------------------------------
// Subscribe to activity log
// ---------------------------------------------------------------------------

export interface ActivityEntry {
  id: string;
  agent: "intake" | "prioritizer" | "scheduler" | "monitor" | "insights";
  action: string;
  reasoning?: string;
  taskId?: string;
  createdAt: Date;
}

export function subscribeActivity(
  uid: string,
  onChange: (entries: ActivityEntry[]) => void,
  limitCount = 50
): () => void {
  const q = query(
    collection(db, "users", uid, "activity_log"),
    orderBy("createdAt", "desc"),
    limit(limitCount)
  );

  return onSnapshot(q, (snap: QuerySnapshot) => {
    const entries = snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        agent: data.agent,
        action: data.action,
        reasoning: data.reasoning,
        taskId: data.taskId,
        createdAt: toDate(data.createdAt) ?? new Date(),
      } as ActivityEntry;
    });
    onChange(entries);
  });
}

// ---------------------------------------------------------------------------
// Write operations (client-side, no agents)
// ---------------------------------------------------------------------------

/** Create a simple task directly in Firestore (no AI pipeline). */
export async function createTaskDirect(
  uid: string,
  data: {
    title: string;
    category?: TaskCategory;
    deadline?: Date;
    estimatedMinutes?: number;
    description?: string;
  }
): Promise<string> {
  const ref = await addDoc(collection(db, "users", uid, "tasks"), {
    title: data.title,
    description: data.description ?? "",
    source: "manual",
    category: data.category ?? "other",
    deadline: data.deadline ? Timestamp.fromDate(data.deadline) : null,
    estimatedMinutes: data.estimatedMinutes ?? null,
    status: "inbox",
    priorityScore: null,
    priorityReasoning: null,
    calendarEventId: null,
    scheduledStart: null,
    scheduledEnd: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

/** Update a task's status (e.g. mark done). */
export async function updateTaskStatus(
  uid: string,
  taskId: string,
  status: TaskStatus
): Promise<void> {
  await updateDoc(doc(db, "users", uid, "tasks", taskId), {
    status,
    updatedAt: serverTimestamp(),
  });
}

/** Update arbitrary task fields. */
export async function updateTask(
  uid: string,
  taskId: string,
  updates: Partial<Omit<Task, "id" | "createdAt">>
): Promise<void> {
  const payload: Record<string, unknown> = { ...updates, updatedAt: serverTimestamp() };
  // Convert Date fields to Timestamps
  if (updates.deadline) payload.deadline = Timestamp.fromDate(updates.deadline);
  if (updates.scheduledStart) payload.scheduledStart = Timestamp.fromDate(updates.scheduledStart);
  if (updates.scheduledEnd) payload.scheduledEnd = Timestamp.fromDate(updates.scheduledEnd);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await updateDoc(doc(db, "users", uid, "tasks", taskId), payload as any);
}

/** Delete a task. */
export async function deleteTask(uid: string, taskId: string): Promise<void> {
  await deleteDoc(doc(db, "users", uid, "tasks", taskId));
}
