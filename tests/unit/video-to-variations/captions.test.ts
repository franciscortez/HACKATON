import { describe, expect, it } from "vitest";
import { chunkCaptions, toAss } from "@/features/video-to-variations/services/captions";
import type { Word } from "@/features/video-to-variations/types";

const w = (i: number, text: string, start: number, end: number): Word => ({ i, text, start, end });

describe("chunkCaptions", () => {
  it("puts at most 6 words on a card", () => {
    const words = Array.from({ length: 14 }, (_, i) => w(i, `w${i}`, i * 0.3, i * 0.3 + 0.25));
    const cards = chunkCaptions(words);
    expect(cards.every((c) => c.words.length <= 6)).toBe(true);
    expect(cards.flatMap((c) => c.words)).toHaveLength(14);
  });

  it("starts a new card after a long gap or the end of a sentence", () => {
    const cards = chunkCaptions([w(0, "Hello.", 0, 0.4), w(1, "Next", 0.5, 0.8), w(2, "after", 2, 2.3)]);
    expect(cards.map((c) => c.words.map((x) => x.text))).toEqual([["Hello."], ["Next"], ["after"]]);
  });
});

describe("toAss", () => {
  const cards = [{ id: "c", start: 0, end: 0.9, text: "this is {for}", emphasis: [1] }];
  const titles = [{ id: "t", text: "Stop editing by hand", start: 0, end: 2 }];

  it("sets a 1080x1920 canvas with a 22% bottom margin for 9:16", () => {
    const ass = toAss(cards, titles, "9:16");
    expect(ass).toContain("PlayResX: 1080");
    expect(ass).toContain("PlayResY: 1920");
    expect(ass).toMatch(/Style: Caption,[^\n]*,422,/);
  });

  it("sets a 1920x1080 canvas with a 12% bottom margin for 16:9", () => {
    const ass = toAss(cards, titles, "16:9");
    expect(ass).toContain("PlayResX: 1920");
    expect(ass).toMatch(/Style: Caption,[^\n]*,130,/);
  });

  it("uppercases words, colours the emphasised word red and escapes braces", () => {
    expect(toAss(cards, [], "9:16")).toContain("THIS {\\c&H1B20E0&}IS{\\c&HFFFFFF&} \\{FOR\\}");
  });

  it("adds titles", () => {
    expect(toAss([], titles, "9:16")).toMatch(/Dialogue: 1,0:00:00\.00,0:00:02\.00,Title,,0,0,0,,STOP EDITING BY HAND/);
  });
});
