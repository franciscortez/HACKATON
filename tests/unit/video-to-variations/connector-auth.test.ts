import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { connectorAccess, pairConnector, signAssets, resetConnectorSessions } from "@/features/video-to-variations/services/connector-auth";

const origin = "https://leveric-workbench.vercel.app";
const code = "a".repeat(64);
const asset = "/api/video-projects/11111111-2222-4333-8444-555555555555/media/m1/proxy.mp4";
const request = (path: string, headers: Record<string, string> = {}, method = "GET") => new Request(`http://127.0.0.1:43127${path}`, { method, headers: { Origin: origin, ...headers } });
beforeEach(() => {
  vi.stubEnv("VIDEO_CONNECTOR", "1");
  vi.stubEnv("VIDEO_CONNECTOR_SECRET", "b".repeat(64));
  vi.stubEnv("VIDEO_CONNECTOR_CODE_HASH", createHash("sha256").update(code).digest("hex"));
  vi.stubEnv("VIDEO_CONNECTOR_STARTED", String(Date.now()));
  vi.stubEnv("VERCEL", "");
  resetConnectorSessions();
});
afterEach(() => { vi.unstubAllEnvs(); vi.useRealTimers(); });

describe("connector capabilities", () => {
  it("accepts Next.js normalised URLs only with the exact loopback Host", () => {
    const req = new Request("http://localhost:43127/pair", { method: "POST", headers: { Origin: origin, Host: "127.0.0.1:43127" } });
    expect(pairConnector(req, code).protocol).toBe(1);
    resetConnectorSessions();
    expect(() => pairConnector(new Request(req, { headers: { Origin: origin, Host: "evil.example:43127" } }), code)).toThrow();
  });
  it("requires a single-use pairing code and rejects missing credentials", () => {
    expect(connectorAccess(request(asset)).ok).toBe(false);
    expect(() => pairConnector(request("/pair", {}, "POST"), "wrong")).toThrow();
    const session = pairConnector(request("/pair", {}, "POST"), code);
    expect(connectorAccess(request(asset, { Authorization: `Bearer ${session.token}` })).ok).toBe(true);
    expect(() => pairConnector(request("/pair", {}, "POST"), code)).toThrow();
  });
  it("rejects hostile origins, non-loopback hosts and cloud execution", () => {
    expect(() => pairConnector(request("/pair", { Origin: "https://evil.example" }, "POST"), code)).toThrow();
    expect(connectorAccess(new Request("http://evil.example:43127/api/video-projects"))).toMatchObject({ ok: false });
    vi.stubEnv("VERCEL", "1");
    expect(() => pairConnector(request("/pair", {}, "POST"), code)).toThrow();
  });
  it("scopes signed downloads to one resource and expires them", () => {
    const session = pairConnector(request("/pair", {}, "POST"), code);
    const auth = request("/assets", { Authorization: `Bearer ${session.token}` }, "POST");
    const urls = signAssets(auth, [asset]);
    const signed = new Request(`http://127.0.0.1:43127${urls[asset]}`);
    expect(connectorAccess(signed).ok).toBe(true);
    expect(connectorAccess(new Request(signed.url.replace("proxy.mp4", "waveform.png"))).ok).toBe(false);
    expect(connectorAccess(new Request(signed.url, { method: "POST" })).ok).toBe(false);
    expect(() => signAssets(auth, [asset.replace("proxy.mp4", "original.mp4")])).toThrow();
    vi.useFakeTimers(); vi.setSystemTime(Date.now() + 301_000);
    expect(connectorAccess(signed).ok).toBe(false);
  });
  it("revokes media access when connector sessions reset", () => {
    const session = pairConnector(request("/pair", {}, "POST"), code);
    const urls = signAssets(request("/assets", { Authorization: `Bearer ${session.token}` }, "POST"), [asset]);
    resetConnectorSessions();
    expect(connectorAccess(new Request(`http://127.0.0.1:43127${urls[asset]}`)).ok).toBe(false);
  });
});
