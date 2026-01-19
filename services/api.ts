const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://family-wallet-api.maltsevstas21.workers.dev";

type Json = Record<string, any>;

async function request<T>(
  path: string,
  options: RequestInit = {},
  inviteCode?: string
): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string> | undefined),
  };

  if (inviteCode) headers["X-Invite-Code"] = inviteCode;
  if (!headers["Content-Type"] && options.method && options.method !== "GET") {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const msg =
      (data && (data.error || data.message)) || `HTTP ${res.status}: ${text}`;
    throw new Error(msg);
  }

  return data as T;
}

// --- Parent API ---
export const parentApi = {
  getTasks(inviteCode: string) { /* ... */ },
  confirmTask(inviteCode: string, taskId: string, action: string) { /* ... */ },
  whoami(inviteCode: string) { /* ... */ },
  listChildren(inviteCode: string) { /* ... */ },
  getChild(inviteCode: string, childId: string) { /* ... */ },

  // ✅ Создать задачу в backend (чтобы она появилась у ребенка)
  createTask(
    inviteCode: string,
    payload: {
      child_id: string;
      title: string;
      description?: string;
      reward_amount: number;
      icon?: string;
      status?: "IDLE" | "WAITING";
      recurring?: any;
      recurring_days?: any;
    }
  ) {
    return request<{ task: any; status?: string }>(
      "/api/tasks/create",
      {
        method: "POST",
        body: JSON.stringify({
          status: "WAITING",
          icon: "✅",
          ...payload,
        }),
      },
      inviteCode
    );
  },
};
// --- Kid API ---
export const kidApi = {
  getTasks(inviteCode: string) {
    return request<{ tasks: any[] }>("/api/tasks/list", { method: "GET" }, inviteCode);
  },

  completeTask(inviteCode: string, taskId: string) {
    return request<{ message: string; status: string; pending_reward?: number }>(
      "/api/tasks/complete",
      {
        method: "POST",
        body: JSON.stringify({ task_id: taskId }),
      },
      inviteCode
    );
  },

  whoami(inviteCode: string) {
    return request<any>("/api/auth/whoami", { method: "GET" }, inviteCode);
  },
};