import type { Action, CheckedOutput, MeetingOutput } from "@/features/meeting-to-action/types";

const UNASSIGNED = "Unassigned";

/** Actions grouped by owner in the order people appear in the meeting, with unassigned work last. */
export function groupByOwner(actions: Action[], people: string[]): Array<{ owner: string; actions: Action[] }> {
  const owners = actions.map((a) => a.owner).filter((o) => o !== UNASSIGNED);
  const order = [...new Set([...people, ...owners]), UNASSIGNED];
  return order.map((owner) => ({ owner, actions: actions.filter((a) => a.owner === owner) })).filter((g) => g.actions.length > 0);
}

const heading = (owner: string) => (owner === UNASSIGNED ? "Needs an owner" : owner);
const due = (a: Action) => (a.due === "No date" ? "no date" : `due ${a.due}`);

export function toMarkdown(output: CheckedOutput): string {
  const parts = ["## Actions"];
  for (const group of groupByOwner(output.actions, output.people)) {
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

export function toSlack(output: CheckedOutput): string {
  const lines = ["*Actions from the meeting*"];
  for (const group of groupByOwner(output.actions, output.people)) {
    lines.push(`\n*${heading(group.owner)}*`);
    for (const a of group.actions) lines.push(`• ${a.task} (${due(a)})`);
  }
  return lines.join("\n");
}

export function toEmailText(output: Pick<MeetingOutput, "email">): string {
  return `Subject: ${output.email.subject}\n\n${output.email.body}`;
}
