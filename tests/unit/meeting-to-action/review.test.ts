import { describe, expect, it } from "vitest";
import { applyRegisterEdit } from "@/features/meeting-to-action/services/review";
import type { MeetingOutput } from "@/features/meeting-to-action/types";
import { getSettings } from "@/services/settings";

const settings = getSettings();
const output: MeetingOutput = {
  actions: [
    { id: "a1", task: "Reply to Ruth", owner: "Josh Batalibasi", due: "No date", dueText: null, priority: "normal", quote: "q", timestamp: null, confidence: "high", flags: [] },
  ],
  people: ["Josh Batalibasi", "Jaz"],
  decisions: [],
  openQuestions: [],
  email: { subject: "Actions", body: "Josh Batalibasi: Reply to Ruth\n\nCheers, Josh" },
  warnings: [],
};

describe("applyRegisterEdit", () => {
  const edited = output.actions.map((a) => ({ ...a, owner: "Jaz" }));

  it("rebuilds the email from the edited register so it never contradicts the approved owners", () => {
    const next = applyRegisterEdit(output, edited, { emailEdited: false, settings, title: "L10" });
    expect(next.actions[0].owner).toBe("Jaz");
    expect(next.email.body).toContain("Jaz:");
    expect(next.email.body).not.toContain("Josh Batalibasi:");
  });

  it("keeps a hand-edited email as written", () => {
    const next = applyRegisterEdit(output, edited, { emailEdited: true, settings, title: "L10" });
    expect(next.email).toEqual(output.email);
  });
});
