const API_URL = import.meta.env.VITE_API_URL;

type RawResult = {
  url: string;
  status: number;
  text: string;
};

function hasHeader(headers: HeadersInit | undefined, key: string) {
  if (!headers) return false;
  if (headers instanceof Headers) return headers.has(key);
  if (Array.isArray(headers)) return headers.some(([k]) => k.toLowerCase() === key.toLowerCase());
  return Object.keys(headers).some((k) => k.toLowerCase() === key.toLowerCase());
}

async function requestRaw(path: string, options: RequestInit = {}): Promise<RawResult> {
  if (!API_URL) throw new Error("VITE_API_URL is missing");

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.headers || {}),
    },
  });

  const text = await res.text();
  return { url: `${API_URL}${path}`, status: res.status, text };
}

// -------------------------
// PARENT API (invite-code auth)
// -------------------------

/**
 * PROBE: проверяем "жив ли" правильный роут для списка детей.
 * Тут НЕ Authorization.
 * Header X-Invite-Code: код семьи родителя (invite code).
 */
export async function probeParentChildren(inviteCode: string) {
  return requestRaw("/api/children/list", {
    method: "GET",
    headers: {
      "X-Invite-Code": inviteCode,
    },
  });
}

/**
 * Реальный метод: получить детей (то же самое, просто по смыслу)
 */
export async function getChildrenList(inviteCode: string) {
  const res = await probeParentChildren(inviteCode);

  // Попробуем распарсить JSON, но не падаем если вдруг не JSON
  try {
    const data = JSON.parse(res.text);
    return { ...res, data };
  } catch {
    return { ...res, data: null as any };
  }
}

/**
 * На будущее: универсальный JSON POST без лишнего preflight на GET.
 * Content-Type добавляем ТОЛЬКО если его не передали.
 */
export async function postJson<T>(
  path: string,
  inviteCode: string,
  body: any,
  options: RequestInit = {}
): Promise<RawResult> {
  const headers: Record<string, string> = {
    "X-Invite-Code": inviteCode,
  };

  // Content-Type ставим только если его нет
  const alreadyHasCT = hasHeader(options.headers, "Content-Type");
  if (!alreadyHasCT) headers["Content-Type"] = "application/json";

  return requestRaw(path, {
    method: "POST",
    ...options,
    headers: {
      ...headers,
      ...(options.headers || {}),
    },
    body: alreadyHasCT ? (options.body as any) : JSON.stringify(body),
  });
}