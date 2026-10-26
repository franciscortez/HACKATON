import { afterEach, expect, it, vi } from "vitest";
import { createHash, randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
const control = vi.hoisted(() => ({ failSave: false }));
vi.mock("node:fs/promises", async (original) => {
  const fs = await original<typeof import("node:fs/promises")>();
  return { ...fs, rename: async (from: string, to: string) => {
    if (control.failSave && to.endsWith("project.json")) { control.failSave = false; throw Object.assign(new Error("Synthetic rename failure"), { code: "EACCES" }); }
    return fs.rename(from, to);
  } };
});
import { POST } from "@/app/api/video-projects/[id]/media/route";
import { createWorkspace } from "@/features/video-to-variations/services/workspace";
import { pairConnector, resetConnectorSessions } from "@/features/video-to-variations/services/connector-auth";
import { readOperation } from "@/features/video-to-variations/services/operations";
import { startJob } from "@/features/video-to-variations/services/http";
afterEach(() => { control.failSave = false; resetConnectorSessions(); vi.unstubAllEnvs(); });
it("records setup failure and releases the writer when the initial project save fails", async () => {
  const root = await mkdtemp(join(tmpdir(), "connector-save-failure-"));
  try {
    vi.stubEnv("VIDEO_CONNECTOR", "1"); vi.stubEnv("VERCEL", ""); vi.stubEnv("VIDEO_WORKSPACE", root);
    vi.stubEnv("VIDEO_CONNECTOR_SECRET", "b".repeat(64)); vi.stubEnv("VIDEO_CONNECTOR_STARTED", String(Date.now()));
    vi.stubEnv("VIDEO_CONNECTOR_CODE_HASH", createHash("sha256").update("code").digest("hex")); resetConnectorSessions();
    const origin = "https://leveric-workbench.vercel.app";
    const session = pairConnector(new Request("http://127.0.0.1:43127/pair", { headers: { Origin: origin } }), "code");
    const ws = createWorkspace(root); const p = await ws.create(); const operation = randomUUID();
    control.failSave = true;
    const response = await POST(new Request(`http://127.0.0.1:43127/api/video-projects/${p.id}/media`, { method: "POST", headers: { Origin: origin, Authorization: `Bearer ${session.token}`, "Idempotency-Key": operation, "X-Expected-Version": "1" }, body: "unused" }), { params: Promise.resolve({ id: p.id }) });
    expect(await response.text()).toContain('"type":"error"');
    expect((await readOperation(p.id, operation))?.state).toBe("failed");
    expect((await ws.mustGet(p.id)).job).toBeNull();
    const release = startJob(p.id); expect(release).not.toBeNull(); release?.();
  } finally { await rm(root, { recursive: true, force: true }); }
});
