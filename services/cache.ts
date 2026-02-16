type CacheEnvelope<T> = {
  ts: number;
  data: T;
};

const CACHE_PREFIX = "fw_parent_cache_v1";

export function makeInviteScopedKey(scope: string, inviteCode: string): string {
  return `${CACHE_PREFIX}:${scope}:${inviteCode}`;
}

export function readSessionCache<T>(key: string, maxAgeMs: number): T | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEnvelope<T>;
    if (!parsed?.ts) return null;
    if (Date.now() - parsed.ts > maxAgeMs) return null;
    return parsed.data ?? null;
  } catch {
    return null;
  }
}

export function writeSessionCache<T>(key: string, data: T): void {
  try {
    const envelope: CacheEnvelope<T> = { ts: Date.now(), data };
    sessionStorage.setItem(key, JSON.stringify(envelope));
  } catch {
    // no-op
  }
}

export function removeSessionCache(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // no-op
  }
}
