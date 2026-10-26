import { beforeEach, describe, expect, it, vi } from "vitest";
import { listRuns, saveRun } from "@/services/runs";

beforeEach(() => {
  const data = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  });
});

const run = (id: string) => ({ id, toolSlug: "meeting-to-action", createdAt: "2026-10-26T00:00:00Z", status: "DRAFT" as const, output: {} });

describe("run history", () => {
  it("saves newest first per client", () => {
    saveRun("leveric", run("a"));
    saveRun("leveric", run("b"));
    saveRun("harbourside-accounting", run("c"));
    expect(listRuns("leveric").map((r) => r.id)).toEqual(["b", "a"]);
  });

  it("replaces a run with the same id (edit or approve)", () => {
    saveRun("leveric", run("a"));
    saveRun("leveric", { ...run("a"), status: "APPROVED" });
    expect(listRuns("leveric")).toHaveLength(1);
    expect(listRuns("leveric")[0].status).toBe("APPROVED");
  });

  it("keeps at most 20 runs", () => {
    for (let i = 0; i < 25; i++) saveRun("leveric", run(String(i)));
    expect(listRuns("leveric")).toHaveLength(20);
  });
});
