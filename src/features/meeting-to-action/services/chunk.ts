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

const key = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();

/** The same words picked from the shared overlap line: equal quotes, or one inside the other. */
function sameQuote(a: string, b: string): boolean {
  const ka = key(a);
  const kb = key(b);
  return ka.length > 0 && kb.length > 0 && (ka === kb || ka.includes(kb) || kb.includes(ka));
}

/**
 * Joins chunk results in order. Only the overlap between neighbouring chunks can repeat an
 * item, so an item is dropped only when the previous chunk has one with the same quote.
 * Items within one chunk are never merged: losing a real action is worse than a duplicate.
 */
export function mergeExtractions(parts: Extraction[]): Extraction {
  const merged: Extraction = { actions: [], decisions: [], openQuestions: [] };
  parts.forEach((part, i) => {
    const previous = parts[i - 1];
    const repeats = <T extends { quote: string }>(item: T, earlier: T[] | undefined) =>
      (earlier ?? []).some((e) => sameQuote(e.quote, item.quote));
    merged.actions.push(...part.actions.filter((a) => !repeats(a, previous?.actions)));
    merged.decisions.push(...part.decisions.filter((d) => !repeats(d, previous?.decisions)));
    merged.openQuestions.push(...part.openQuestions.filter((q) => !repeats(q, previous?.openQuestions)));
  });
  return merged;
}
