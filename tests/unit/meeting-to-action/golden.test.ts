import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { checkActions, normalise } from "@/features/meeting-to-action/services/check-actions";
import { parseTranscript, toPromptText } from "@/features/meeting-to-action/services/parse-transcript";
import type { Extraction } from "@/features/meeting-to-action/types";
import { getClient } from "@/services/clients";

/** Golden tests on recorded model responses (see record-fixtures.test.ts), so no model is called. */
const dir = "tests/fixtures/meeting-to-action";

function load(transcriptFile: string, responseFile: string, clientId: string, date: string) {
  const parsed = parseTranscript(readFileSync(`${dir}/${transcriptFile}`, "utf8"));
  const text = toPromptText(parsed.segments);
  const { extraction } = JSON.parse(readFileSync(`${dir}/${responseFile}`, "utf8")) as { extraction: Extraction };
  const client = getClient(clientId)!;
  return { parsed, text, client, checked: checkActions(extraction, text, client, date) };
}

describe("golden: Leveric L10 (real meeting)", () => {
  const { parsed, text, client, checked } = load("leveric-l10.md", "l10-model-response.json", "leveric", "2026-10-26");
  const tasks = checked.actions.map((a) => a.task.toLowerCase());

  it("captures every action item the recorder flagged", () => {
    for (const keyword of ["preview", "draft", "ruth", "melissa", "fathom"]) {
      expect(tasks.some((t) => t.includes(keyword)), keyword).toBe(true);
    }
    expect(parsed.actionLines).toHaveLength(5);
  });

  it("only uses roster names or Unassigned as owners", () => {
    const roster = client.team.map((m) => m.name);
    for (const a of checked.actions) expect([...roster, "Unassigned"]).toContain(a.owner);
  });

  it("never invents a date: every resolved due date was said with its action", () => {
    const lines = text.split("\n").map(normalise);
    for (const a of checked.actions.filter((x) => x.due !== "No date")) {
      const due = normalise(a.dueText!);
      const quote = normalise(a.quote);
      expect(quote.includes(due) || lines.some((l) => l.includes(quote) && l.includes(due)), a.task).toBe(true);
    }
  });

  it("assigns the CI-on-drafts fix to Yohan and the Fathom send-out to Josh", () => {
    const owner = (kw: string) => checked.actions.find((a) => a.task.toLowerCase().includes(kw))?.owner;
    expect(owner("draft")).toBe("Yohan");
    expect(owner("fathom")).toBe("Josh Batalibasi");
  });
});

describe("golden: Harbourside Accounting (synthetic)", () => {
  const { checked } = load("harbourside-partners.md", "harbourside-model-response.json", "harbourside-accounting", "2026-10-27");
  const find = (kw: string) => checked.actions.find((a) => a.task.toLowerCase().includes(kw));

  it("assigns clearly owned tasks to the right people", () => {
    expect(find("documents")?.owner).toBe("Sophie Tran");
    expect(find("patel")?.owner).toBe("David O'Neill");
    expect(find("kickoff")?.owner).toBe("Liam Walsh");
    expect(find("removalist")?.owner).toBe("Liam Walsh");
  });

  it("resolves stated deadlines against the meeting date", () => {
    expect(find("patel")?.due).toBe("2026-10-28");
    expect(find("documents")?.due).toBe("2026-10-28");
  });

  it("leaves Priya's task unassigned because she is not on the roster", () => {
    const recon = find("reconciliation");
    if (recon) expect(recon.owner).toBe("Unassigned");
    expect(checked.actions.map((a) => a.owner)).not.toContain("Priya");
  });
});
