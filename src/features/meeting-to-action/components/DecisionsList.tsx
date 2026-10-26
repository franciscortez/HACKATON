"use client";

import { useState } from "react";
import type { MeetingOutput } from "@/features/meeting-to-action/types";

type Item = MeetingOutput["decisions"][number];

/** Decisions or open questions. Long items are clamped to a few lines with a "more" toggle. */
export function DecisionsList({ items, empty }: { items: Item[]; empty: string }) {
  const [open, setOpen] = useState<number | null>(null);
  if (items.length === 0) return <p className="py-6 text-ink-soft">{empty}</p>;
  return (
    <ol>
      {items.map((item, i) => {
        const expanded = open === i;
        const long = item.text.length > 220 || item.quote.length > 180;
        return (
          <li key={i} className="grid grid-cols-[2.5rem_1fr] gap-x-3 border-b border-rule-l/40 py-3">
            <span className="label pt-0.5 text-ink-soft">{String(i + 1).padStart(2, "0")}</span>
            <div className="min-w-0">
              <p className={expanded ? "font-medium" : "line-clamp-3 font-medium"}>{item.text}</p>
              <p className={`mt-1 text-sm text-ink-soft ${expanded ? "" : "line-clamp-2"}`}>
                &ldquo;{item.quote}&rdquo;
                {!item.verified && <span className="ml-2 font-mono text-[11px] text-warn">! check source</span>}
              </p>
              {long && (
                <button type="button" onClick={() => setOpen(expanded ? null : i)} className="mt-1 font-mono text-[11px] text-ink-soft hover:text-ink hover:underline">
                  {expanded ? "less ▴" : "more ▾"}
                </button>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
