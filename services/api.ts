const API_URL =
  import.meta.env.VITE_API_URL ||
  "https://family-wallet-api.maltsevstas21.workers.dev";
console.log("[api.ts loaded] API_URL =", API_URL);
type Json = Record<string, any>;
const GET_REQUEST_TIMEOUT_MS = 12000;
const WRITE_REQUEST_TIMEOUT_MS = 30000;
const REGENERATE_IMAGE_TIMEOUT_MS = 120000;
const GET_RETRY_COUNT = 2;
const RETRY_BASE_DELAY_MS = 700;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === "AbortError";
}

function isLikelyNetworkError(err: unknown): boolean {
  if (isAbortError(err)) return true;
  if (!(err instanceof Error)) return false;
  const msg = String(err.message || "").toLowerCase();
  return (
    msg.includes("load failed") ||
    msg.includes("fetch failed") ||
    msg.includes("networkerror") ||
    msg.includes("network request failed") ||
    msg.includes("failed to fetch")
  );
}

function isRetriableStatus(status: number): boolean {
  return [408, 425, 429, 500, 502, 503, 504, 520, 522, 524].includes(status);
}

function makeNetworkError(err: unknown): Error {
  if (isAbortError(err)) {
    return new Error(
      "NETWORK_TIMEOUT: Сервер отвечает слишком долго. Проверьте VPN/сеть и повторите."
    );
  }
  return new Error(
    "NETWORK_UNREACHABLE: Нет стабильного соединения с API. Проверьте VPN/интернет и повторите."
  );
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

function getRequestTimeoutMs(path: string, method: string): number {
  if (path === "/api/rewards/regenerate-image") return REGENERATE_IMAGE_TIMEOUT_MS;
  if (method === "GET") return GET_REQUEST_TIMEOUT_MS;
  return WRITE_REQUEST_TIMEOUT_MS;
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  inviteCode?: string
): Promise<T> {
  const isGet = String(options.method ?? "GET").toUpperCase() === "GET";
  const url = isGet
    ? `${API_URL}${path}${path.includes("?") ? "&" : "?"}ts=${Date.now()}`
    : `${API_URL}${path}`;
  
  const headers = new Headers(options.headers || undefined);

  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (inviteCode) {
    headers.set("X-Invite-Code", inviteCode);
  }

  console.log("[API request]", url);
  console.log("[API invite]", inviteCode);
  console.log("[API headers]", Object.fromEntries(headers.entries()));

  const method = String(options.method ?? "GET").toUpperCase();
  const canRetryPostAuth = method === "POST" && path === "/api/auth/telegram";
  const maxAttempts = method === "GET" || canRetryPostAuth ? GET_RETRY_COUNT + 1 : 1;
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const res = await fetchWithTimeout(
        url,
        {
          ...options,
          headers,
          cache: method === "GET" ? "no-store" : options.cache,
        },
        getRequestTimeoutMs(path, method)
      );

      if (!res.ok) {
        if (attempt < maxAttempts && isRetriableStatus(res.status)) {
          await sleep(RETRY_BASE_DELAY_MS * attempt);
          continue;
        }
        const text = await res.text().catch(() => "");
        throw new Error(`API ${res.status} ${res.statusText}: ${text || url}`);
      }

      return (await res.json()) as T;
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts && isLikelyNetworkError(err)) {
        await sleep(RETRY_BASE_DELAY_MS * attempt);
        continue;
      }
      if (isLikelyNetworkError(err)) {
        console.error("[API network failed]", url, err);
        throw makeNetworkError(err);
      }
      console.error("[API fetch failed]", url, err);
      throw err;
    }
  }

  throw makeNetworkError(lastError);
}

