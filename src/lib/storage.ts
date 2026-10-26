/** Browser storage that never throws: private mode, quota or server rendering fall back quietly. */
export function safeGet<T>(key: string, fallback: T): T {
  try {
    const raw = globalThis.localStorage?.getItem(key);
    return raw == null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function safeSet(key: string, value: unknown): boolean {
  try {
    if (!globalThis.localStorage) return false;
    globalThis.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
