import { describe, expect, it } from "vitest";
import {
  clipAt,
  duration,
  editCaption,
  insertClip,
  move,
  outputRangeToSource,
  remove,
  setCaptions,
  setFormat,
  split,
  toOutput,
  toSource,
  trim,
  visibleCaptions,
} from "@/features/video-to-variations/services/timeline-ops";
import type { Timeline } from "@/features/video-to-variations/types";

// Two clips of one video, reordered: source 20-30 plays first, then source 0-10.
const base: Timeline = {
  format: "9:16",
  clips: [
    { id: "b", mediaId: "m1", start: 20, end: 30 },
    { id: "a", mediaId: "m1", start: 0, end: 10 },
  ],
  captions: {
    enabled: true,
    cards: [
      { id: "c1", mediaId: "m1", start: 2, end: 4, text: "first card", emphasis: [1] },
      { id: "c2", mediaId: "m1", start: 25, end: 27, text: "second card", emphasis: [] },
      { id: "c3", mediaId: "m1", start: 8, end: 12, text: "across the cut", emphasis: [] },
    ],
  },
  titles: [],
};

describe("time mapping", () => {
  it("adds up the clip lengths", () => {
    expect(duration(base)).toBe(20);
  });

  it("maps output time to the right clip after a reorder", () => {
    expect(toSource(base, 5)).toEqual({ clipIndex: 0, sourceS: 25 });
    expect(toSource(base, 10)).toEqual({ clipIndex: 1, sourceS: 0 });
    expect(toSource(base, 20)).toEqual({ clipIndex: 1, sourceS: 10 });
    expect(toSource(base, 20.5)).toBeNull();
  });

  it("maps source time in a clip back to output time", () => {
    expect(toOutput(base, 1, 3)).toBe(13);
    expect(clipAt(base, 12)).toBe(1);
  });

  it("turns an output range into source ranges per clip", () => {
    expect(outputRangeToSource(base, { start: 8, end: 12 })).toEqual([
      { mediaId: "m1", start: 28, end: 30 },
      { mediaId: "m1", start: 0, end: 2 },
    ]);
  });
});

describe("hand edits", () => {
  it("splits the clip under the playhead into two", () => {
    const out = split(base, 4);
    expect(out.clips.map((c) => [c.start, c.end])).toEqual([
      [20, 24],
      [24, 30],
      [0, 10],
    ]);
    expect(out.clips[0].id).toBe("b");
    expect(out.clips[1]).toMatchObject({ mediaId: "m1" });
    expect(out.clips[1].id).not.toBe("b");
  });

  it("does nothing when splitting at a clip edge", () => {
    expect(split(base, 0)).toBe(base);
    expect(split(base, 10)).toBe(base);
  });

  it("trims a clip edge but never past the other edge or the source", () => {
    expect(trim(base, "a", "end", 6, 100).clips[1]).toEqual({ id: "a", mediaId: "m1", start: 0, end: 6 });
    expect(trim(base, "a", "start", 50, 100).clips[1].start).toBeCloseTo(9.9);
    expect(trim(base, "b", "end", 500, 100).clips[0].end).toBe(100);
    expect(trim(base, "b", "start", -3, 100).clips[0].start).toBe(0);
  });

  it("removes clips, down to an empty edit", () => {
    const one = remove(base, "b");
    expect(one.clips.map((c) => c.id)).toEqual(["a"]);
    expect(remove(one, "a").clips).toEqual([]);
  });

  it("moves a clip to a new position", () => {
    expect(move(base, "a", 0).clips.map((c) => c.id)).toEqual(["a", "b"]);
  });

  it("edits caption text and drops emphasis past the last word", () => {
    const out = editCaption(base, "c1", "only");
    expect(out.captions.cards[0]).toMatchObject({ text: "only", emphasis: [] });
  });

  it("switches captions and format", () => {
    expect(setCaptions(base, false).captions.enabled).toBe(false);
    expect(setFormat(base, "16:9").format).toBe("16:9");
  });
});

describe("visibleCaptions", () => {
  it("places cards in output time after a reorder", () => {
    const cards = visibleCaptions(base);
    expect(cards.find((c) => c.id === "c2")).toMatchObject({ start: 5, end: 7 });
    expect(cards.find((c) => c.id === "c1")).toMatchObject({ start: 12, end: 14, emphasis: [1] });
  });

  it("keeps only the part of a card that plays when a cut runs through it", () => {
    const parts = visibleCaptions(base).filter((c) => c.id === "c3");
    expect(parts).toEqual([{ id: "c3", start: 18, end: 20, text: "across the cut", emphasis: [] }]);
  });

  it("shows a card only over clips of its own video", () => {
    const mixed: Timeline = {
      ...base,
      clips: [{ id: "x", mediaId: "m2", start: 0, end: 10 }, ...base.clips],
      captions: { enabled: true, cards: [{ id: "m2card", mediaId: "m2", start: 1, end: 2, text: "other video", emphasis: [] }, ...base.captions.cards] },
    };
    const shown = visibleCaptions(mixed);
    expect(shown.filter((c) => c.id === "m2card")).toEqual([{ id: "m2card", start: 1, end: 2, text: "other video", emphasis: [] }]);
    expect(shown.find((c) => c.id === "c2")).toMatchObject({ start: 15, end: 17 });
  });

  it("shows nothing when captions are off", () => {
    expect(visibleCaptions(setCaptions(base, false))).toEqual([]);
  });
});

describe("insertClip", () => {
  it("puts a whole video at a position on the timeline", () => {
    const out = insertClip(base, "m2", 0, 12, 1);
    expect(out.clips.map((c) => [c.mediaId, c.start, c.end])).toEqual([
      ["m1", 20, 30],
      ["m2", 0, 12],
      ["m1", 0, 10],
    ]);
    expect(new Set(out.clips.map((c) => c.id)).size).toBe(3);
  });

  it("appends when the position is past the end", () => {
    expect(insertClip(base, "m2", 0, 5, 99).clips.at(-1)).toMatchObject({ mediaId: "m2" });
  });
});
