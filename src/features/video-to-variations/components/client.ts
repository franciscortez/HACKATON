import { connectorFetch, connectorSession, refreshAssets, assetUrl } from "@/features/video-to-variations/components/connector-client";
import { projectSchema } from "@/features/video-to-variations/schemas/project.schema";
import type { ClaudeModel, Media, Project, TimeRange, Timeline, Word } from "@/features/video-to-variations/types";
import type { RunProgress } from "@/types/tool";

export interface ProjectView {
  project: Project;
  timeline: Timeline;
  /** Transcript words per imported video. */
  words: Record<string, Word[]>;
  style: string;
}

export interface ApiError {
  code: string;
  message: string;
}

type StreamEvent = ({ type: "progress" } & RunProgress) | ({ type: "result" } & Record<string, unknown>) | ({ type: "error" } & ApiError);

const base = "/api/video-projects";

const versions = new Map<string, number>();
function versioned(url: string, init: RequestInit = {}): RequestInit {
  const id = url.split("/")[3];
  const headers = new Headers(init.headers);
  if (id && versions.has(id) && init.method && init.method !== "GET") headers.set("X-Expected-Version", String(versions.get(id)));
  return { ...init, headers };
}
async function prepare(data: unknown) {
  if (!data || typeof data !== "object" || !("project" in data)) return;
  const project = projectSchema.parse(data.project);
  versions.set(project.id, project.revision ?? project.current);
  const file = "file" in data && typeof data.file === "string" ? data.file : undefined;
  await refreshAssets(project, file);
}

async function errorOf(res: Response): Promise<ApiError> {
  const body = (await res.json().catch(() => null)) as { error?: ApiError } | null;
  return body?.error ?? { code: "request_failed", message: "The request failed. Try again." };
}

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await connectorFetch(url, versioned(url, { cache: "no-store", ...init }));
  if (!res.ok) throw await errorOf(res);
  const data = await res.json();
  await prepare(data);
  return data as T;
}

/** Sends a request whose answer is an NDJSON stream; resolves with the result event or throws the error event. */
async function stream<T>(url: string, init: RequestInit, onProgress: (p: RunProgress) => void): Promise<T> {
  const operationId = crypto.randomUUID();
  const headers = new Headers(init.headers); headers.set("Idempotency-Key", operationId);
  const projectId = url.split("/")[3];
  const pendingKey = `vtv:pending:${connectorSession()?.connectorId ?? "local"}:${projectId}`;
  if (connectorSession()) sessionStorage.setItem(pendingKey, operationId);
  const res = await connectorFetch(url, versioned(url, { ...init, headers }));
  if (!res.ok || !res.body) { if (connectorSession()) sessionStorage.removeItem(pendingKey); throw await errorOf(res); }
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  let result: Record<string, unknown> | null = null;
  let failure: ApiError | null = null;
  const handle = (line: string) => {
    if (!line.trim()) return;
    const event = JSON.parse(line) as StreamEvent;
    if (event.type === "progress") onProgress(event);
    else if (event.type === "result") result = event;
    else failure = { code: event.code, message: event.message };
  };
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    lines.forEach(handle);
  }
  handle(buffer);
  if (failure) { if (connectorSession()) sessionStorage.removeItem(pendingKey); throw failure; }
  if (!result) throw { code: "no_result", message: "The job stopped without an answer. Try again." } satisfies ApiError;
  await prepare(result);
  if (connectorSession()) sessionStorage.removeItem(pendingKey);
  return result as T;
}

const json = (method: string, body: unknown): RequestInit => ({ method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

export const videoApi = {
  async health(): Promise<ApiError | null> {
    const res = await connectorFetch(`${base}/health`, { cache: "no-store" });
    return res.ok ? null : errorOf(res);
  },
  create: () => call<{ project: Project; timeline: Timeline }>(base, json("POST", {})),
  get: (id: string) => call<ProjectView>(`${base}/${id}`),
  operation: (id: string, operationId: string) => call<{ state: string; error?: ApiError; result?: { file?: string } }>(`${base}/${id}/jobs/${operationId}`),
  rename: (id: string, name: string) => call<{ project: Project }>(`${base}/${id}`, json("PUT", { name })),
  importVideo: (id: string, file: File, onProgress: (p: RunProgress) => void) =>
    stream<{ project: Project; timeline: Timeline; media: Media }>(`${base}/${id}/media`, { method: "POST", headers: { "x-file-name": encodeURIComponent(file.name) }, body: file }, onProgress),
  saveTimeline: (id: string, timeline: Timeline, label: string) => call<{ project: Project; timeline: Timeline }>(`${base}/${id}/timeline`, json("PUT", { timeline, label })),
  prompt: (id: string, body: { prompt: string; range: TimeRange | null; model: ClaudeModel }, onProgress: (p: RunProgress) => void) =>
    stream<{ project: Project; timeline: Timeline; summary: string; changedRange: TimeRange | null }>(`${base}/${id}/prompt`, json("POST", body), onProgress),
  restore: (id: string, n: number) => call<{ project: Project; timeline: Timeline }>(`${base}/${id}/versions/${n}`, { method: "POST" }),
  exportVideo: (id: string, onProgress: (p: RunProgress) => void) => stream<{ project: Project; file: string }>(`${base}/${id}/export`, { method: "POST" }, onProgress),
  async saveStyle(id: string, text: string): Promise<void> {
    const res = await connectorFetch(`${base}/${id}/style`, versioned(`${base}/${id}/style`, { method: "PUT", body: text }));
    if (!res.ok) throw await errorOf(res);
  },
  mediaFile: (id: string, mediaId: string, file: string) => assetUrl(`${base}/${id}/media/${mediaId}/${file}`),
  exportFile: (id: string, file: string) => assetUrl(`${base}/${id}/exports/${file}`),
};

/** m:ss.s for a time in seconds. */
export function clock(s: number): string {
  const m = Math.floor(s / 60);
  return `${m}:${(s - m * 60).toFixed(1).padStart(4, "0")}`;
}

/** Reads "1:05", "1:05.5" or "65" as seconds; null when it is not a time. */
export function parseClock(text: string): number | null {
  const m = /^(?:(\d+):)?(\d+(?:\.\d+)?)$/.exec(text.trim());
  if (!m) return null;
  return (m[1] ? Number(m[1]) * 60 : 0) + Number(m[2]);
}

const STEPS = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600];
export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 200;

/** Seconds between ruler labels so they sit at least 64 px apart at this zoom (px per second). */
export function rulerStep(pxPerSecond: number): number {
  return STEPS.find((s) => s * pxPerSecond >= 64) ?? STEPS.at(-1)!;
}

/** The zoom (px per second) that fits the whole edit into the visible width. */
export function fitZoom(durationS: number, widthPx: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, widthPx / Math.max(durationS, 0.1)));
}

/** Thumbnail file number for a source second: one thumbnail every 2 s, numbered from 1. */
export function thumbIndex(sourceS: number, durationS: number): number {
  return Math.min(Math.floor(sourceS / 2) + 1, Math.max(1, Math.ceil(durationS / 2)));
}

export const thumbName = (n: number) => `t${String(n).padStart(4, "0")}.jpg`;
