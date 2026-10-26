import { describe, expect, it } from "vitest";
import { checkActions, matchOwner, normalise, resolveDue } from "@/features/meeting-to-action/services/check-actions";
import type { Extraction } from "@/features/meeting-to-action/types";
import { getClient } from "@/services/clients";

const leveric = getClient("leveric")!;
const harbourside = getClient("harbourside-accounting")!;

const transcript = [
  "[8:13] Jaz: It's just the latest videos from Ruth.",
  "[14:43] Josh Batalibasi (Leveric): just get a nice little reply now, say no worries, we'll be up there by like, say tomorrow night",
].join("\n");

const action = (over: Partial<Extraction["actions"][number]>): Extraction["actions"][number] => ({
  task: "Reply to Ruth about the latest videos",
  owner: "Jaz",
  dueText: "tomorrow night",
  priority: "normal",
  quote: "It's just the latest videos from Ruth.",
  timestamp: "8:13",
  ...over,
});

describe("normalise", () => {
  it("ignores case, curly quotes and extra whitespace", () => {
    expect(normalise("It’s  just\nthe LATEST")).toBe(normalise("it's just the latest"));
  });
});

describe("matchOwner", () => {
  it("matches a first name to the full roster name", () => {
    expect(matchOwner("francis", leveric)).toBe("Francis Emil Cortez");
  });

  it("matches a partial full name and a name with an organisation suffix", () => {
    expect(matchOwner("Francis Emil", leveric)).toBe("Francis Emil Cortez");
    expect(matchOwner("Josh Batalibasi (Leveric)", leveric)).toBe("Josh Batalibasi");
  });

  it("matches an alias", () => {
    expect(matchOwner("Maggie", harbourside)).toBe("Margaret Chen");
  });

  it("returns null for someone not in the roster", () => {
    expect(matchOwner("Priya", harbourside)).toBeNull();
  });
});

describe("resolveDue", () => {
  const meeting = "2026-10-26"; // a Monday

  it("resolves tomorrow night to the next day", () => {
    expect(resolveDue("tomorrow night", meeting)).toBe("2026-10-27");
  });

  it("resolves a weekday to its next occurrence", () => {
    expect(resolveDue("by Wednesday", meeting)).toBe("2026-10-28");
    expect(resolveDue("next Tuesday", meeting)).toBe("2026-10-27");
  });

  it("keeps an explicit ISO date", () => {
    expect(resolveDue("2026-11-03", meeting)).toBe("2026-11-03");
  });

  it("returns null for vague deadlines", () => {
    expect(resolveDue("end of next week", meeting)).toBeNull();
    expect(resolveDue("soon", meeting)).toBeNull();
  });
});

describe("checkActions", () => {
  it("keeps a verified action with a roster owner and resolved date at high confidence", () => {
    const quote = "say no worries, we'll be up there by like, say tomorrow night";
    const [a] = checkActions({ actions: [action({ quote })], decisions: [], openQuestions: [] }, transcript, leveric, "2026-10-26").actions;
    expect(a).toMatchObject({ owner: "Jaz", due: "2026-10-27", dueText: "tomorrow night", confidence: "high", flags: [] });
  });

  it("verifies a quote that differs only by curly quotes and spacing", () => {
    const [a] = checkActions(
      { actions: [action({ quote: "It’s just  the latest videos from Ruth" })], decisions: [], openQuestions: [] },
      transcript,
      leveric,
      "2026-10-26",
    ).actions;
    expect(a.flags).not.toContain("ambiguous");
  });

  it("never guesses: null owner and date become Unassigned and No date with flags", () => {
    const [a] = checkActions(
      { actions: [action({ owner: null, dueText: null })], decisions: [], openQuestions: [] },
      transcript,
      leveric,
      "2026-10-26",
    ).actions;
    expect(a).toMatchObject({ owner: "Unassigned", due: "No date", confidence: "medium" });
    expect(a.flags).toEqual(["owner-unknown", "date-unknown"]);
  });

  it("flags an owner who is not in the roster and leaves the task unassigned", () => {
    const [a] = checkActions(
      { actions: [action({ owner: "Priya" })], decisions: [], openQuestions: [] },
      transcript,
      leveric,
      "2026-10-26",
    ).actions;
    expect(a.owner).toBe("Unassigned");
    expect(a.flags).toContain("owner-not-in-roster");
  });

  it("ignores a deadline that is not in the action's own quote (no invented dates)", () => {
    const [a] = checkActions(
      { actions: [action({ dueText: "tomorrow night", quote: "It's just the latest videos from Ruth." })], decisions: [], openQuestions: [] },
      transcript,
      leveric,
      "2026-10-26",
    ).actions;
    expect(a.due).toBe("No date");
    expect(a.flags).toContain("date-unknown");
  });

  it("marks an unverifiable quote as ambiguous with low confidence", () => {
    const [a] = checkActions(
      { actions: [action({ quote: "We agreed to rebuild the whole website." })], decisions: [], openQuestions: [] },
      transcript,
      leveric,
      "2026-10-26",
    ).actions;
    expect(a).toMatchObject({ confidence: "low" });
    expect(a.flags).toContain("ambiguous");
  });

  it("marks decisions and questions as verified only when their quote is found", () => {
    const out = checkActions(
      {
        actions: [],
        decisions: [{ text: "Reply to Ruth", quote: "latest videos from Ruth" }],
        openQuestions: [{ text: "Made up", quote: "never said" }],
      },
      transcript,
      leveric,
      "2026-10-26",
    );
    expect(out.decisions[0].verified).toBe(true);
    expect(out.openQuestions[0].verified).toBe(false);
  });
});
