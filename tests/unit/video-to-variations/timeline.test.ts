import { describe, expect, it } from "vitest";
import { timelineSchema } from "@/features/video-to-variations/schemas/timeline.schema";
import { appendMedia, emptyTimeline, normaliseTimeline } from "@/features/video-to-variations/services/timeline";
import type { Timeline } from "@/features/video-to-variations/types";

const media = [
  { id: "m1", durationS: 100 },
  { id: "m2", durationS: 30 },
];
const t = (clips: Timeline["clips"]): Timeline => ({ format: "9:16", clips, captions: { enabled: false, cards: [] }, titles: [] });

describe("normaliseTimeline", () => {
  it("keeps the clip order the user chose", () => {
    const out = normaliseTimeline(t([{ id: "b", mediaId: "m2", start: 5, end: 10 }, { id: "a", mediaId: "m1", start: 0, end: 10 }]), media);
    expect(out.clips.map((c) => c.id)).toEqual(["b", "a"]);
  });

  it("clamps each clip to its own media and drops slivers", () => {
    const out = normaliseTimeline(t([{ id: "a", mediaId: "m1", start: -5, end: 10 }, { id: "b", mediaId: "m2", start: 25, end: 90 }, { id: "c", mediaId: "m1", start: 20, end: 20.05 }]), media);
    expect(out.clips).toEqual([
      { id: "a", mediaId: "m1", start: 0, end: 10 },
      { id: "b", mediaId: "m2", start: 25, end: 30 },
    ]);
  });

  it("drops clips and cards of unknown media and repeated ids", () => {
    const out = normaliseTimeline(
      {
        ...t([
          { id: "a", mediaId: "m1", start: 0, end: 10 },
          { id: "a", mediaId: "m1", start: 20, end: 30 },
          { id: "x", mediaId: "m9", start: 0, end: 5 },
        ]),
        captions: { enabled: true, cards: [{ id: "c", mediaId: "m9", start: 0, end: 1, text: "x", emphasis: [] }] },
      },
      media,
    );
    expect(out.clips).toHaveLength(2);
    expect(new Set(out.clips.map((c) => c.id)).size).toBe(2);
    expect(out.captions.cards).toEqual([]);
  });

  it("allows an empty edit", () => {
    expect(normaliseTimeline(t([]), media).clips).toEqual([]);
  });
});

describe("emptyTimeline and appendMedia", () => {
  it("starts empty, 9:16, captions off", () => {
    expect(emptyTimeline()).toEqual({ format: "9:16", clips: [], captions: { enabled: false, cards: [] }, titles: [] });
    expect(timelineSchema.safeParse(emptyTimeline()).success).toBe(true);
  });

  it("adds a whole video to the end with its caption cards", () => {
    const one = appendMedia(emptyTimeline(), { id: "m1", durationS: 42.5 }, [
      { i: 0, text: "Hello", start: 0.2, end: 0.5 },
      { i: 1, text: "there.", start: 0.5, end: 0.9 },
    ]);
    const two = appendMedia(one, { id: "m2", durationS: 10 }, []);
    expect(two.clips).toEqual([
      { id: expect.any(String), mediaId: "m1", start: 0, end: 42.5 },
      { id: expect.any(String), mediaId: "m2", start: 0, end: 10 },
    ]);
    expect(two.captions.cards).toEqual([{ id: expect.any(String), mediaId: "m1", start: 0.2, end: 0.9, text: "Hello there.", emphasis: [] }]);
    expect(timelineSchema.safeParse(two).success).toBe(true);
  });
});
