import { describe, expect, it } from "vitest";
import { applyRegisterEdit } from "@/features/meeting-to-action/services/review";
import type { MeetingOutput } from "@/features/meeting-to-action/types";
import { getClient } from "@/services/clients";

const leveric = getClient("leveric")!;
const output: MeetingOutput = {
  actions: [
    { id: "a1", task: "Reply to Ruth", owner: "Josh Batalibasi", due: "No date", dueText: null, priority: "normal", quote: "q", timestamp: null, confidence: "high", flags: [] },
  ],
  decisions: [],
  openQuestions: [],
  email: { subject: "Actions", body: "Josh Batalibasi: Reply to Ruth\n\nCheers, Josh" },
  warnings: [],
};

describe("applyRegisterEdit", () => {
  const edited = output.actions.map((a) => ({ ...a, owner: "Jaz" }));

  it("rebuilds the email from the edited register so it never contradicts the approved owners", () => {
    const next = applyRegisterEdit(output, edited, { emailEdited: false, client: leveric, title: "L10" });
    expect(next.actions[0].owner).toBe("Jaz");
    expect(next.email.body).toContain("Jaz:");
    expect(next.email.body).not.toContain("Josh Batalibasi:");
  });

  it("keeps a hand-edited email as written", () => {
    const next = applyRegisterEdit(output, edited, { emailEdited: true, client: leveric, title: "L10" });
    expect(next.email).toEqual(output.email);
  });
});
