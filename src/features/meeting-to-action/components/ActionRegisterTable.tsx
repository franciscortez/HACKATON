"use client";

import { useState } from "react";
import type { Action } from "@/features/meeting-to-action/types";
import { cx } from "@/lib/utils";

interface Props {
  actions: Action[];
  /** People in the meeting: the owner choices. */
  people: string[];
  onChange: (actions: Action[]) => void;
}

const field =
  "w-full border border-transparent bg-transparent px-2 py-1.5 text-sm transition-colors duration-200 hover:border-rule-l focus:border-ink focus:bg-white focus:outline-none";

/** Compact, editable action register. Unknown owners and dates read as quiet text in their own fields. */
export function ActionRegisterTable({ actions, people, onChange }: Props) {
  const [openQuote, setOpenQuote] = useState<string | null>(null);
  const update = (id: string, patch: Partial<Action>) => onChange(actions.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  const remove = (id: string) => onChange(actions.filter((a) => a.id !== id));
  const add = () =>
    onChange([
      ...actions,
      { id: `m${Date.now()}`, task: "", owner: "Unassigned", due: "No date", dueText: null, priority: "normal", quote: "Added by reviewer", timestamp: null, confidence: "high", flags: [] },
    ]);

  const noOwner = actions.filter((a) => a.owner === "Unassigned").length;
  const noDate = actions.filter((a) => a.due === "No date").length;

  return (
    <section aria-label="Action register">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-mono text-xs tabular-nums text-ink-soft">
          {actions.length} actions · {noOwner} need an owner · {noDate} have no date
        </p>
        <button type="button" onClick={add} className="label text-ink underline-offset-4 hover:underline">
          Add action +
        </button>
      </div>

      <div className="label mt-4 hidden grid-cols-[2.5rem_1fr_12rem_10rem_2rem] gap-x-3 border-b border-ink pb-2 text-ink-soft md:grid">
        <span>#</span>
        <span className="px-2">Task</span>
        <span className="px-2">Owner</span>
        <span className="px-2">Due</span>
        <span />
      </div>

      <ol className="mt-2 border-t border-ink md:mt-0 md:border-t-0">
        {actions.map((a, i) => {
          const unassigned = a.owner === "Unassigned";
          const quoteOpen = openQuote === a.id;
          return (
            <li key={a.id} className="border-b border-rule-l/40 py-2 transition-colors duration-200 hover:bg-white/40">
              <div className="grid grid-cols-[2.5rem_1fr_2rem] items-start gap-x-3 gap-y-1 md:grid-cols-[2.5rem_1fr_12rem_10rem_2rem]">
                <span className="label pt-2.5 text-ink-soft">{String(i + 1).padStart(2, "0")}</span>

                <div className="min-w-0">
                  <textarea
                    aria-label={`Task ${i + 1}`}
                    rows={1}
                    value={a.task}
                    onChange={(e) => update(a.id, { task: e.target.value })}
                    className={cx(field, "field-sizing-content resize-none font-medium")}
                  />
                  <div className="flex items-center gap-3 px-2">
                    <button
                      type="button"
                      onClick={() => setOpenQuote(quoteOpen ? null : a.id)}
                      aria-expanded={quoteOpen}
                      className="font-mono text-[11px] text-ink-soft underline-offset-2 hover:text-ink hover:underline"
                    >
                      {a.timestamp ? `${a.timestamp} · source` : "source"} {quoteOpen ? "▴" : "▾"}
                    </button>
                    {a.flags.includes("ambiguous") && (
                      <span title="This quote was not found word for word in the transcript" className="font-mono text-[11px] text-warn">
                        ! check source
                      </span>
                    )}
                  </div>
                  {quoteOpen && <blockquote className="mx-2 mt-1 border-l-2 border-ink pl-3 text-sm text-ink-soft">&ldquo;{a.quote}&rdquo;</blockquote>}
                </div>

                <button
                  type="button"
                  onClick={() => remove(a.id)}
                  aria-label={`Remove task ${i + 1}`}
                  className="col-start-3 row-start-1 pt-2 text-ink-soft opacity-50 transition-opacity hover:text-danger hover:opacity-100 md:col-start-5"
                >
                  ✕
                </button>

                {/* Owner and due: their own row on phones, their own columns on desktop. */}
                <div className="col-span-2 col-start-2 grid grid-cols-2 gap-2 md:contents">
                  <select
                    aria-label={`Owner for task ${i + 1}`}
                    value={a.owner}
                    onChange={(e) => update(a.id, { owner: e.target.value })}
                    className={cx(field, "cursor-pointer md:col-start-3 md:row-start-1", unassigned && "italic text-ink-soft")}
                  >
                    {[...new Set([...people, a.owner, "Unassigned"])].map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                  <input
                    aria-label={`Due date for task ${i + 1}`}
                    type="date"
                    value={a.due === "No date" ? "" : a.due}
                    onChange={(e) => update(a.id, { due: e.target.value || "No date" })}
                    title={a.dueText ? `Said: "${a.dueText}"` : "No date was said"}
                    className={cx(field, "md:col-start-4 md:row-start-1", a.due === "No date" && "text-ink-soft/60")}
                  />
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      {actions.length === 0 && <p className="py-6 text-ink-soft">No actions found. Add one, or check the transcript.</p>}
    </section>
  );
}
