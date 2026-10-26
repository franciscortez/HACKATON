import { z } from "zod";
import type { Project } from "@/features/video-to-variations/types";
const key = "vtv:connector";
const sessionSchema = z.object({ endpoint: z.string().regex(/^http:\/\/127\.0\.0\.1:\d+$/), token: z.string().regex(/^[\w-]{43}$/), expiresAt: z.number(), connectorId: z.string(), protocol: z.literal(1) });
export type ConnectorSession = z.infer<typeof sessionSchema>;
export type ConnectorStatus = { protocol: number; connectorId: string; manualEditing: boolean; dependencies: Record<"ffmpeg" | "ffprobe" | "python" | "transcriptionModel" | "storage", boolean>; providers: Record<"claude" | "codex", { ready: boolean; message: string }> };
const urls = new Map<string, string>();
let assetSet = "";
let refreshed = 0;
export function connectorSession(): ConnectorSession | null {
  try {
    const parsed = sessionSchema.safeParse(JSON.parse(sessionStorage.getItem(key) ?? "null"));
    return parsed.success ? parsed.data : null;
  } catch { return null; }
}
export const lastProjectKey = () => { const s = connectorSession(); return s ? `vtv:lastProject:${s.connectorId}` : "vtv:lastProject"; };
const localRequest = (init?: RequestInit): RequestInit & { targetAddressSpace: string } => ({ ...init, cache: "no-store", credentials: "omit", redirect: "error", referrerPolicy: "no-referrer", targetAddressSpace: "loopback" });
export async function pairComputer(port: number, code: string): Promise<void> {
  if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error("Enter a connector port between 1024 and 65535.");
  const endpoint = `http://127.0.0.1:${port}`;
  const res = await fetch(`${endpoint}/api/video-connector/pair`, localRequest({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: code.trim() }) }));
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? "Pairing failed.");
  const parsed = sessionSchema.safeParse({ ...data, endpoint });
  if (!parsed.success) throw new Error("This connector version is incompatible. Rebuild the connector.");
  sessionStorage.setItem(key, JSON.stringify(parsed.data));
  urls.clear(); assetSet = ""; refreshed = 0;
}
export async function connectorFetch(path: string, init?: RequestInit): Promise<Response> {
  if (!/^\/api\/video-(?:projects|connector)(?:\/|$)/.test(path) || path.includes("..") || path.includes("\\")) throw new Error("Invalid connector path.");
  const session = connectorSession();
  if (!session) return fetch(path, init);
  if (session.expiresAt <= Date.now()) throw new Error("The connection expired. Restart the connector and connect again.");
  const headers = new Headers(init?.headers); headers.set("Authorization", `Bearer ${session.token}`);
  try { return await fetch(`${session.endpoint}${path}`, localRequest({ ...init, headers })); }
  catch { throw new Error("Cannot reach your computer. Keep the connector running and allow this site's local network permission, then reconnect."); }
}
export async function computerStatus(): Promise<ConnectorStatus> {
  const res = await connectorFetch("/api/video-connector/status");
  if (!res.ok) throw new Error("The connection ended. Restart the connector and connect again.");
  const data: ConnectorStatus = await res.json();
  if (data.protocol !== 1) throw new Error("This connector version is incompatible. Rebuild it.");
  return data;
}
export async function disconnectComputer() {
  try { if (connectorSession()) await connectorFetch("/api/video-connector/session", { method: "DELETE" }); }
  finally { sessionStorage.removeItem(key); urls.clear(); assetSet = ""; refreshed = 0; }
}
export function assetUrl(path: string): string {
  const s = connectorSession();
  return s ? `${s.endpoint}${urls.get(path) ?? "/api/video-connector/unavailable"}` : path;
}
export async function refreshAssets(p: Project, extraFile?: string, force = false) {
  if (!connectorSession()) return;
  const stamp = JSON.stringify([p.id, p.media.map((m) => [m.id, m.durationS])]);
  const paths: string[] = [];
  if (force || assetSet !== stamp || Date.now() - refreshed > 240_000) {
    for (const m of p.media) {
      const base = `/api/video-projects/${p.id}/media/${m.id}/`;
      paths.push(`${base}proxy.mp4`, `${base}waveform.png`);
      for (let n = 1; n <= Math.max(1, Math.ceil(m.durationS / 2)); n++) paths.push(`${base}t${String(n).padStart(4, "0")}.jpg`);
    }
    // Renew previous export links too, so Download again remains usable.
    for (const path of urls.keys()) if (path.startsWith(`/api/video-projects/${p.id}/exports/`)) paths.push(path);
  }
  if (extraFile) paths.push(`/api/video-projects/${p.id}/exports/${extraFile}`);
  if (paths.length) {
    const res = await connectorFetch("/api/video-connector/assets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paths: [...new Set(paths)] }) });
    if (!res.ok) throw new Error("Could not renew access to local media. Reconnect your computer.");
    const data: { urls: Record<string, string> } = await res.json();
    Object.entries(data.urls).forEach(([path, url]) => urls.set(path, url));
  }
  if (force || assetSet !== stamp || Date.now() - refreshed > 240_000) { assetSet = stamp; refreshed = Date.now(); }
}
