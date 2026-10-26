import { safeGet, safeSet } from "@/lib/storage";
import type { ApprovalStatus } from "@/types/run";

export interface StoredRun {
  id: string;
  toolSlug: string;
  createdAt: string;
  status: ApprovalStatus;
  output: unknown;
}

const MAX_RUNS = 20;
const key = (clientId: string) => `workbench:runs:${clientId}`;

export function listRuns(clientId: string): StoredRun[] {
  return safeGet<StoredRun[]>(key(clientId), []);
}

/** Inserts or replaces a run (newest first). Returns false if the browser would not store it. */
export function saveRun(clientId: string, run: StoredRun): boolean {
  const rest = listRuns(clientId).filter((r) => r.id !== run.id);
  return safeSet(key(clientId), [run, ...rest].slice(0, MAX_RUNS));
}
