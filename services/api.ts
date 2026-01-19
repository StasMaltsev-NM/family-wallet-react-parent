const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://family-wallet-api.maltsevstas21.workers.dev";
console.log("[api.ts loaded] API_URL =", API_URL);
type Json = Record<string, any>;

async function request<T>(
  path: string,
  options: RequestInit = {},
  inviteCode?: string
): Promise<T> {
  const url = `${API_URL}${path}`;

  // 1) Собираем headers правильно (работает и с объектом, и с Headers)
  const headers = new Headers(options.headers || undefined);

  // базовые
  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  // ключевое
  if (inviteCode) {
    headers.set("X-Invite-Code", inviteCode);
  }

  // 2) ЛОГИ ДО fetch (иначе при падении fetch ты их не увидишь)
  console.log("[API request]", url);
  console.log("[API invite]", inviteCode);
  console.log("[API headers]", Object.fromEntries(headers.entries()));

  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers,
    });
  } catch (e) {
    console.error("[API fetch failed]", url, e);
    throw e;
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status} ${res.statusText}: ${text || url}`);
  }

  return (await res.json()) as T;
}

// --- Parent API ---
export const parentApi = {
confirmTask(inviteCode: string, taskId: string, action: "confirm" | "reject") {
  return request<{ message: string; task?: any }>(
    "/api/tasks/confirm",
    {
      method: "POST",
      body: JSON.stringify({
        task_id: taskId,
        action, // "confirm" | "reject"
      }),
    },
    inviteCode
  );
},
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
  return request<{ message?: string; task: any }>(
    "/api/tasks/create",
    {
      method: "POST",
      body: JSON.stringify({
        status: "IDLE",   // ключевое: чтобы появилось у ребёнка в списке активных
        icon: "✅",
        ...payload,
      }),
    },
    inviteCode
  );
},
  whoami(inviteCode: string) { /* ... */ },
listChildren(inviteCode: string) {
  return request<{ children: any[] }>(
    "/api/children/list",
    { method: "GET" },
    inviteCode
  );
},
getTasks(inviteCode: string) {
  return request<{ tasks: any[] }>(
    "/api/tasks/list",
    { method: "GET" },
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