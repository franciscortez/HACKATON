"use client";

import { useMemo } from "react";
import { meetingPeople } from "@/features/meeting-to-action/services/check-actions";
import { transcriptChunks } from "@/features/meeting-to-action/services/chunk";
import { parseTranscript, toPromptText } from "@/features/meeting-to-action/services/parse-transcript";

const FORMAT_NAMES = { fathom: "Fathom transcript", vtt: "WebVTT captions", srt: "SRT captions", plain: "Plain text" } as const;

/** What the tool can see in the transcript before it runs: format, speakers, action items, parts. */
export function TranscriptCheck({ transcript }: { transcript: string }) {
  const check = useMemo(() => {
    if (!transcript.trim()) return null;
    const parsed = parseTranscript(transcript);
    const people = meetingPeople(parsed.segments.map((s) => s.speaker));
    return { parsed, people, parts: transcriptChunks(toPromptText(parsed.segments)).length };
  }, [transcript]);

  if (!check) {
    return (
      <div className="border border-rule-l bg-white/50 p-4">
        <p className="label text-ink-soft">How it works</p>
        <ol className="mt-3 space-y-2 text-sm text-ink-soft">
          <li><span className="label mr-2 text-ink">01</span>Owners come only from people in the meeting.</li>
          <li><span className="label mr-2 text-ink">02</span>Dates are used only when someone says them.</li>
          <li><span className="label mr-2 text-ink">03</span>Every action links to the words it came from.</li>
          <li><span className="label mr-2 text-ink">04</span>Nothing is sent until you approve it.</li>
        </ol>
      </div>
    );
  }

  const { parsed, people, parts } = check;
  const rows: Array<[string, string]> = [
    ["Format", FORMAT_NAMES[parsed.format]],
    ["Speakers", people.length ? String(people.length) : "None found"],
    ["Flagged actions", String(parsed.actionLines.length)],
    ["Parts to read", String(parts)],
  ];

  return (
    <div className="border border-rule-l bg-white/50 p-4">
      <p className="label text-ink-soft">Transcript check</p>
      <dl className="mt-3 divide-y divide-rule-l/30 text-sm">
        {rows.map(([term, value]) => (
          <div key={term} className="flex items-baseline justify-between gap-3 py-1.5">
            <dt className="text-ink-soft">{term}</dt>
            <dd className={`font-mono tabular-nums ${value === "None found" ? "text-warn" : ""}`}>{value}</dd>
          </div>
        ))}
      </dl>
      {people.length > 0 && (
        <p className="mt-3 line-clamp-2 text-sm text-ink-soft" title={people.join(", ")}>
          {people.slice(0, 5).join(", ")}
          {people.length > 5 ? ` +${people.length - 5} more` : ""}
        </p>
      )}
      {people.length === 0 && <p className="mt-3 text-sm text-warn">Without speaker names, only people named in the text can own tasks.</p>}
    </div>
  );
}
