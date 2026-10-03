import { Memory, MemoryStatus, AnalyzeResponse, SystemHealth, Insight } from "@/types";

export interface DetailedHealth {
  status: string;
  app: string;
  database: string;
  ollama: {
    available: boolean;
    host: string;
    model_configured: string;
    model_present: boolean;
  };
}

export class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

/**
 * Returns dynamic API Base URL, checking for desktop Electron injection.
 */
export function getApiBase(): string {
  if (typeof window !== "undefined") {
    const win = window as unknown as { __FRIEND_OS_API_URL__?: string };
    if (win.__FRIEND_OS_API_URL__) {
      return win.__FRIEND_OS_API_URL__;
    }
  }
  return process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
}

/**
 * Checks if the FRIEND.OS backend is online and running.
 */
export async function checkBackendHealth(): Promise<SystemHealth> {
  const res = await fetch(`${getApiBase()}/`, {
    cache: "no-store",
    signal: AbortSignal.timeout(4000),
  });
  if (!res.ok) {
    throw new ApiError(`Health check failed with status: ${res.status}`, res.status);
  }
  return res.json();
}

/**
 * Fetches detailed system health including Ollama and local model availability.
 */
export async function getDetailedHealth(): Promise<DetailedHealth> {
  const res = await fetch(`${getApiBase()}/health`, {
    cache: "no-store",
    signal: AbortSignal.timeout(4000),
  });
  if (!res.ok) {
    throw new ApiError(`Detailed health check failed with status: ${res.status}`, res.status);
  }
  return res.json();
}

/**
 * Fetches memories with optional text search and status filter.
 */
export async function getMemories(search?: string, status?: string): Promise<Memory[]> {
  const url = new URL(`${getApiBase()}/memories`);
  if (search && search.trim()) {
    url.searchParams.set("search", search.trim());
  }
  if (status && status !== "all") {
    url.searchParams.set("status", status);
  }

  const res = await fetch(url.toString(), {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new ApiError(`Failed to fetch memories: ${res.statusText}`, res.status);
  }
  return res.json();
}

/**
 * Stores a new memory into SQLite persistent storage with optional commitment metadata.
 */
export async function createMemory(
  content: string,
  memory_type: string = "general",
  status: MemoryStatus = "active",
  task?: string | null,
  dependency?: string | null,
  deadline?: string | null
): Promise<Memory> {
  const payload: Record<string, unknown> = { content, memory_type, status };
  if (task) payload.task = task;
  if (dependency) payload.dependency = dependency;
  if (deadline) payload.deadline = deadline;

  const res = await fetch(`${getApiBase()}/memories`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new ApiError(errorData.detail || "Failed to create memory", res.status);
  }
  return res.json();
}

/**
 * Updates the status of an existing memory.
 */
export async function updateMemoryStatus(
  id: number,
  status: MemoryStatus
): Promise<Memory> {
  const res = await fetch(`${getApiBase()}/memories/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new ApiError(errorData.detail || "Failed to update memory status", res.status);
  }
  return res.json();
}

/**
 * Permanently deletes a memory from SQLite storage.
 */
export async function deleteMemory(id: number): Promise<void> {
  const res = await fetch(`${getApiBase()}/memories/${id}`, {
    method: "DELETE",
  });
  if (!res.ok && res.status !== 204) {
    const errorData = await res.json().catch(() => ({}));
    throw new ApiError(errorData.detail || "Failed to delete memory", res.status);
  }
}

/**
 * Sends text to Qwen3 via Ollama for structured analysis.
 */
export async function analyzeText(text: string): Promise<AnalyzeResponse> {
  const res = await fetch(`${getApiBase()}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new ApiError(
      errorData.detail || "Failed to analyze text with Qwen3 4B",
      res.status
    );
  }
  return res.json();
}

/**
 * Fetches proactive unblocked insights: "What Am I Forgetting?".
 */
export async function getInsights(): Promise<Insight[]> {
  const res = await fetch(`${getApiBase()}/insights`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new ApiError(`Failed to fetch insights: ${res.statusText}`, res.status);
  }
  return res.json();
}

/**
 * Marks a commitment as completed.
 */
export async function completeCommitment(id: number): Promise<void> {
  const res = await fetch(`${getApiBase()}/commitments/${id}/complete`, {
    method: "PATCH",
  });
  if (!res.ok) {
    throw new ApiError(`Failed to mark commitment completed`, res.status);
  }
}

/**
 * Dismisses an unblocked insight (archives commitment).
 */
export async function dismissCommitment(id: number): Promise<void> {
  const res = await fetch(`${getApiBase()}/commitments/${id}/dismiss`, {
    method: "PATCH",
  });
  if (!res.ok) {
    throw new ApiError(`Failed to dismiss insight`, res.status);
  }
}

/**
 * Resets all demo-tagged memories and commitments from SQLite.
 */
export async function resetDemoData(): Promise<{ memories_deleted: number; commitments_deleted: number }> {
  const res = await fetch(`${getApiBase()}/demo/reset`, {
    method: "POST",
  });
  if (!res.ok) {
    throw new ApiError(`Failed to reset demo data`, res.status);
  }
  const data = await res.json();
  return data.deleted;
}

/**
 * Permanently deletes all memories and commitments from the database.
 */
export async function resetDatabase(): Promise<{ memories_deleted: number; commitments_deleted: number }> {
  const res = await fetch(`${getApiBase()}/database/reset`, {
    method: "POST",
  });
  if (!res.ok) {
    throw new ApiError(`Failed to reset database`, res.status);
  }
  const data = await res.json();
  return data.deleted;
}

