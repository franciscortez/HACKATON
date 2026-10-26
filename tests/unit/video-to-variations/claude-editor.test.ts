import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { TimelineInvalidError } from "@/features/video-to-variations/schemas/timeline.schema";
import { ClaudeUnavailableError } from "@/features/video-to-variations/services/claude-cli";
import { editWithClaude } from "@/features/video-to-variations/services/claude-editor";
import { appendMedia, emptyTimeline } from "@/features/video-to-variations/services/timeline";
import { move } from "@/features/video-to-variations/services/timeline-ops";
import { createWorkspace, type Workspace } from "@/features/video-to-variations/services/workspace";

const fake = join(process.cwd(), "tests", "fixtures", "video-to-variations", "fake-claude.mjs");
const words = [
  { i: 0, text: "Hello", start: 1.2, end: 1.5 },
  { i: 1, text: "there.", start: 1.5, end: 1.9 },
];

let root: string;
let ws: Workspace;
let id: string;
let log: string;

async function calls(): Promise<{ args: string[] }[]> {
  return (await readFile(log, "utf8"))
    .trim()
    .split("\n")
    .map((l) => JSON.parse(l));
}

async function addMedia(mediaId: string, name: string, speech: boolean) {
  await mkdir(ws.mediaPath(id, mediaId), { recursive: true });
  await writeFile(ws.mediaPath(id, mediaId, "transcript.json"), JSON.stringify({ language: speech ? "en" : null, words: speech ? words : [] }));
  const media = { id: mediaId, name, file: "source.mp4", durationS: mediaId === "m1" ? 60 : 30, width: 1080, height: 1920, hasAudio: true, language: speech ? "en" : null };
  await ws.addMedia(id, media);
  const p = await ws.mustGet(id);
  await ws.writeTimeline(id, appendMedia(await ws.readTimeline(id, p.current), media, speech ? words : []), { source: "hand", label: `Added ${name}` });
}

beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "vtv-claude-"));
  log = join(root, "calls.jsonl");
  process.env.VIDEO_CLAUDE_BIN = fake;
  process.env.FAKE_CLAUDE_STATE = join(root, "state");
  process.env.FAKE_CLAUDE_LOG = log;
  ws = createWorkspace(join(root, "ws"));
  id = (await ws.create()).id;
  await writeFile(ws.path(id, "style.md"), "# Style");
  await addMedia("m1", "talk.mp4", true);
  await addMedia("m2", "outfit.mp4", false);
});
afterEach(async () => {
  for (const k of ["VIDEO_CLAUDE_BIN", "FAKE_CLAUDE_SCRIPT", "FAKE_CLAUDE_STATE", "FAKE_CLAUDE_LOG"]) delete process.env[k];
  await rm(root, { recursive: true, force: true });
});

const req = { prompt: "Cut the pauses and add captions", range: null, model: "sonnet" as const };

describe("editWithClaude", () => {
  it("saves Claude's timeline as a new version with its summary and changed range", async () => {
    process.env.FAKE_CLAUDE_SCRIPT = "ok";
    const out = await editWithClaude(ws, id, req, () => {});
    expect(out).toEqual({ version: 4, summary: "Cut the pauses and turned captions on.", changedRange: { start: 0, end: 12 } });
    const p = await ws.mustGet(id);
    expect(p).toMatchObject({ current: 4, status: "EDITED", sessionId: expect.stringMatching(/^[a-f0-9-]{36}$/) });
    expect(p.versions[3]).toMatchObject({ source: "claude", label: req.prompt });
    expect((await ws.readTimeline(id, 4)).clips.map((c) => [c.id, c.mediaId])).toEqual([
      ["k1", "m1"],
      ["k2", "m2"],
    ]);
    expect((await calls())[0].args.join(" ")).toContain("--model sonnet");
  });

  it("lists every video and says which have no speech", async () => {
    process.env.FAKE_CLAUDE_SCRIPT = "ok";
    await editWithClaude(ws, id, req, () => {});
    const prompt = (await calls())[0].args[1];
    expect(prompt).toContain("timeline/v003.json");
    expect(prompt).toMatch(/m1 "talk\.mp4".*media\/m1\//);
    expect(prompt).toMatch(/m2 "outfit\.mp4".*no speech/);
  });

  it("keeps text Claude wrote for a video with no speech", async () => {
    process.env.FAKE_CLAUDE_SCRIPT = "ok";
    await editWithClaude(ws, id, req, () => {});
    const cards = (await ws.readTimeline(id, 4)).captions.cards;
    expect(cards.filter((c) => c.mediaId === "m2")).toEqual([{ id: "w1", mediaId: "m2", start: 1, end: 3, text: "summer outfit", emphasis: [1] }]);
  });

  it("fills in transcript captions Claude left out for a video with speech", async () => {
    process.env.FAKE_CLAUDE_SCRIPT = "ok";
    await editWithClaude(ws, id, req, () => {});
    const cards = (await ws.readTimeline(id, 4)).captions.cards;
    expect(cards.filter((c) => c.mediaId === "m1").map((c) => c.text)).toEqual(["Hello there."]);
  });

  it("points Claude at the current version, including the user's hand edits", async () => {
    process.env.FAKE_CLAUDE_SCRIPT = "ok";
    const current = await ws.readTimeline(id, 3);
    await ws.writeTimeline(id, move(current, current.clips[1].id, 0), { source: "hand", label: "Reorder" });
    await editWithClaude(ws, id, req, () => {});
    expect((await calls())[0].args[1]).toContain("timeline/v004.json");
  });

  it("resumes the edit's session and passes the selected range", async () => {
    process.env.FAKE_CLAUDE_SCRIPT = "ok";
    await editWithClaude(ws, id, req, () => {});
    const session = (await ws.mustGet(id)).sessionId;
    await editWithClaude(ws, id, { ...req, prompt: "Make it faster", range: { start: 0, end: 21.3 } }, () => {});
    const second = (await calls())[1].args;
    expect(second.join(" ")).toContain(`--resume ${session}`);
    expect(second[1]).toContain("0:00.0–0:21.3");
  });

  it("asks once more when the first answer is invalid, then gives up", async () => {
    process.env.FAKE_CLAUDE_SCRIPT = "bad-plan,ok";
    expect((await editWithClaude(ws, id, req, () => {})).version).toBe(4);
    process.env.FAKE_CLAUDE_SCRIPT = "bad-plan";
    await rm(process.env.FAKE_CLAUDE_STATE!, { force: true });
    await expect(editWithClaude(ws, id, req, () => {})).rejects.toThrow(TimelineInvalidError);
    expect((await ws.mustGet(id)).current).toBe(4);
  });

  it("raises ClaudeUnavailableError and keeps the current version when Claude Code fails", async () => {
    process.env.FAKE_CLAUDE_SCRIPT = "auth-error";
    await expect(editWithClaude(ws, id, req, () => {})).rejects.toThrow(ClaudeUnavailableError);
    expect((await ws.mustGet(id)).current).toBe(3);
  });

  it("refuses to ask about an empty edit", async () => {
    const fresh = await ws.create();
    expect(await ws.readTimeline(fresh.id, 1)).toEqual(emptyTimeline());
    await expect(editWithClaude(ws, fresh.id, req, () => {})).rejects.toThrow(/Import a video/);
  });
});
