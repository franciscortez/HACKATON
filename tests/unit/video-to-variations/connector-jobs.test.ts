import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { afterEach, expect, it, vi } from "vitest";
import { createWorkspace } from "@/features/video-to-variations/services/workspace";
import { emptyTimeline } from "@/features/video-to-variations/services/timeline";
import { operationContext } from "@/features/video-to-variations/services/operation-context";
import { readOperation, beginOperation } from "@/features/video-to-variations/services/operations";
let root: string;
afterEach(async () => { vi.unstubAllEnvs(); if (root) await rm(root, { recursive: true, force: true }); });
it("recovers a committed edit when completion was not recorded", async () => {
  root = await mkdtemp(join(tmpdir(), "connector-jobs-")); vi.stubEnv("VIDEO_WORKSPACE", root);
  const ws = createWorkspace(root); const p = await ws.create(); const id = randomUUID();
  await beginOperation(p.id, id, "prompt");
  await operationContext.run({ owner: id, operationId: id, kind: "prompt" }, () => ws.writeTimeline(p.id, emptyTimeline(), { source: "claude", label: "test", summary: "Done" }));
  const recovered = await readOperation(p.id, id);
  expect(recovered?.state).toBe("completed");
  expect(recovered?.result?.summary).toBe("Done");
  expect((await ws.mustGet(p.id)).versions).toHaveLength(2);
});
it("reports an uncommitted job from an earlier connector as interrupted", async () => {
  root = await mkdtemp(join(tmpdir(), "connector-jobs-")); vi.stubEnv("VIDEO_WORKSPACE", root);
  const p = await createWorkspace(root).create(); const id = randomUUID();
  vi.stubEnv("VIDEO_CONNECTOR_INSTANCE", "old"); await beginOperation(p.id, id, "prompt");
  vi.stubEnv("VIDEO_CONNECTOR_INSTANCE", "new");
  expect((await readOperation(p.id, id))?.state).toBe("interrupted");
});
