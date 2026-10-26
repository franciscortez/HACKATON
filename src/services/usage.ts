import { safeGet, safeSet } from "@/lib/storage";

/** Fired on window after a run is counted so the run counter refreshes. */
export const USAGE_EVENT = "workbench:usage";

const key = (clientId: string, now: Date) => `workbench:usage:${clientId}:${now.toISOString().slice(0, 7)}`;

export function getUsage(clientId: string, now: Date): number {
  return safeGet<number>(key(clientId, now), 0);
}

export function incrementUsage(clientId: string, now: Date): number {
  const next = getUsage(clientId, now) + 1;
  safeSet(key(clientId, now), next);
  if (typeof window !== "undefined") window.dispatchEvent(new Event(USAGE_EVENT));
  return next;
}
