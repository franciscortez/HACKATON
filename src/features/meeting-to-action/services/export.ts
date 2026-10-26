import type { Action, CheckedOutput, MeetingOutput } from "@/features/meeting-to-action/types";
import type { ClientConfig } from "@/schemas/client.schema";

const UNASSIGNED = "Unassigned";

/** Actions grouped by owner in roster order, with unassigned work last. */
export function groupByOwner(actions: Action[], client: ClientConfig): Array<{ owner: string; actions: Action[] }> {
  const order = [...client.team.map((m) => m.name), UNASSIGNED];
  return order
    .map((owner) => ({ owner, actions: actions.filter((a) => a.owner === owner) }))
    .filter((g) => g.actions.length > 0);
}

const heading = (owner: string) => (owner === UNASSIGNED ? "Needs an owner" : owner);
const due = (a: Action) => (a.due === "No date" ? "no date" : `due ${a.due}`);

export function toMarkdown(output: CheckedOutput, client: ClientConfig): string {
  const parts = ["## Actions"];
  for (const group of groupByOwner(output.actions, client)) {
    parts.push(`\n### ${heading(group.owner)}`);
    for (const a of group.actions) parts.push(`- [ ] ${a.task} (${due(a)})\n  > "${a.quote}"${a.timestamp ? ` [${a.timestamp}]` : ""}`);
  }
  if (output.decisions.length) parts.push("\n## Decisions", ...output.decisions.map((d) => `- ${d.text}`));
  if (output.openQuestions.length) parts.push("\n## Open questions", ...output.openQuestions.map((q) => `- ${q.text}`));
  return `${parts.join("\n")}\n`;
}

function csvCell(value: string | null): string {
  // Text from transcripts and models must never run as a spreadsheet formula.
  const raw = value ?? "";
  const text = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

export function toCsv(output: CheckedOutput): string {
  const rows = [["task", "owner", "due", "priority", "quote", "timestamp"]];
  for (const a of output.actions) rows.push([a.task, a.owner, a.due, a.priority, a.quote, a.timestamp ?? ""]);
  return `${rows.map((r) => r.map(csvCell).join(",")).join("\r\n")}\r\n`;
}

export function toSlack(output: CheckedOutput, client: ClientConfig): string {
  const mention = (owner: string) => {
    const handle = client.team.find((m) => m.name === owner)?.slack;
    return handle ? `@${handle}` : owner;
  };
  const lines = ["*Actions from the meeting*"];
  for (const group of groupByOwner(output.actions, client)) {
    lines.push(`\n*${group.owner === UNASSIGNED ? "Needs an owner" : mention(group.owner)}*`);
    for (const a of group.actions) lines.push(`• ${a.task} (${due(a)})`);
  }
  return lines.join("\n");
}

export function toEmailText(output: Pick<MeetingOutput, "email">): string {
  return `Subject: ${output.email.subject}\n\n${output.email.body}`;
}
