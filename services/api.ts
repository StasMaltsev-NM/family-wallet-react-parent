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
  getTasks(inviteCode: string) {
    return request<{ tasks: any[] }>("/api/tasks/list", { method: "GET" }, inviteCode);
  },

  confirmTask(inviteCode: string, taskId: string, action: "confirm" | "reject") {
    return request<{ message: string; status: string; new_balance?: number }>(
      "/api/tasks/confirm",
      {
        method: "POST",
        body: JSON.stringify({ task_id: taskId, action }),
      },
      inviteCode
    );
  },

  whoami(inviteCode: string) {
    return request<any>("/api/auth/whoami", { method: "GET" }, inviteCode);
  },

  // список детей (для родителя)
  listChildren(inviteCode: string) {
    return request<{ children: any[] }>("/api/children/list", { method: "GET" }, inviteCode);
  },

  // детали ребёнка
  getChild(inviteCode: string, childId: string) {
    return request<{ child: any }>(`/api/children/${childId}`, { method: "GET" }, inviteCode);
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