export interface Segment {
  speaker: string | null;
  timestamp: string | null;
  text: string;
}

export type TranscriptFormat = "fathom" | "vtt" | "srt" | "plain";

export interface ParsedTranscript {
  format: TranscriptFormat;
  segments: Segment[];
  /** Explicit action lines from the recorder (Fathom `**ACTION ITEM: ...**`). */
  actionLines: string[];
}

const FATHOM_HEADER = /^\[@(\d+(?::\d{2}){1,2})\]\([^)]*\)\s*-\s*\*\*(.+?)\*\*\s*$/;
const FATHOM_ACTION = /\*\*ACTION ITEM:\s*(.+?)\s*-\s*\[WATCH\]\([^)]*\)\s*\*\*/;
const CUE_TIME = /^((?:\d{2}:)?\d{2}:\d{2})[.,]\d{3}\s*-->/;
const NAME_PREFIX = /^([A-Z][\p{L} .'’-]{0,40}?):\s+(.+)$/u;

export function parseTranscript(raw: string): ParsedTranscript {
  const text = raw.replace(/\r\n?/g, "\n").trim();
  if (text.startsWith("WEBVTT")) return { format: "vtt", segments: parseCues(text), actionLines: [] };
  if (/^\d+\n\d{2}:\d{2}:\d{2},\d{3}\s*-->/m.test(text)) return { format: "srt", segments: parseCues(text), actionLines: [] };
  if (text.split("\n").some((line) => FATHOM_HEADER.test(line.trim()))) return parseFathom(text);
  return { format: "plain", segments: parsePlain(text), actionLines: [] };
}

/** One line per segment: `[m:ss] Speaker: text`. No links, so long meetings fit a small context. */
export function toPromptText(segments: Segment[]): string {
  return segments
    .map((s) => `${s.timestamp ? `[${s.timestamp}] ` : ""}${s.speaker ? `${s.speaker}: ` : ""}${s.text}`)
    .join("\n");
}

function parseFathom(text: string): ParsedTranscript {
  const segments: Segment[] = [];
  const actionLines: string[] = [];
  let current: Segment | null = null;

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    const header = FATHOM_HEADER.exec(line);
    if (header) {
      if (current?.text) segments.push(current);
      current = { speaker: header[2].trim(), timestamp: header[1], text: "" };
      continue;
    }
    if (!current || !line) continue;
    const action = FATHOM_ACTION.exec(line);
    if (action) actionLines.push(action[1]);
    const clean = stripMarkdown(action ? `ACTION ITEM: ${action[1]}` : line);
    if (clean) current.text = current.text ? `${current.text} ${clean}` : clean;
  }
  if (current?.text) segments.push(current);
  return { format: "fathom", segments, actionLines };
}

function parseCues(text: string): Segment[] {
  const segments: Segment[] = [];
  for (const block of text.split(/\n{2,}/)) {
    const lines = block.split("\n").map((l) => l.trim());
    const timeIndex = lines.findIndex((l) => CUE_TIME.test(l));
    if (timeIndex === -1) continue;
    const timestamp = toMinSec(CUE_TIME.exec(lines[timeIndex])![1]);
    let body = lines.slice(timeIndex + 1).join(" ").trim();
    let speaker: string | null = null;
    const voice = /^<v\s+([^>]+)>(.*)$/.exec(body);
    if (voice) {
      speaker = voice[1].trim();
      body = voice[2].replace(/<\/v>/g, "").trim();
    } else {
      const named = NAME_PREFIX.exec(body);
      if (named) [speaker, body] = [named[1].trim(), named[2].trim()];
    }
    if (body) segments.push({ speaker, timestamp, text: body });
  }
  return segments;
}

function parsePlain(text: string): Segment[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      const named = NAME_PREFIX.exec(line);
      return named
        ? { speaker: named[1].trim(), timestamp: null, text: named[2].trim() }
        : { speaker: null, timestamp: null, text: line };
    });
}

function stripMarkdown(line: string): string {
  return line
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\*\*/g, "")
    .replace(/https?:\/\/\S+/g, "")
    .trim();
}

function toMinSec(time: string): string {
  const parts = time.split(":").map(Number);
  const seconds = parts.reduce((total, n) => total * 60 + n, 0);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
