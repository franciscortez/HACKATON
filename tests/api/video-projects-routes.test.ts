import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/video-to-variations/services/local-gate", () => ({ localGate: vi.fn() }));
vi.mock("@/features/video-to-variations/services/ingest", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/video-to-variations/services/ingest")>()),
  importMedia: vi.fn(),
}));
vi.mock("@/features/video-to-variations/services/claude-editor", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/video-to-variations/services/claude-editor")>()),
  editWithClaude: vi.fn(),
}));
vi.mock("@/features/video-to-variations/services/render", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/features/video-to-variations/services/render")>()),
  renderExport: vi.fn(),
}));

import { GET as health } from "@/app/api/video-projects/health/route";
import { POST as create } from "@/app/api/video-projects/route";
import { GET as getEdit, PUT as rename } from "@/app/api/video-projects/[id]/route";
import { POST as importVideo } from "@/app/api/video-projects/[id]/media/route";
import { GET as mediaFile } from "@/app/api/video-projects/[id]/media/[mediaId]/[file]/route";
import { GET as exportFile } from "@/app/api/video-projects/[id]/exports/[file]/route";
import { PUT as putTimeline } from "@/app/api/video-projects/[id]/timeline/route";
import { POST as prompt } from "@/app/api/video-projects/[id]/prompt/route";
import { POST as restore } from "@/app/api/video-projects/[id]/versions/[n]/route";
import { POST as exportVideo } from "@/app/api/video-projects/[id]/export/route";
import { PUT as putStyle } from "@/app/api/video-projects/[id]/style/route";
import { localGate } from "@/features/video-to-variations/services/local-gate";
import { IngestError, importMedia } from "@/features/video-to-variations/services/ingest";
import { editWithClaude } from "@/features/video-to-variations/services/claude-editor";
import { ClaudeUnavailableError } from "@/features/video-to-variations/services/claude-cli";
import { EmptyTimelineError, renderExport } from "@/features/video-to-variations/services/render";
import { appendMedia, emptyTimeline } from "@/features/video-to-variations/services/timeline";
import { split } from "@/features/video-to-variations/services/timeline-ops";
import { createWorkspace, type Workspace } from "@/features/video-to-variations/services/workspace";

const params = <T extends Record<string, string>>(p: T) => ({ params: Promise.resolve(p) });
const json = (method: string, body: unknown) => new Request("http://x", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
const media = { id: "m1", name: "talk.mov", file: "source.mov", durationS: 60, width: 1080, height: 1920, hasAudio: true, language: "en" };

async function events(res: Response): Promise<Record<string, unknown>[]> {
  return (await res.text()).trim().split("\n").map((l) => JSON.parse(l));
}

let root: string;
let ws: Workspace;
let id: string;

/** An edit with one imported video on the timeline (version 2). */
async function withVideo() {
  await mkdir(ws.mediaPath(id, "m1"), { recursive: true });
  await writeFile(ws.mediaPath(id, "m1", "transcript.json"), JSON.stringify({ language: "en", words: [{ i: 0, text: "hi", start: 0, end: 0.3 }] }));
  await ws.addMedia(id, media);
  await ws.writeTimeline(id, appendMedia(emptyTimeline(), media, []), { source: "hand", label: "Added talk.mov" });
}

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "vtv-api-"));
  process.env.VIDEO_WORKSPACE = root;
  ws = createWorkspace(root);
  vi.mocked(localGate).mockResolvedValue({ ok: true });
  id = (await ws.create()).id;
});
afterEach(async () => {
  vi.clearAllMocks();
  delete process.env.VIDEO_WORKSPACE;
  await rm(root, { recursive: true, force: true });
});

describe("local gate", () => {
  it("answers 503 with the missing piece", async () => {
    vi.mocked(localGate).mockResolvedValue({ ok: false, code: "claude_missing" });
    const res = await health();
    expect(res.status).toBe(503);
    expect((await res.json()).error.code).toBe("claude_missing");
    expect((await getEdit(new Request("http://x"), params({ id }))).status).toBe(503);
  });
});

