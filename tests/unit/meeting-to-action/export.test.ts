import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, it } from "vitest";
import { draftEmail } from "@/features/meeting-to-action/services/draft-email";
import { templateEmail } from "@/features/meeting-to-action/services/email-template";
import { toCsv, toEmailText, toMarkdown, toSlack } from "@/features/meeting-to-action/services/export";
import type { Action, MeetingOutput } from "@/features/meeting-to-action/types";
import type { ProviderEntry } from "@/lib/ai/provider";
import { getClient } from "@/services/clients";

const leveric = getClient("leveric")!;

const action = (over: Partial<Action>): Action => ({
  id: "a1",
  task: "Reply to Ruth",
  owner: "Jaz",
  due: "2026-10-27",
  dueText: "tomorrow night",
  priority: "normal",
  quote: "reply to Ruth",
  timestamp: "14:43",
  confidence: "high",
  flags: [],
  ...over,
});

const output: MeetingOutput = {
  actions: [
    action({}),
    action({ id: "a2", task: 'Fix CI, then "ship"\nsoon', owner: "Unassigned", due: "No date", dueText: null, flags: ["owner-unknown"] }),
  ],
  decisions: [{ text: "Keep the same phone numbers", quote: "same numbers", verified: true }],
  openQuestions: [],
  email: { subject: "Actions from L10", body: "Hi team" },
  warnings: [],
};

describe("toCsv", () => {
  it("writes a header and quotes commas, double quotes and newlines", () => {
    const csv = toCsv(output);
    expect(csv.split("\r\n")[0]).toBe("task,owner,due,priority,quote,timestamp");
    expect(csv).toContain('"Fix CI, then ""ship""\nsoon",Unassigned,No date');
  });
});

describe("toCsv formula safety", () => {
  it("prefixes cells that a spreadsheet would run as a formula", () => {
    const risky = { ...output, actions: [action({ task: "=HYPERLINK(\"http://x\")", quote: "+1 call", owner: "Jaz" })] };
    const row = toCsv(risky).split("\r\n")[1];
    expect(row.startsWith(`"'=HYPERLINK`)).toBe(true);
    expect(row).toContain("'+1 call");
  });
});

describe("toMarkdown", () => {
  it("groups actions by owner and lists unassigned work under Needs an owner", () => {
    const md = toMarkdown(output, leveric);
    expect(md).toContain("### Jaz");
    expect(md).toContain("### Needs an owner");
    expect(md.indexOf("### Jaz")).toBeLessThan(md.indexOf("### Needs an owner"));
    expect(md).toContain("## Decisions");
  });
});

describe("toSlack", () => {
  it("uses the Slack handle when the roster has one, else the name", () => {
    const withHandle = { ...leveric, team: leveric.team.map((m) => (m.name === "Jaz" ? { ...m, slack: "jaz.dev" } : m)) };
    expect(toSlack(output, withHandle)).toContain("@jaz.dev");
    expect(toSlack(output, leveric)).toContain("Jaz");
    expect(toSlack(output, leveric)).not.toContain("@Jaz");
  });
});

describe("toEmailText", () => {
  it("puts the subject first", () => {
    expect(toEmailText(output).startsWith("Subject: Actions from L10\n\nHi team")).toBe(true);
  });
});

describe("templateEmail", () => {
  it("lists actions by owner, asks for owners of unassigned work and signs off in the client's voice", () => {
    const email = templateEmail(output, leveric, "L10");
    expect(email.subject).toBe("Actions from L10");
    expect(email.body).toContain("Jaz");
    expect(email.body).toContain("Needs an owner");
    expect(email.body.trim().endsWith("Cheers, Josh")).toBe(true);
  });
});

describe("draftEmail", () => {
  it("falls back to the template when no model can draft it", async () => {
    const failing = new MockLanguageModelV4({
      doGenerate: async () => {
        throw new Error("down");
      },
    });
    const providers: ProviderEntry[] = [{ name: "ollama", model: "m", timeoutMs: 1000, maxOutputTokens: 2048, create: () => failing }];
    const { email, cost } = await draftEmail({ checked: output, client: leveric, title: "L10", providers });
    expect(email.body.trim().endsWith("Cheers, Josh")).toBe(true);
    expect(cost).toBeNull();
  });
});
