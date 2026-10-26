import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { appendMedia, emptyTimeline } from "@/features/video-to-variations/services/timeline";
import { createWorkspace } from "@/features/video-to-variations/services/workspace";

const m1 = { id: "m1", name: "take 1.mov", file: "source.mov", durationS: 120, width: 1920, height: 1080, hasAudio: true, language: "en" };

let root: string;
beforeEach(async () => {
  root = await mkdtemp(join(tmpdir(), "vtv-ws-"));
});
afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

describe("workspace", () => {
  it("creates an empty edit as version 1", async () => {
    const ws = createWorkspace(root);
    const p = await ws.create();
    expect(p).toMatchObject({ name: "Untitled edit", media: [], current: 1, status: "DRAFT", sessionId: null });
    expect(p.versions[0]).toMatchObject({ n: 1, source: "upload", label: "New edit" });
    expect(await ws.readTimeline(p.id, 1)).toEqual(emptyTimeline());
    expect(await ws.get(p.id)).toEqual(p);
  });

  it("registers media with its own folder", async () => {
    const ws = createWorkspace(root);
    const p = await ws.create("Launch");
    expect(await ws.nextMediaId(p.id)).toBe("m1");
    await ws.addMedia(p.id, m1);
    expect((await ws.mustGet(p.id)).media).toEqual([m1]);
    expect(await ws.nextMediaId(p.id)).toBe("m2");
    expect(ws.mediaPath(p.id, "m1", "proxy.mp4")).toMatch(/media[\\/]m1[\\/]proxy\.mp4$/);
    expect(() => ws.mediaPath(p.id, "../x", "a")).toThrow();
  });

  it("returns null for an unknown or malformed id", async () => {
    const ws = createWorkspace(root);
    expect(await ws.get("nope")).toBeNull();
    expect(await ws.get("../etc")).toBeNull();
  });

  it("numbers versions and records who made them", async () => {
    const ws = createWorkspace(root);
    const p = await ws.create();
    const t = appendMedia(emptyTimeline(), { id: "m1", durationS: 120 }, []);
    expect(await ws.writeTimeline(p.id, t, { source: "claude", label: "cut pauses", summary: "Cut 3 pauses", changedRange: { start: 0, end: 12 } })).toBe(2);
    const after = await ws.mustGet(p.id);
    expect(after).toMatchObject({ current: 2, status: "EDITED" });
    expect(after.versions[1]).toMatchObject({ n: 2, source: "claude", summary: "Cut 3 pauses", changedRange: { start: 0, end: 12 } });
  });

  it("drops the redo branch when a new change follows an undo", async () => {
    const ws = createWorkspace(root);
    const p = await ws.create();
    for (const label of ["two", "three", "four"]) await ws.writeTimeline(p.id, emptyTimeline(), { source: "hand", label });
    await ws.setCurrent(p.id, 2);
    expect(await ws.writeTimeline(p.id, emptyTimeline(), { source: "hand", label: "new" })).toBe(3);
    expect((await ws.mustGet(p.id)).versions.map((v) => v.label)).toEqual(["New edit", "two", "new"]);
  });

  it("refuses a version that does not exist and paths outside the project", async () => {
    const ws = createWorkspace(root);
    const p = await ws.create();
    await expect(ws.setCurrent(p.id, 3)).rejects.toThrow();
    expect(() => ws.path(p.id, "..", "x")).toThrow();
  });
});
