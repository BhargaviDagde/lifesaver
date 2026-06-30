/**
 * API client — typed fetch wrapper for calls to the FastAPI backend.
 * Automatically attaches the Firebase ID token as a Bearer header.
 */

import { auth } from "./firebase";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:8080";

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public detail?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function getAuthHeader(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) return {};
  const token = await user.getIdToken();
  return { Authorization: `Bearer ${token}` };
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const authHeader = await getAuthHeader();

  const response = await fetch(`${BACKEND_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeader,
      ...options.headers,
    },
  });

  if (!response.ok) {
    let detail: unknown;
    try {
      detail = await response.json();
    } catch {
      detail = await response.text();
    }
    throw new ApiError(
      response.status,
      `API error ${response.status}: ${path}`,
      detail
    );
  }

  // 204 No Content
  if (response.status === 204) return undefined as T;

  return response.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Task endpoints
// ---------------------------------------------------------------------------

export interface CreateTaskResponse {
  status: string;
  message: string;
  taskId?: string;
  input?: string;
}

export async function createTask(
  text: string,
  source: "manual" | "voice" = "manual"
): Promise<CreateTaskResponse> {
  return request<CreateTaskResponse>("/tasks", {
    method: "POST",
    body: JSON.stringify({ text, source }),
  });
}

export async function patchTask(
  taskId: string,
  updates: Record<string, unknown>
): Promise<{ status: string; taskId: string }> {
  return request(`/tasks/${taskId}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export async function approveTask(
  taskId: string
): Promise<{ status: string; taskId: string }> {
  return request(`/tasks/${taskId}/approve`, { method: "POST" });
}

// ---------------------------------------------------------------------------
// Insights endpoint
// ---------------------------------------------------------------------------

export interface InsightsResponse {
  tasksCompleted: number;
  tasksMissed: number;
  onTimeRate: number;
  currentStreak: number;
  categoryBreakdown: Record<string, number>;
  recap: string;
  generatedAt: string;
}

export async function getInsights(): Promise<InsightsResponse> {
  return request<InsightsResponse>("/insights");
}

// ---------------------------------------------------------------------------
// Auth — OAuth connection
// ---------------------------------------------------------------------------

export function getOAuthConnectUrl(): string {
  return `${BACKEND_URL}/auth/google/authorize`;
}

export { ApiError };