describe("edits", () => {
  it("creates an empty edit", async () => {
    const body = await (await create(json("POST", {}))).json();
    expect(body.project).toMatchObject({ name: "Untitled edit", media: [], current: 1 });
    expect(body.timeline).toEqual(emptyTimeline());
  });

  it("returns the edit with its timeline, words per video and style", async () => {
    await withVideo();
    await writeFile(ws.path(id, "style.md"), "# Style");
    const body = await (await getEdit(new Request("http://x"), params({ id }))).json();
    expect(body.project.media).toEqual([media]);
    expect(body.timeline.clips).toHaveLength(1);
    expect(body.words).toEqual({ m1: [{ i: 0, text: "hi", start: 0, end: 0.3 }] });
    expect(body.style).toBe("# Style");
  });

  it("returns 404 for an unknown edit", async () => {
    expect((await getEdit(new Request("http://x"), params({ id: "00000000-0000-4000-8000-000000000000" }))).status).toBe(404);
  });

  it("renames an edit", async () => {
    const body = await (await rename(json("PUT", { name: "Launch reel" }), params({ id }))).json();
    expect(body.project.name).toBe("Launch reel");
    expect((await rename(json("PUT", { name: "" }), params({ id }))).status).toBe(400);
  });
});

describe("importing videos", () => {
  it("streams progress, then the edit, its new timeline and the video", async () => {
    vi.mocked(importMedia).mockImplementation(async (_ws, editId, _body, meta, onProgress) => {
      expect(meta).toEqual({ fileName: "take 1 ñ.mov" });
      onProgress({ done: 1, total: 6, label: "take 1 ñ.mov: reading" });
      await ws.addMedia(editId, media);
      await ws.writeTimeline(editId, appendMedia(emptyTimeline(), media, []), { source: "hand", label: "Added" });
      return { project: await ws.mustGet(editId), media };
    });
    const out = await events(await importVideo(new Request("http://x", { method: "POST", headers: { "x-file-name": encodeURIComponent("take 1 ñ.mov") }, body: new Uint8Array([1]) }), params({ id })));
    expect(out[0]).toMatchObject({ type: "progress" });
    expect(out.at(-1)).toMatchObject({ type: "result", media: { id: "m1" }, project: { current: 2 } });
    expect((out.at(-1) as { timeline: { clips: unknown[] } }).timeline.clips).toHaveLength(1);
  });

  it("streams the import error", async () => {
    vi.mocked(importMedia).mockRejectedValue(new IngestError("too_long", "x.mov is over 20 minutes. Trim it first.", 413));
    const out = await events(await importVideo(new Request("http://x", { method: "POST", body: new Uint8Array([1]) }), params({ id })));
    expect(out.at(-1)).toMatchObject({ type: "error", code: "too_long" });
  });
});

describe("hand edits and versions", () => {
  it("rejects an invalid timeline", async () => {
    expect((await putTimeline(json("PUT", { timeline: { clips: "no" }, label: "x" }), params({ id }))).status).toBe(400);
  });

  it("saves a hand edit as a new version", async () => {
    await withVideo();
    const body = await (await putTimeline(json("PUT", { timeline: split(await ws.readTimeline(id, 2), 30), label: "Split" }), params({ id }))).json();
    expect(body.project).toMatchObject({ current: 3, status: "EDITED" });
    expect(body.timeline.clips).toHaveLength(2);
  });

  it("restores versions for undo and redo, and 404s past the ends", async () => {
    await withVideo();
    const undo = await (await restore(new Request("http://x", { method: "POST" }), params({ id, n: "1" }))).json();
    expect(undo.timeline.clips).toEqual([]);
    const redo = await (await restore(new Request("http://x", { method: "POST" }), params({ id, n: "2" }))).json();
    expect(redo.timeline.clips).toHaveLength(1);
    expect((await restore(new Request("http://x", { method: "POST" }), params({ id, n: "9" }))).status).toBe(404);
  });
});

