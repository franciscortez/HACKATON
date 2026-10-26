import { describe, expect, it } from "vitest";
import { clock, fitZoom, parseClock, rulerStep, thumbIndex } from "@/features/video-to-variations/components/client";

describe("time text", () => {
  it("formats seconds as m:ss.s", () => {
    expect(clock(21.3)).toBe("0:21.3");
    expect(clock(65)).toBe("1:05.0");
  });

  it("reads m:ss, m:ss.s and plain seconds", () => {
    expect(parseClock("1:05")).toBe(65);
    expect(parseClock("0:21.3")).toBeCloseTo(21.3);
    expect(parseClock("12")).toBe(12);
    expect(parseClock("soon")).toBeNull();
    expect(parseClock("")).toBeNull();
  });
});

describe("timeline scale", () => {
  it("picks ruler ticks at least 64 px apart", () => {
    expect(rulerStep(100)).toBe(1);
    expect(rulerStep(20)).toBe(5);
    expect(rulerStep(2)).toBe(60);
    expect(rulerStep(0.1)).toBe(600);
  });

  it("fits the whole edit into the visible width, within limits", () => {
    expect(fitZoom(60, 1200)).toBe(20);
    expect(fitZoom(0.5, 1200)).toBe(200);
    expect(fitZoom(3600, 600)).toBe(0.5);
  });

  it("maps a source second to its thumbnail (one every 2 s, numbered from 1)", () => {
    expect(thumbIndex(0, 100)).toBe(1);
    expect(thumbIndex(3.9, 100)).toBe(2);
    expect(thumbIndex(500, 100)).toBe(50);
  });
});
