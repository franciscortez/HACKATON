import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseTranscript, toPromptText } from "@/features/meeting-to-action/services/parse-transcript";

const fixture = (name: string) => readFileSync(`tests/fixtures/meeting-to-action/${name}`, "utf8");

describe("parseTranscript: Fathom markdown", () => {
  const parsed = parseTranscript(fixture("leveric-l10.md"));

  it("detects the Fathom format and speakers with timestamps", () => {
    expect(parsed.format).toBe("fathom");
    expect(parsed.segments[0]).toMatchObject({ speaker: "Josh Batalibasi (Leveric)", timestamp: "0:13" });
    expect(parsed.segments[0].text).toContain("Happy Monday");
  });

  it("collects the five Fathom action item lines without their links", () => {
    expect(parsed.actionLines).toHaveLength(5);
    expect(parsed.actionLines[0]).toBe("Fix preview branch DB to connect to preview");
  });

  it("produces compact prompt text with no URLs, small enough for a 16k-token local context", () => {
    const text = toPromptText(parsed.segments);
    expect(text).not.toContain("https://");
    // ~4 characters per token; leave room for the system prompt and ~2k output tokens in 16k.
    expect(text.length / 4).toBeLessThan(12_000);
    expect(text.split("\n")[0]).toBe("[0:13] Josh Batalibasi (Leveric): Happy Monday, everyone. How are we? Happy Monday.");
  });
});

describe("parseTranscript: other formats", () => {
  it("reads WebVTT voice tags", () => {
    const parsed = parseTranscript(fixture("sample.vtt"));
    expect(parsed.format).toBe("vtt");
    expect(parsed.segments[0]).toMatchObject({ speaker: "Margaret Chen", timestamp: "0:05" });
  });

  it("reads SRT with 'Name:' prefixes", () => {
    const parsed = parseTranscript(fixture("sample.srt"));
    expect(parsed.format).toBe("srt");
    expect(parsed.segments[1]).toMatchObject({ speaker: "Liam Walsh", timestamp: "0:10" });
    expect(parsed.segments[1].text).toBe("Will do, I'll book it for next Tuesday.");
  });

  it("keeps plain text without speakers as speakerless segments", () => {
    const parsed = parseTranscript(fixture("no-speakers.txt"));
    expect(parsed.format).toBe("plain");
    expect(parsed.segments.length).toBeGreaterThan(0);
    expect(parsed.segments.every((s) => s.speaker === null)).toBe(true);
  });

  it("reads '[m:ss] Name: text' lines, the format the paste box suggests", () => {
    const parsed = parseTranscript("[0:13] Josh: Jaz, can you reply to Ruth by tomorrow night?\n[0:20] Jaz: Yes.");
    expect(parsed.segments[0]).toEqual({ speaker: "Josh", timestamp: "0:13", text: "Jaz, can you reply to Ruth by tomorrow night?" });
    expect(parsed.segments[1].speaker).toBe("Jaz");
  });

  it("reads plain 'Name: text' lines as speakers", () => {
    const parsed = parseTranscript("Josh: Jaz, reply to Ruth by tomorrow night.\nJaz: On it.");
    expect(parsed.segments.map((s) => s.speaker)).toEqual(["Josh", "Jaz"]);
  });
});