describe("prompt", () => {
  it("rejects an empty or long prompt", async () => {
    expect((await prompt(json("POST", { prompt: "" }), params({ id }))).status).toBe(400);
    expect((await prompt(json("POST", { prompt: "x".repeat(1001) }), params({ id }))).status).toBe(400);
  });

  it("runs Claude and streams the new timeline and its summary", async () => {
    await withVideo();
    vi.mocked(editWithClaude).mockImplementation(async (_ws, _id, req) => {
      expect(req).toEqual({ prompt: "cut pauses", range: { start: 0, end: 10 }, model: "sonnet" });
      const version = await ws.writeTimeline(id, split(await ws.readTimeline(id, 2), 5), { source: "claude", label: req.prompt, summary: "Cut 2 pauses", changedRange: { start: 0, end: 10 } });
      return { version, summary: "Cut 2 pauses", changedRange: { start: 0, end: 10 } };
    });
    const out = await events(await prompt(json("POST", { prompt: "cut pauses", range: { start: 0, end: 10 }, model: "sonnet" }), params({ id })));
    expect(out.at(-1)).toMatchObject({ type: "result", summary: "Cut 2 pauses", project: { current: 3 } });
  });

  it("streams claude_unavailable when Claude Code fails", async () => {
    vi.mocked(editWithClaude).mockRejectedValue(new ClaudeUnavailableError("Please run /login"));
    const out = await events(await prompt(json("POST", { prompt: "cut pauses" }), params({ id })));
    expect(out.at(-1)).toMatchObject({ type: "error", code: "claude_unavailable", message: expect.stringContaining("/login") });
  });

  it("refuses an import, a hand edit and another prompt while Claude is working", async () => {
    let finish!: () => void;
    vi.mocked(editWithClaude).mockImplementation(() => new Promise((r) => (finish = () => r({ version: 1, summary: "", changedRange: null }))));
    const first = await prompt(json("POST", { prompt: "one" }), params({ id }));
    const reading = first.text();
    await vi.waitFor(() => expect(editWithClaude).toHaveBeenCalled());
    expect((await prompt(json("POST", { prompt: "two" }), params({ id }))).status).toBe(409);
    expect((await putTimeline(json("PUT", { timeline: emptyTimeline(), label: "x" }), params({ id }))).status).toBe(409);
    const imp = await importVideo(new Request("http://x", { method: "POST", body: new Uint8Array([1]) }), params({ id }));
    expect(imp.status).toBe(409);
    expect((await imp.json()).error.code).toBe("job_running");
    finish();
    await reading;
  });
});

describe("export and files", () => {
  it("refuses to export an empty edit", async () => {
    vi.mocked(renderExport).mockRejectedValue(new EmptyTimelineError());
    const res = await exportVideo(new Request("http://x", { method: "POST" }), params({ id }));
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe("empty_timeline");
  });

  it("renders the current version, approves the edit and serves the file", async () => {
    await withVideo();
    vi.mocked(renderExport).mockImplementation(async () => {
      await writeFile(ws.path(id, "exports", "v002-916.mp4"), Buffer.alloc(10));
      return "v002-916.mp4";
    });
    const out = await events(await exportVideo(new Request("http://x", { method: "POST" }), params({ id })));
    expect(out.at(-1)).toMatchObject({ type: "result", file: "v002-916.mp4", project: { status: "APPROVED" } });
    const res = await exportFile(new Request("http://x"), params({ id, file: "v002-916.mp4" }));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-disposition")).toContain("attachment");
    expect((await exportFile(new Request("http://x"), params({ id, file: "v001-169.mp4" }))).status).toBe(404);
  });

  it("serves a video's proxy with byte ranges, thumbnails and waveform", async () => {
    await mkdir(ws.mediaPath(id, "m1", "thumbs"), { recursive: true });
    await writeFile(ws.mediaPath(id, "m1", "proxy.mp4"), Buffer.alloc(1000, 7));
    await writeFile(ws.mediaPath(id, "m1", "thumbs", "t0001.jpg"), Buffer.alloc(5));
    await writeFile(ws.mediaPath(id, "m1", "waveform.png"), Buffer.alloc(5));
    const res = await mediaFile(new Request("http://x", { headers: { Range: "bytes=0-99" } }), params({ id, mediaId: "m1", file: "proxy.mp4" }));
    expect(res.status).toBe(206);
    expect(res.headers.get("content-range")).toBe("bytes 0-99/1000");
    expect((await mediaFile(new Request("http://x"), params({ id, mediaId: "m1", file: "t0001.jpg" }))).headers.get("content-type")).toBe("image/jpeg");
    expect((await mediaFile(new Request("http://x"), params({ id, mediaId: "m1", file: "waveform.png" }))).headers.get("content-type")).toBe("image/png");
  });

  it("rejects files that are not editor files", async () => {
    expect((await mediaFile(new Request("http://x"), params({ id, mediaId: "m1", file: "source.mov" }))).status).toBe(400);
    expect((await mediaFile(new Request("http://x"), params({ id, mediaId: "..", file: "proxy.mp4" }))).status).toBe(400);
    expect((await exportFile(new Request("http://x"), params({ id, file: "../project.json" }))).status).toBe(400);
  });
});

describe("PUT style", () => {
  it("saves the style guide and rejects one over 20,000 characters", async () => {
    expect((await putStyle(new Request("http://x", { method: "PUT", body: "# Mine" }), params({ id }))).status).toBe(200);
    expect((await putStyle(new Request("http://x", { method: "PUT", body: "x".repeat(20_001) }), params({ id }))).status).toBe(413);
  });
});
