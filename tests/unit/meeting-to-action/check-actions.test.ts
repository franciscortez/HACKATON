import { describe, expect, it } from "vitest";
import { checkActions, matchOwner, meetingPeople, normalise, resolveDue } from "@/features/meeting-to-action/services/check-actions";
import type { Extraction } from "@/features/meeting-to-action/types";

const transcript = [
  "[8:13] Jaz: It's just the latest videos from Ruth.",
  "[14:43] Josh Batalibasi (Leveric): just get a nice little reply now, say no worries, we'll be up there by like, say tomorrow night",
  "[15:00] Yohan: Melissa already has Formula access.",
].join("\n");
const speakers = ["Jaz", "Josh Batalibasi (Leveric)", "Yohan", "Jaz"];

const action = (over: Partial<Extraction["actions"][number]>): Extraction["actions"][number] => ({
  task: "Reply to Ruth about the latest videos",
  owner: "Jaz",
  dueText: "tomorrow night",
  priority: "normal",
  quote: "say no worries, we'll be up there by like, say tomorrow night",
  timestamp: "14:43",
  ...over,
});

const check = (actions: Extraction["actions"], extra: Partial<Extraction> = {}) =>
  checkActions({ actions, decisions: [], openQuestions: [], ...extra }, transcript, speakers, "2026-10-26");

describe("normalise", () => {
  it("ignores case, curly quotes and extra whitespace", () => {
    expect(normalise("It’s  just\nthe LATEST")).toBe(normalise("it's just the latest"));
  });
});

describe("meetingPeople", () => {
  it("lists each speaker once, without organisation suffixes, in order", () => {
    expect(meetingPeople(speakers)).toEqual(["Jaz", "Josh Batalibasi", "Yohan"]);
  });
});

describe("matchOwner", () => {
  const people = meetingPeople(speakers);

  it("matches a first name or a partial name to the speaker", () => {
    expect(matchOwner("josh", people, transcript)).toBe("Josh Batalibasi");
    expect(matchOwner("Josh Batalibasi (Leveric)", people, transcript)).toBe("Josh Batalibasi");
  });

  it("accepts someone who is named in the transcript but does not speak", () => {
    expect(matchOwner("Melissa", people, transcript)).toBe("Melissa");
  });

  it("returns null for a name that never appears in the meeting", () => {
    expect(matchOwner("Priya", people, transcript)).toBeNull();
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
  it("keeps a verified action with a meeting owner and resolved date at high confidence", () => {
    const [a] = check([action({})]).actions;
    expect(a).toMatchObject({ owner: "Jaz", due: "2026-10-27", dueText: "tomorrow night", confidence: "high", flags: [] });
  });

  it("verifies a quote that differs only by curly quotes and spacing", () => {
    const [a] = check([action({ quote: "It’s just  the latest videos from Ruth", dueText: null })]).actions;
    expect(a.flags).not.toContain("ambiguous");
  });

  it("never guesses: null owner and date become Unassigned and No date with flags", () => {
    const [a] = check([action({ owner: null, dueText: null })]).actions;
    expect(a).toMatchObject({ owner: "Unassigned", due: "No date", confidence: "medium" });
    expect(a.flags).toEqual(["owner-unknown", "date-unknown"]);
  });

  it("treats the text 'null' from a model as no owner and no date", () => {
    const [a] = check([action({ owner: "null", dueText: "null" })]).actions;
    expect(a).toMatchObject({ owner: "Unassigned", due: "No date" });
    expect(a.flags).toContain("owner-unknown");
  });

  it("flags an owner who is not in the meeting and leaves the task unassigned", () => {
    const [a] = check([action({ owner: "Priya" })]).actions;
    expect(a.owner).toBe("Unassigned");
    expect(a.flags).toContain("owner-not-in-transcript");
  });

  it("lists speakers plus named owners as the people to choose from", () => {
    const out = check([action({ owner: "Melissa", quote: "Melissa already has Formula access.", dueText: null })]);
    expect(out.people).toEqual(["Jaz", "Josh Batalibasi", "Yohan", "Melissa"]);
    expect(out.actions[0].owner).toBe("Melissa");
  });

  it("ignores a deadline that is not in the action's own quote (no invented dates)", () => {
    const [a] = check([action({ dueText: "tomorrow night", quote: "It's just the latest videos from Ruth." })]).actions;
    expect(a.due).toBe("No date");
    expect(a.flags).toContain("date-unknown");
  });

  it("marks an unverifiable quote as ambiguous with low confidence", () => {
    const [a] = check([action({ quote: "We agreed to rebuild the whole website." })]).actions;
    expect(a).toMatchObject({ confidence: "low" });
    expect(a.flags).toContain("ambiguous");
  });

  it("marks decisions and questions as verified only when their quote is found", () => {
    const out = check([], {
      decisions: [{ text: "Reply to Ruth", quote: "latest videos from Ruth" }],
      openQuestions: [{ text: "Made up", quote: "never said" }],
    });
    expect(out.decisions[0].verified).toBe(true);
    expect(out.openQuestions[0].verified).toBe(false);
  });
});
