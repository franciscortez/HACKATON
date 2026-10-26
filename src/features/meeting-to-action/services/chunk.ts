import type { Extraction } from "@/features/meeting-to-action/types";

/**
 * Splits prompt text into chunks of at most `maxChars`, on line breaks, repeating the last
 * line of each chunk at the start of the next so an action said across the break is not lost.
 */
export function chunkText(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) return [text];
  const lines = text.split("\n").flatMap((line) => hardSplit(line, maxChars));
  const chunks: string[] = [];
  let current: string[] = [];

  for (const line of lines) {
    const candidate = [...current, line].join("\n");
    if (candidate.length > maxChars && current.length) {
      chunks.push(current.join("\n"));
      const overlap = current.at(-1)!;
      current = overlap.length + 1 + line.length <= maxChars ? [overlap, line] : [line];
    } else {
      current.push(line);
    }
  }
  if (current.length) chunks.push(current.join("\n"));
  return chunks;
}

function hardSplit(line: string, maxChars: number): string[] {
  if (line.length <= maxChars) return [line];
  const parts: string[] = [];
  for (let i = 0; i < line.length; i += maxChars) parts.push(line.slice(i, i + maxChars));
  return parts;
}

const words = (s: string) => new Set(s.toLowerCase().match(/[a-z0-9]+/g) ?? []);

function similar(a: string, b: string): boolean {
  const wa = words(a);
  const wb = words(b);
  const shared = [...wa].filter((w) => wb.has(w)).length;
  return shared / Math.max(wa.size, wb.size, 1) >= 0.6;
}

const key = (s: string | null) => (s ?? "").trim().toLowerCase();

/** Joins chunk results in order, dropping actions, decisions and questions repeated by the overlap. */
export function mergeExtractions(parts: Extraction[]): Extraction {
  const merged: Extraction = { actions: [], decisions: [], openQuestions: [] };
  for (const part of parts) {
    for (const action of part.actions) {
      const duplicate = merged.actions.some(
        (m) => key(m.owner) === key(action.owner) && (key(m.quote) === key(action.quote) || similar(m.task, action.task)),
      );
      if (!duplicate) merged.actions.push(action);
    }
    for (const d of part.decisions) if (!merged.decisions.some((m) => key(m.quote) === key(d.quote))) merged.decisions.push(d);
    for (const q of part.openQuestions) if (!merged.openQuestions.some((m) => key(m.quote) === key(q.quote))) merged.openQuestions.push(q);
  }
  return merged;
}
