import { describe, expect, it } from "vitest";
import { chunkText, mergeExtractions } from "@/features/meeting-to-action/services/chunk";
import type { Extraction } from "@/features/meeting-to-action/types";

describe("chunkText", () => {
  it("keeps short transcripts in one chunk", () => {
    expect(chunkText("a\nb\nc", 100)).toEqual(["a\nb\nc"]);
  });

  it("splits on line breaks under the size limit with one line of overlap", () => {
    const lines = Array.from({ length: 10 }, (_, i) => `line ${i} ${"x".repeat(20)}`);
    const chunks = chunkText(lines.join("\n"), 90);
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) expect(c.length).toBeLessThanOrEqual(90);
    expect(chunks[1].split("\n")[0]).toBe(chunks[0].split("\n").at(-1));
    expect(chunks.join("\n")).toContain("line 9");
  });

  it("hard-splits a single line longer than the limit", () => {
    const chunks = chunkText("y".repeat(250), 100);
    expect(chunks.every((c) => c.length <= 100)).toBe(true);
    expect(chunks.join("")).toBe("y".repeat(250));
  });
});

describe("mergeExtractions", () => {
  const act = (task: string, owner: string | null, quote: string): Extraction["actions"][number] => ({
    task,
    owner,
    dueText: null,
    priority: "normal",
    quote,
    timestamp: null,
  });

  it("drops duplicates found in overlapping chunks", () => {
    const merged = mergeExtractions([
      { actions: [act("Fix the CI on drafts", "Yohan", "fix the CI")], decisions: [{ text: "d", quote: "q1" }], openQuestions: [] },
      {
        actions: [act("Fix CI on drafts", "Yohan", "fix the CI"), act("Reply to Ruth", "Jaz", "reply")],
        decisions: [{ text: "d", quote: "q1" }],
        openQuestions: [],
      },
    ]);
    expect(merged.actions.map((a) => a.task)).toEqual(["Fix the CI on drafts", "Reply to Ruth"]);
    expect(merged.decisions).toHaveLength(1);
  });

  it("keeps the same task for different owners", () => {
    const merged = mergeExtractions([
      { actions: [act("Send login steps", "Yohan", "a")], decisions: [], openQuestions: [] },
      { actions: [act("Send login steps", "Jaz", "b")], decisions: [], openQuestions: [] },
    ]);
    expect(merged.actions).toHaveLength(2);
  });
});
