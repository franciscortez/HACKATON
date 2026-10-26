import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { probe, runFfmpeg } from "@/features/video-to-variations/services/ffmpeg";
import { EmptyTimelineError, renderExport } from "@/features/video-to-variations/services/render";
import { createWorkspace, type Workspace } from "@/features/video-to-variations/services/workspace";
import type { Media, Timeline } from "@/features/video-to-variations/types";

// Real ffmpeg (and Windows text to speech), no AI. Run with VIDEO_E2E=1.
const run = process.env.VIDEO_E2E === "1";

const SPEECH = "Most people edit their videos by hand and lose hours every week. There is a faster way. Record yourself once and talk naturally. ".repeat(3);

async function lufs(file: string): Promise<number> {
  const { stderr } = await runFfmpeg(["-hide_banner", "-nostats", "-i", file, "-af", "ebur128", "-f", "null", "-"]);
  return Number(/I:\s+(-?[\d.]+) LUFS\s+Threshold/.exec(stderr)?.[1]);
}

describe.runIf(run)("export with real ffmpeg", () => {
  let dir: string;
  let ws: Workspace;
  let speech: string;

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), "vtv render ñ "));
    ws = createWorkspace(join(dir, "ws"));
    // Windows PowerShell 5.1 reads scripts as ANSI, so keep the speech path plain ASCII.
    const plain = await mkdtemp(join(tmpdir(), "vtv-speech-"));
    speech = join(plain, "speech.wav");
    await writeFile(join(plain, "speak.ps1"), `Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; $s.SetOutputToWaveFile('${speech}'); $s.Speak('${SPEECH}'); $s.Dispose()`);
    execFileSync("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", join(plain, "speak.ps1")]);
  }, 120_000);

  afterAll(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  async function addVideo(id: string, mediaId: string, size: string, withAudio: boolean): Promise<Media> {
    const [w, h] = size.split("x").map(Number);
    await mkdir(ws.mediaPath(id, mediaId), { recursive: true });
    const video = ["-f", "lavfi", "-i", `testsrc2=size=${size}:rate=${withAudio ? 30 : 25}:duration=40`];
    const audio = withAudio ? ["-i", speech, "-map", "0:v", "-map", "1:a", "-af", "apad", "-c:a", "aac"] : [];
    await runFfmpeg(["-hide_banner", "-y", ...video, ...audio, "-t", "40", "-c:v", "libx264", "-preset", "ultrafast", ws.mediaPath(id, mediaId, "source.mp4")]);
    const media: Media = { id: mediaId, name: `${mediaId}.mp4`, file: "source.mp4", durationS: 40, width: w, height: h, hasAudio: withAudio, language: null };
    await ws.addMedia(id, media);
    return media;
  }

  const timeline = (format: Timeline["format"]): Timeline => ({
    format,
    clips: [
      { id: "b", mediaId: "m2", start: 5, end: 11 },
      { id: "a", mediaId: "m1", start: 1, end: 15 },
      { id: "c", mediaId: "m1", start: 20, end: 26 },
    ],
    captions: { enabled: true, cards: [{ id: "c", mediaId: "m1", start: 2, end: 4, text: "hello there", emphasis: [1] }] },
    titles: [{ id: "t", text: "Hook", start: 0, end: 1.5 }],
  });

  it("joins a silent portrait video and a talking landscape video into one 9:16 short at -14 LUFS", async () => {
    const p = await ws.create();
    await addVideo(p.id, "m1", "1920x1080", true);
    await addVideo(p.id, "m2", "1080x1920", false);
    await ws.writeTimeline(p.id, timeline("9:16"), { source: "hand", label: "edit" });
    const progress: number[] = [];
    const name = await renderExport(ws, p.id, 2, (x) => progress.push(x.done));
    expect(name).toBe("v002-916.mp4");
    const file = ws.path(p.id, "exports", name);
    const info = await probe(file);
    expect(info).toMatchObject({ width: 1080, height: 1920, hasAudio: true });
    expect(Math.abs(info.durationS - 26)).toBeLessThan(0.15);
    expect(Math.abs((await lufs(file)) - -14)).toBeLessThanOrEqual(1);
    expect(progress.length).toBeGreaterThan(0);
  }, 300_000);

  it("exports the same edit as 16:9", async () => {
    const p = await ws.create();
    await addVideo(p.id, "m1", "1920x1080", true);
    await addVideo(p.id, "m2", "1080x1920", false);
    await ws.writeTimeline(p.id, timeline("16:9"), { source: "hand", label: "edit" });
    expect(await probe(ws.path(p.id, "exports", await renderExport(ws, p.id, 2, () => {})))).toMatchObject({ width: 1920, height: 1080 });
  }, 300_000);

  it("exports videos with no sound at all, with a silent audio track", async () => {
    const p = await ws.create();
    await addVideo(p.id, "m1", "1080x1920", false);
    await ws.writeTimeline(p.id, { format: "9:16", clips: [{ id: "a", mediaId: "m1", start: 0, end: 12 }], captions: { enabled: false, cards: [] }, titles: [] }, { source: "hand", label: "edit" });
    const info = await probe(ws.path(p.id, "exports", await renderExport(ws, p.id, 2, () => {})));
    expect(info.hasAudio).toBe(true);
    expect(Math.abs(info.durationS - 12)).toBeLessThan(0.15);
  }, 300_000);

  it("refuses to export an empty edit", async () => {
    const p = await ws.create();
    await expect(renderExport(ws, p.id, 1, () => {})).rejects.toThrow(EmptyTimelineError);
  });
});
