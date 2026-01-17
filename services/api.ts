const API_URL = import.meta.env.VITE_API_URL;

type RawResult = {
  url: string;
  status: number;
  text: string;
};

async function requestRaw(path: string, options: RequestInit = {}): Promise<RawResult> {
  if (!API_URL) throw new Error("VITE_API_URL is missing");

  // ВАЖНО: не ставим Content-Type по умолчанию,
  // иначе браузер может сделать preflight (CORS) даже на GET.
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
    },
  });

  const text = await res.text();
  return { url: `${API_URL}${path}`, status: res.status, text };
}

/**
 * PROBE: проверяем, существует ли роут вообще.
 * Без Authorization => нет CORS preflight.
 */
export async function probeParentChildren() {
  return requestRaw("/api/parent/children", { method: "GET" });
}

/**
 * AUTH-CHECK (на потом):
 * Это будет падать CORS-ом, пока бэк не разрешит header Authorization.
 */
export async function pingParentApi(parentToken: string) {
  return requestRaw("/api/parent/children", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${parentToken}`,
    },
  });
}