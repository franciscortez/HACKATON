import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/features/video-to-variations/services/ffmpeg", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/video-to-variations/services/ffmpeg")>();
  return { ...actual, probe: vi.fn(), runFfmpeg: vi.fn(), runProcess: vi.fn() };
});

import { FfmpegError, probe, runFfmpeg, runProcess } from "@/features/video-to-variations/services/ffmpeg";
import { importMedia } from "@/features/video-to-variations/services/ingest";
import { createWorkspace, type Workspace } from "@/features/video-to-variations/services/workspace";

const body = () => new Blob([new Uint8Array([1, 2, 3])]).stream();
const calls = (needle: string) => vi.mocked(runFfmpeg).mock.calls.filter(([args]) => args.join(" ").includes(needle));

let root: string;
let ws: Workspace;
let id: string;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "vtv-ingest-"));
  ws = createWorkspace(root);
  id = (await ws.create()).id;
  vi.mocked(probe).mockResolvedValue({ durationS: 120, width: 1080, height: 1920, hasAudio: true, hasVideo: true });
  vi.mocked(runFfmpeg).mockResolvedValue({ stderr: "silence_start: 3\nsilence_end: 4 | silence_duration: 1\n" });
  vi.mocked(runProcess).mockImplementation(async (_bin, args) => {
    await writeFile(args.at(-1)!, JSON.stringify({ language: "tl", words: [{ i: 0, text: "Paano", start: 0, end: 0.4 }] }));
    return { stdout: "", stderr: "" };
  });
});
afterEach(async () => {
  vi.clearAllMocks();
  await rm(root, { recursive: true, force: true });
});

describe("importMedia", () => {
  it("prepares the video and appends it to the end of the timeline", async () => {
    const out = await importMedia(ws, id, body(), { fileName: "take 1.mov" }, () => {});
    expect(out.media).toEqual({ id: "m1", name: "take 1.mov", file: "source.mov", durationS: 120, width: 1080, height: 1920, hasAudio: true, language: "tl" });
    expect(out.project).toMatchObject({ current: 2, status: "EDITED" });
    expect(out.project.versions[1]).toMatchObject({ source: "hand", label: "Added take 1.mov" });
    const t = await ws.readTimeline(id, 2);
    expect(t.clips).toEqual([{ id: expect.any(String), mediaId: "m1", start: 0, end: 120 }]);
    expect(t.captions).toMatchObject({ enabled: false, cards: [{ mediaId: "m1", text: "Paano" }] });
    expect(await readFile(ws.mediaPath(id, "m1", "source.mov"))).toEqual(Buffer.from([1, 2, 3]));
    expect(JSON.parse(await readFile(ws.mediaPath(id, "m1", "silences.json"), "utf8"))).toEqual([{ start: 3, end: 4 }]);
    expect(await readFile(ws.path(id, "style.md"), "utf8")).toContain("6 words");
    expect(calls("proxy.mp4")).toHaveLength(1);
    expect(calls("scale=-2:160")).toHaveLength(1);
    expect(calls("showwavespic")).toHaveLength(1);
    expect(calls("scale=480:-2")).toHaveLength(1);
  });

  it("puts a second video after the first", async () => {
    await importMedia(ws, id, body(), { fileName: "a.mp4" }, () => {});
    vi.mocked(probe).mockResolvedValue({ durationS: 30, width: 1920, height: 1080, hasAudio: false, hasVideo: true });
    const out = await importMedia(ws, id, body(), { fileName: "b.mp4" }, () => {});
    expect(out.media).toMatchObject({ id: "m2", hasAudio: false, language: null });
    expect((await ws.readTimeline(id, out.project.current)).clips.map((c) => c.mediaId)).toEqual(["m1", "m2"]);
  });

  it("accepts a video with no sound: no transcript, waveform or pause search", async () => {
    vi.mocked(probe).mockResolvedValue({ durationS: 30, width: 1920, height: 1080, hasAudio: false, hasVideo: true });
    const out = await importMedia(ws, id, body(), { fileName: "clip.mp4" }, () => {});
    expect(out.media.language).toBeNull();
    expect(runProcess).not.toHaveBeenCalled();
    expect(calls("showwavespic")).toHaveLength(0);
    expect(calls("silencedetect")).toHaveLength(0);
  });

  it("accepts sound without speech", async () => {
    vi.mocked(runProcess).mockRejectedValue(new FfmpegError("no words", 3));
    const out = await importMedia(ws, id, body(), { fileName: "music.mp4" }, () => {});
    expect(out.media.language).toBeNull();
    expect((await ws.readTimeline(id, out.project.current)).captions.cards).toEqual([]);
  });

  it("leaves the edit untouched when a file is refused", async () => {
    vi.mocked(probe).mockResolvedValue({ durationS: 21 * 60, width: 1080, height: 1920, hasAudio: true, hasVideo: true });
    await expect(importMedia(ws, id, body(), { fileName: "a.mov" }, () => {})).rejects.toMatchObject({ code: "too_long", status: 413 });
    expect(await ws.mustGet(id)).toMatchObject({ media: [], current: 1 });
    expect(await readdir(ws.path(id, "media"))).toEqual([]);
  });

  it("refuses files that are not video, and proxy failures", async () => {
    vi.mocked(probe).mockResolvedValueOnce({ durationS: 60, width: 0, height: 0, hasAudio: true, hasVideo: false });
    await expect(importMedia(ws, id, body(), { fileName: "a.mp3" }, () => {})).rejects.toMatchObject({ code: "not_video", status: 422 });
    vi.mocked(runFfmpeg).mockImplementation(async (args) => {
      if (args.join(" ").includes("proxy.mp4")) throw new FfmpegError("Decoder not found");
      return { stderr: "" };
    });
    await expect(importMedia(ws, id, body(), { fileName: "odd.mkv" }, () => {})).rejects.toMatchObject({ code: "proxy_failed", status: 422 });
    expect((await ws.mustGet(id)).media).toEqual([]);
  });

  it("refuses more than 20 videos or an hour in total", async () => {
    vi.mocked(probe).mockResolvedValue({ durationS: 10, width: 1080, height: 1920, hasAudio: false, hasVideo: true });
    const p = await ws.mustGet(id);
    p.media = Array.from({ length: 20 }, (_, i) => ({ id: `m${i + 1}`, name: "x", file: "source.mp4", durationS: 10, width: 1, height: 1, hasAudio: false, language: null }));
    await ws.save(p);
    await expect(importMedia(ws, id, body(), { fileName: "21.mp4" }, () => {})).rejects.toMatchObject({ code: "too_many", status: 413 });
    p.media = [{ id: "m1", name: "x", file: "source.mp4", durationS: 3595, width: 1, height: 1, hasAudio: false, language: null }];
    await ws.save(p);
    await expect(importMedia(ws, id, body(), { fileName: "long.mp4" }, () => {})).rejects.toMatchObject({ code: "too_many" });
  });
});
