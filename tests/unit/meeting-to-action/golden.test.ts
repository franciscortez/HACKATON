import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { checkActions, normalise } from "@/features/meeting-to-action/services/check-actions";
import { parseTranscript, toPromptText } from "@/features/meeting-to-action/services/parse-transcript";
import type { Extraction } from "@/features/meeting-to-action/types";

/** Golden tests on recorded model responses (see record-fixtures.test.ts), so no model is called. */
const dir = "tests/fixtures/meeting-to-action";

function load(transcriptFile: string, responseFile: string, date: string) {
  const parsed = parseTranscript(readFileSync(`${dir}/${transcriptFile}`, "utf8"));
  const text = toPromptText(parsed.segments);
  const { extraction } = JSON.parse(readFileSync(`${dir}/${responseFile}`, "utf8")) as { extraction: Extraction };
  return { parsed, text, checked: checkActions(extraction, text, parsed.segments.map((s) => s.speaker), date) };
}

describe("golden: Leveric L10 (real meeting)", () => {
  const { parsed, text, checked } = load("leveric-l10.md", "l10-model-response.json", "2026-10-26");
  const tasks = checked.actions.map((a) => a.task.toLowerCase());

  it("captures every action item the recorder flagged", () => {
    for (const keyword of ["preview", "draft", "ruth", "melissa", "fathom"]) {
      expect(tasks.some((t) => t.includes(keyword)), keyword).toBe(true);
    }
    expect(parsed.actionLines).toHaveLength(5);
  });

  it("only uses people from the meeting or Unassigned as owners", () => {
    for (const a of checked.actions) expect([...checked.people, "Unassigned"]).toContain(a.owner);
    for (const person of checked.people) expect(normalise(text)).toContain(normalise(person.split(" ")[0]));
  });

  it("never invents a date: every resolved due date was said with its action", () => {
    const lines = text.split("\n").map(normalise);
    for (const a of checked.actions.filter((x) => x.due !== "No date")) {
      const due = normalise(a.dueText!);
      const quote = normalise(a.quote);
      expect(quote.includes(due) || lines.some((l) => l.includes(quote) && l.includes(due)), a.task).toBe(true);
    }
  });

  it("never names the wrong person: unclear owners stay Unassigned", () => {
    const owner = (kw: string) => checked.actions.find((a) => a.task.toLowerCase().includes(kw))?.owner;
    expect(["Yohan", "Unassigned"]).toContain(owner("draft"));
    expect(["Yohan", "Unassigned"]).toContain(owner("preview"));
    expect(owner("fathom")).toBe("Josh Batalibasi");
  });
});

describe("golden: partners meeting (synthetic accounting firm, no setup)", () => {
  const { checked } = load("harbourside-partners.md", "harbourside-model-response.json", "2026-10-27");
  const find = (kw: string) => checked.actions.find((a) => a.task.toLowerCase().includes(kw));

  it("assigns clearly owned tasks to the right speakers", () => {
    expect(find("documents")?.owner).toBe("Sophie Tran");
    expect(find("patel")?.owner).toBe("David O'Neill");
    expect(find("kickoff")?.owner).toBe("Liam Walsh");
    expect(find("removalist")?.owner).toBe("Liam Walsh");
  });

  it("resolves stated deadlines against the meeting date", () => {
    expect(find("patel")?.due).toBe("2026-10-28");
    expect(find("documents")?.due).toBe("2026-10-28");
  });

  it("offers the meeting's speakers as owner choices", () => {
    expect(checked.people).toEqual(expect.arrayContaining(["Margaret Chen", "David O'Neill", "Sophie Tran", "Liam Walsh"]));
  });
});