// --- Parent API ---
export const parentApi = {
  confirmTask(inviteCode: string, taskId: string, action: "confirm" | "reject") {
    return request<{ message: string; task?: any; child?: any }>(
      "/api/tasks/confirm",
      {
        method: "POST",
        body: JSON.stringify({ task_id: taskId, action }),
      },
      inviteCode
    ).then((r) => {
      console.log("[confirmTask response]", r);
      return r;
    });
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
          status: "IDLE",
          icon: "✅",
          ...payload,
        }),
      },
      inviteCode
    );
  },

  deleteTask(inviteCode: string, taskId: string) {
    return request<{ message: string }>(
      "/api/tasks/delete",
      {
        method: "DELETE",
        body: JSON.stringify({ task_id: taskId }),
      },
      inviteCode
    );
  },

  whoami(inviteCode: string) {
    return request<any>("/api/auth/whoami", { method: "GET" }, inviteCode);
  },

  listChildren(inviteCode: string) {
    return request<{ children: any[] }>(
      "/api/children/list",
      { method: "GET" },
      inviteCode
    );
  },

  deleteChild(inviteCode: string, childId: string) {
    return request<{ message: string }>(
      "/api/children/delete",
      {
        method: "DELETE",
        body: JSON.stringify({ child_id: childId }),
      },
      inviteCode
    );
  },

  addChild(inviteCode: string, payload: {
    name: string;
    role: string;
    age: number;
    gender?: string;
    avatar: string;
    dream_title?: string;
    dream_price?: number;
    dream_image?: string;
    ai_description?: string;
  }) {
    return request<{ message: string; child_id: string }>(
      "/api/children/add",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
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

  createReward(
    inviteCode: string,
    childId: string,
    title: string,
    price: number,
    description?: string,
    isPermanent: boolean = true
  ) {
    return request<{ reward_id: string }>("/api/rewards/create", {
      method: "POST",
      body: JSON.stringify({
        child_id: childId,
        title,
        price,
        description: description || '',
        icon: '🎁',
        is_permanent: isPermanent ? 1 : 0
      }),
    }, inviteCode);
  },

  createRewardsBatch(
    inviteCode: string,
    childIds: string[],
    title: string,
    price: number,
    description?: string,
    isPermanent: boolean = true
  ) {
    return request<{ reward_id?: string; reward_ids?: string[]; message?: string }>("/api/rewards/create", {
      method: "POST",
      body: JSON.stringify({
        child_ids: childIds,
        title,
        price,
        description: description || '',
        icon: '🎁',
        is_permanent: isPermanent ? 1 : 0
      }),
    }, inviteCode);
  },

  listRewards(inviteCode: string) {
    return request<{ rewards: any[] }>("/api/rewards/list", {
      method: "GET",
    }, inviteCode);
  },

  deliverReward(inviteCode: string, rewardId: string, childId: string) {
    return request<{ message: string }>("/api/rewards/deliver", {
      method: "POST",
      body: JSON.stringify({ reward_id: rewardId, child_id: childId }),
    }, inviteCode);
  },

  deleteReward(inviteCode: string, rewardId: string) {
    return request<{ message: string }>("/api/rewards/delete", {
      method: "DELETE",
      body: JSON.stringify({ reward_id: rewardId }),
    }, inviteCode);
  },

  regenerateRewardImage(inviteCode: string, rewardId: string) {
    return request<{ message: string; reward_id: string; title: string; image_ready: boolean; previous_image_kept?: boolean }>("/api/rewards/regenerate-image", {
      method: "POST",
      body: JSON.stringify({ reward_id: rewardId }),
    }, inviteCode);
  },

  getFamilyPurchases(inviteCode: string) {
    return request<{ purchases: any[] }>("/api/rewards/purchases/family", {
      method: "GET",
    }, inviteCode);
  },

  getHistory(inviteCode: string) {
  console.log("[getHistory] CALLING API...");  // ← ДОБАВЬ ЭТО!
  return request<any>("/api/history", { method: "GET" }, inviteCode)
    .then(r => {
      console.log("[getHistory] SUCCESS:", r);  // ← И ЭТО!
      return r;
    })
    .catch(e => {
      console.error("[getHistory] ERROR:", e);  // ← И ЭТО!
      throw e;
    });
},

  getFamilyCodes(inviteCode: string) {
    return request<{
      parentCode: string;
      partnerCode: string | null;
      friendCodes: string[];
    }>(
      "/api/family/codes",
      {
        method: "GET",
      },
      inviteCode
    );
  },

  getPendingDreams(inviteCode: string) {
    return request<{ dreams: any[] }>(
      "/api/dreams/pending",
      {
        method: "GET",
      },
      inviteCode
    );
  },

  getActiveDreams(inviteCode: string) {
    return request<{ dreams: any[] }>(
      "/api/dreams/active",
      {
        method: "GET",
      },
      inviteCode
    );
  },

  getMyDream(inviteCode: string) {
    return request<{ dream?: any }>(
      "/api/dreams/my",
      {
        method: "GET",
      },
      inviteCode
    );
  },

  setDreamGoal(inviteCode: string, dreamId: string, targetAmount: number) {
    return request<{ message: string }>(
      "/api/dreams/set-goal",
      {
        method: "POST",
        body: JSON.stringify({
          dream_id: dreamId,
          target_amount: targetAmount,
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

  getHistory(inviteCode: string) {
    return request<any>("/api/history", { method: "GET" }, inviteCode);
  },
};
// --- Auth API ---
export const authApi = {
  authenticateWithTelegram(initData: string, inviteCode?: string) {
    return request<{
      status: 'authenticated' | 'needs_invite' | 'create_family';
      family_id?: string;
      invite_code?: string;
      family_name?: string;
      tg_user_id?: string;
    }>('/api/auth/telegram', {
      method: 'POST',
      body: JSON.stringify({ initData, inviteCode })
    });
  }
};
