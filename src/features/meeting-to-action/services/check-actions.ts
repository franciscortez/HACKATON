import type { Action, ActionFlag, CheckedOutput, Extraction } from "@/features/meeting-to-action/types";
import type { ClientConfig } from "@/schemas/client.schema";

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

/** Lowercase, straight quotes, single spaces, no trailing punctuation: for comparing quotes. */
export function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’`´]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .replace(/[\s.,!?;:]+$/, "")
    .trim();
}

/** Roster name for a name the model gave, or null when it is not on the roster. */
export function matchOwner(name: string, client: ClientConfig): string | null {
  const wanted = normalise(name.replace(/\(.*?\)/g, ""));
  if (!wanted) return null;
  for (const member of client.team) {
    const full = normalise(member.name);
    const names = [full, full.split(" ")[0], ...member.aliases.map(normalise)];
    if (names.includes(wanted) || full.startsWith(`${wanted} `) || wanted.startsWith(`${full} `)) return member.name;
  }
  return null;
}

/** ISO date for a spoken deadline, relative to the meeting date. Null when it is too vague to pin down. */
export function resolveDue(dueText: string, meetingDate: string): string | null {
  const text = dueText.toLowerCase();
  const iso = /\b(\d{4}-\d{2}-\d{2})\b/.exec(text);
  if (iso) return iso[1];
  const base = new Date(`${meetingDate}T00:00:00Z`);
  const plus = (days: number) => new Date(base.getTime() + days * 86_400_000).toISOString().slice(0, 10);
  if (/\btomorrow\b/.test(text)) return plus(1);
  if (/\b(today|tonight)\b/.test(text)) return plus(0);
  const day = WEEKDAYS.findIndex((d) => text.includes(d));
  if (day !== -1) return plus(((day - base.getUTCDay() + 6) % 7) + 1);
  return null;
}

/**
 * Turns the model's extraction into the reviewed register: owners must be on the roster,
 * dates must be stated, quotes must exist in the transcript. Unknowns stay unknown.
 */
export function checkActions(extraction: Extraction, transcriptText: string, client: ClientConfig, meetingDate: string): CheckedOutput {
  const haystack = normalise(transcriptText);
  const lines = transcriptText.split("\n").map(normalise);
  const found = (quote: string) => normalise(quote).length > 0 && haystack.includes(normalise(quote));
  // A deadline counts only if it was said with the action: in the quote or on the quote's line.
  const saidWithQuote = (dueText: string, quote: string) => {
    const due = normalise(dueText);
    const q = normalise(quote);
    return q.includes(due) || lines.some((line) => line.includes(q) && line.includes(due));
  };

  const actions: Action[] = extraction.actions.map((a, i) => {
    const flags: ActionFlag[] = [];
    let owner = "Unassigned";
    if (a.owner === null || !a.owner.trim()) flags.push("owner-unknown");
    else {
      const matched = matchOwner(a.owner, client);
      if (matched) owner = matched;
      else flags.push("owner-not-in-roster");
    }
    const resolved = a.dueText && saidWithQuote(a.dueText, a.quote) ? resolveDue(a.dueText, meetingDate) : null;
    if (!resolved) flags.push("date-unknown");
    const verified = found(a.quote);
    if (!verified) flags.push("ambiguous");

    return {
      id: `a${i + 1}`,
      task: a.task,
      owner,
      due: resolved ?? "No date",
      dueText: a.dueText,
      priority: a.priority,
      quote: a.quote,
      timestamp: a.timestamp,
      confidence: !verified ? "low" : flags.length ? "medium" : "high",
      flags,
    };
  });

  return {
    actions,
    decisions: extraction.decisions.map((d) => ({ ...d, verified: found(d.quote) })),
    openQuestions: extraction.openQuestions.map((q) => ({ ...q, verified: found(q.quote) })),
  };
}
