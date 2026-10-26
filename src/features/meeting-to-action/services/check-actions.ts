import type { Action, ActionFlag, CheckedOutput, Extraction } from "@/features/meeting-to-action/types";

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

const cleanName = (name: string) => name.replace(/\(.*?\)/g, "").replace(/\s+/g, " ").trim();

/** Speakers in the order they first spoke, once each, without "(Company)" suffixes. */
export function meetingPeople(speakers: Array<string | null>): string[] {
  const people: string[] = [];
  for (const speaker of speakers) {
    const name = speaker ? cleanName(speaker) : "";
    if (name && !people.some((p) => normalise(p) === normalise(name))) people.push(name);
  }
  return people;
}

/**
 * The person a model-given owner refers to: a speaker (by full, first or partial name), or
 * someone named in the transcript who did not speak. Null when the name never appears.
 */
export function matchOwner(name: string, people: string[], transcriptText: string): string | null {
  const wanted = normalise(cleanName(name));
  if (!wanted) return null;
  for (const person of people) {
    const full = normalise(person);
    if (full === wanted || full.split(" ")[0] === wanted || full.startsWith(`${wanted} `) || wanted.startsWith(`${full} `)) return person;
  }
  const escaped = wanted.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`).test(normalise(transcriptText)) ? cleanName(name) : null;
}

const nullish = (value: string | null) => (value === null || /^\s*(null|none|n\/a|unknown)?\s*$/i.test(value) ? null : value);

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
 * Turns the model's extraction into the reviewed register: owners must be people in the
 * meeting, dates must be stated, quotes must exist in the transcript. Unknowns stay unknown.
 */
export function checkActions(
  extraction: Extraction,
  transcriptText: string,
  speakers: Array<string | null>,
  meetingDate: string,
): CheckedOutput {
  const people = meetingPeople(speakers);
  const haystack = normalise(transcriptText);
  const lines = transcriptText.split("\n").map(normalise);
  const found = (quote: string) => normalise(quote).length > 0 && haystack.includes(normalise(quote));
  // A deadline counts only if it was said with the action: in the quote or on the quote's line.
  const saidWithQuote = (dueText: string, quote: string) => {
    const due = normalise(dueText);
    const q = normalise(quote);
    return q.length > 0 && (q.includes(due) || lines.some((line) => line.includes(q) && line.includes(due)));
  };

  const actions: Action[] = extraction.actions.map((raw, i) => {
    // Some models write the text "null" instead of null.
    const a = { ...raw, owner: nullish(raw.owner), dueText: nullish(raw.dueText) };
    const flags: ActionFlag[] = [];
    let owner = "Unassigned";
    if (a.owner === null || !a.owner.trim()) flags.push("owner-unknown");
    else {
      const matched = matchOwner(a.owner, people, transcriptText);
      if (matched) {
        owner = matched;
        if (!people.includes(matched)) people.push(matched);
      } else flags.push("owner-not-in-transcript");
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
    people,
    decisions: extraction.decisions.map((d) => ({ ...d, verified: found(d.quote) })),
    openQuestions: extraction.openQuestions.map((q) => ({ ...q, verified: found(q.quote) })),
  };
}
