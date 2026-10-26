"use client";

import { StatusChip } from "@/components/workflow/StatusChip";
import type { Action, ActionFlag } from "@/features/meeting-to-action/types";
import { cx } from "@/lib/utils";

const FLAG_LABELS: Record<ActionFlag, string> = {
  "owner-unknown": "No owner said",
  "date-unknown": "No date said",
  "owner-not-in-transcript": "Owner not in meeting",
  ambiguous: "Quote not found",
};

interface Props {
  actions: Action[];
  /** People in the meeting: the owner choices. */
  people: string[];
  onChange: (actions: Action[]) => void;
}

/** Editable action register. Each row shows the quote it came from and why it needs review. */
export function ActionRegisterTable({ actions, people, onChange }: Props) {
  const update = (id: string, patch: Partial<Action>) => onChange(actions.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  const remove = (id: string) => onChange(actions.filter((a) => a.id !== id));
  const add = () =>
    onChange([
      ...actions,
      {
        id: `m${Date.now()}`,
        task: "",
        owner: "Unassigned",
        due: "No date",
        dueText: null,
        priority: "normal",
        quote: "Added by reviewer",
        timestamp: null,
        confidence: "high",
        flags: [],
      },
    ]);

  return (
    <section aria-label="Action register">
      <div className="flex items-baseline justify-between">
        <p className="label text-ink-soft">03 · Review · {actions.length} actions</p>
        <button type="button" onClick={add} className="label text-ink underline-offset-4 hover:underline">
          Add action +
        </button>
      </div>
      <ol className="mt-3 border-t border-ink">
        {actions.map((a, i) => (
          <li
            key={a.id}
            className={cx(
              "reveal grid gap-3 border-b border-rule-l py-4 md:grid-cols-[2.5rem_1fr_11rem_9rem_2rem] md:items-start",
              a.confidence === "low" && "bg-warn/5",
            )}
            style={{ ["--i" as string]: Math.min(i, 12) }}
          >
            <span className="label pt-2 text-ink-soft">{String(i + 1).padStart(2, "0")}</span>
            <div className="min-w-0">
              <textarea
                aria-label={`Task ${i + 1}`}
                rows={1}
                value={a.task}
                onChange={(e) => update(a.id, { task: e.target.value })}
                className="field-sizing-content w-full resize-none border-b border-transparent bg-transparent py-1 font-medium hover:border-rule-l focus:border-ink focus:outline-none"
              />
              <details className="mt-1">
                <summary className="label cursor-pointer text-ink-soft">
                  Source{a.timestamp ? ` · ${a.timestamp}` : ""}
                </summary>
                <blockquote className="mt-1 border-l-2 border-ink pl-3 text-sm text-ink-soft">&ldquo;{a.quote}&rdquo;</blockquote>
              </details>
              {a.flags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {a.flags.map((f) => (
                    <StatusChip key={f} value="UNASSIGNED" label={FLAG_LABELS[f]} />
                  ))}
                </div>
              )}
            </div>
            <label className="flex flex-col gap-1">
              <span className="label text-ink-soft md:sr-only">Owner</span>
              <select
                aria-label={`Owner for task ${i + 1}`}
                value={a.owner}
                onChange={(e) => update(a.id, { owner: e.target.value })}
                className={cx("border bg-white px-2 py-1.5 text-sm", a.owner === "Unassigned" ? "border-warn text-warn" : "border-rule-l")}
              >
                {[...new Set([...people, a.owner, "Unassigned"])].map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="label text-ink-soft md:sr-only">Due</span>
              <input
                aria-label={`Due date for task ${i + 1}`}
                type="date"
                value={a.due === "No date" ? "" : a.due}
                onChange={(e) => update(a.id, { due: e.target.value || "No date" })}
                className="border border-rule-l bg-white px-2 py-1 text-sm"
              />
              {a.dueText && <span className="label text-ink-soft">&ldquo;{a.dueText}&rdquo;</span>}
            </label>
            <button
              type="button"
              onClick={() => remove(a.id)}
              aria-label={`Remove task ${i + 1}`}
              className="label justify-self-start pt-2 text-ink-soft hover:text-danger md:justify-self-end"
            >
              ✕
            </button>
          </li>
        ))}
      </ol>
      {actions.length === 0 && <p className="py-6 text-ink-soft">No actions found. Add one, or check the transcript.</p>}
    </section>
  );
}
