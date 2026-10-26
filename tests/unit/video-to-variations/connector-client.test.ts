import { afterEach, expect, it, vi } from "vitest";
import { connectorFetch, connectorSession, pairComputer, disconnectComputer, mediaReadiness, type ConnectorStatus } from "@/features/video-to-variations/components/connector-client";
const values = new Map<string, string>();
vi.stubGlobal("sessionStorage", { getItem: (k: string) => values.get(k) ?? null, setItem: (k: string, v: string) => values.set(k, v), removeItem: (k: string) => values.delete(k) });
afterEach(() => { values.clear(); vi.restoreAllMocks(); });
it("gates media operations independently from Claude authentication", () => {
  const status: ConnectorStatus = { protocol: 1, connectorId: "test", manualEditing: true, dependencies: { ffmpeg: true, ffprobe: true, python: true, transcriptionModel: true, storage: true, subtitles: true }, providers: { claude: { ready: false, message: "Sign in" }, codex: { ready: false, message: "Unavailable" } } };
  expect(mediaReadiness(status)).toMatchObject({ importReady: true, exportReady: true });
  status.dependencies.ffmpeg = false;
  expect(mediaReadiness(status)).toMatchObject({ importReady: false, exportReady: false });
  status.dependencies.ffmpeg = true; status.dependencies.subtitles = false;
  expect(mediaReadiness(status)).toMatchObject({ importReady: true, exportReady: false });
});
it("pairs only with loopback and sends bearer credentials only to that connector", async () => {
  const fetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json({ token: "x".repeat(43), expiresAt: Date.now() + 10000, connectorId: "test", protocol: 1 }));
  await pairComputer(43127, "code");
  expect(connectorSession()?.endpoint).toBe("http://127.0.0.1:43127");
  fetch.mockResolvedValue(Response.json({ ok: true }));
  await connectorFetch("/api/video-projects/health");
  const [url, options] = fetch.mock.calls.at(-1)!;
  expect(url).toBe("http://127.0.0.1:43127/api/video-projects/health");
  expect(new Headers(options?.headers).get("Authorization")).toBe(`Bearer ${"x".repeat(43)}`);
  await expect(connectorFetch("https://evil.example/")).rejects.toThrow();
  await disconnectComputer(); expect(connectorSession()).toBe(null);
});
