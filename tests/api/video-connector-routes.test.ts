import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { mkdtemp, rm, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { connectorResponse } from "@/features/video-to-variations/services/connector-api";
import { resetConnectorSessions, connectorPreflight } from "@/features/video-to-variations/services/connector-auth";
import { POST as create } from "@/app/api/video-projects/route";
import { PUT as timeline } from "@/app/api/video-projects/[id]/timeline/route";
import { GET as media } from "@/app/api/video-projects/[id]/media/[mediaId]/[file]/route";
import { createWorkspace } from "@/features/video-to-variations/services/workspace";
import { emptyTimeline } from "@/features/video-to-variations/services/timeline";
const origin = "https://leveric-workbench.vercel.app";
let root: string; let token: string;
function req(path: string, method = "GET", body?: unknown, headers: Record<string, string> = {}) { return new Request(`http://127.0.0.1:43127${path}`, { method, headers: { Origin: origin, Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...headers }, body: body === undefined ? undefined : JSON.stringify(body) }); }
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "connector-route-"));
  vi.stubEnv("VIDEO_WORKSPACE", root); vi.stubEnv("VIDEO_CONNECTOR", "1"); vi.stubEnv("VERCEL", "");
  vi.stubEnv("VIDEO_CONNECTOR_SECRET", "b".repeat(64)); vi.stubEnv("VIDEO_CONNECTOR_STARTED", String(Date.now()));
  vi.stubEnv("VIDEO_CONNECTOR_CODE_HASH", createHash("sha256").update("test-code").digest("hex")); resetConnectorSessions();
  token = (await (await connectorResponse(req("/api/video-connector/pair", "POST", { code: "test-code" }), "pair")).json()).token;
});
afterEach(async () => { vi.unstubAllEnvs(); await rm(root, { recursive: true, force: true }); });
it("allows exact-origin preflight but refuses unauthenticated video requests", async () => {
  expect(connectorPreflight(req("/api/video-projects", "OPTIONS")).status).toBe(204);
  expect(connectorPreflight(req("/api/video-projects", "OPTIONS", undefined, { Origin: "https://evil.example" })).status).toBe(403);
  expect((await create(req("/api/video-projects", "POST", {}, { Authorization: "" }))).status).toBe(401);
  const good = await create(req("/api/video-projects", "POST", {}));
  expect(good.status).toBe(200); expect(good.headers.get("Access-Control-Allow-Origin")).toBe(origin);
});
it("rejects stale edits and preserves the latest timeline", async () => {
  const p = await createWorkspace(root).create(); const ctx = { params: Promise.resolve({ id: p.id }) };
  const path = `/api/video-projects/${p.id}/timeline`;
  const body = { timeline: emptyTimeline(), label: "Change" };
  expect((await timeline(req(path, "PUT", body, { "X-Expected-Version": "1" }), ctx)).status).toBe(200);
  expect((await timeline(req(path, "PUT", body, { "X-Expected-Version": "1" }), ctx)).status).toBe(409);
  expect((await createWorkspace(root).mustGet(p.id)).versions).toHaveLength(2);
  const ws = createWorkspace(root);
  await ws.setCurrent(p.id, 1);
  await ws.writeTimeline(p.id, emptyTimeline(), { source: "hand", label: "Replacement" });
  expect((await ws.mustGet(p.id)).current).toBe(2);
  expect((await timeline(req(path, "PUT", body, { "X-Expected-Version": "2" }), ctx)).status).toBe(409);
});
it("serves signed Range requests and revokes them on disconnect", async () => {
  const ws = createWorkspace(root); const p = await ws.create();
  await mkdir(ws.mediaPath(p.id, "m1"), { recursive: true }); await writeFile(ws.mediaPath(p.id, "m1", "proxy.mp4"), "0123456789");
  const path = `/api/video-projects/${p.id}/media/m1/proxy.mp4`;
  const signed = await (await connectorResponse(req("/api/video-connector/assets", "POST", { paths: [path] }), "assets")).json();
  const download = new Request(`http://127.0.0.1:43127${signed.urls[path]}`, { headers: { Range: "bytes=2-5" } });
  const ctx = { params: Promise.resolve({ id: p.id, mediaId: "m1", file: "proxy.mp4" }) };
  const response = await media(download, ctx);
  expect(response.status).toBe(206); expect(await response.text()).toBe("2345");
  await connectorResponse(req("/api/video-connector/session", "DELETE"), "session");
  expect((await media(download, ctx)).status).toBe(401);
});
