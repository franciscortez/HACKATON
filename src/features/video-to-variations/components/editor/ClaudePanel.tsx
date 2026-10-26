"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { BusyLine } from "@/features/video-to-variations/components/BusyLine";
import { clock } from "@/features/video-to-variations/components/client";
import { StyleEditor } from "@/features/video-to-variations/components/StyleEditor";
import type { ClaudeModel, Project, TimeRange } from "@/features/video-to-variations/types";
import type { RunProgress } from "@/types/tool";
import { cx } from "@/lib/utils";

/**
 * Chat with Claude about this edit. Each Claude reply is a version: its summary, what it changed (click to show it
 * on the timeline) and a Restore button. The selected timeline range, if any, limits the next request.
 */
export function ClaudePanel({
  project,
  busy,
  disabled,
  range,
  model,
  notice,
  style,
  onModel,
  onClearRange,
  onShowRange,
  onRestore,
  onSend,
  onSaveStyle,
}: {
  project: Project;
  busy: RunProgress | null;
  disabled: boolean;
  range: TimeRange | null;
  model: ClaudeModel;
  notice: string | null;
  style: string;
  onModel: (m: ClaudeModel) => void;
  onClearRange: () => void;
  onShowRange: (r: TimeRange) => void;
  onRestore: (n: number) => void;
  onSend: (prompt: string) => Promise<boolean>;
  onSaveStyle: (text: string) => Promise<void>;
}) {
  const [prompt, setPrompt] = useState("");
  const list = useRef<HTMLOListElement | null>(null);
  const replies = project.versions.filter((v) => v.source === "claude");

  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight });
  }, [replies.length, busy]);

  async function submit(e?: FormEvent) {
    e?.preventDefault();
    if (!prompt.trim() || disabled) return;
    if (await onSend(prompt.trim())) setPrompt("");
  }

  return (
    <aside aria-label="Claude" className="flex min-h-0 flex-col border border-ink bg-white">
      <div className="flex items-center justify-between gap-2 border-b border-rule-l px-3 py-2">
        <p className="label">Edit with Claude</p>
        <div role="radiogroup" aria-label="Claude model" className="flex">
          {(["opus", "sonnet"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={model === m}
              onClick={() => onModel(m)}
              className={cx("label border px-2 py-0.5 text-[10px]", model === m ? "border-ink bg-ink text-white" : "border-rule-l text-ink-soft hover:border-ink")}
            >
              {m === "opus" ? "Opus" : "Sonnet"}
            </button>
          ))}
        </div>
      </div>

      <ol ref={list} aria-label="Edits by Claude" className="min-h-[120px] flex-1 space-y-3 overflow-y-auto px-3 py-3 text-sm">
        {replies.length === 0 && !busy && (
          <li className="text-ink-soft">
            Ask for a change in plain words, for example “cut the pauses and add captions” or “make the first 10 seconds punchier”. Select a range on the timeline (Shift+drag on the ruler, or I and O) to change only that part.
          </li>
        )}
        {replies.map((v) => (
          <li key={v.n} className="space-y-1.5">
            <p className="ml-6 border border-rule-l bg-field/40 px-2 py-1.5">{v.label}</p>
            <div className={cx("border-l-2 pl-2", v.n === project.current ? "border-blue" : "border-rule-l")}>
              <p>{v.summary}</p>
              <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] text-ink-soft">
                <span>v{String(v.n).padStart(3, "0")}</span>
                {v.changedRange && (
                  <button type="button" onClick={() => onShowRange(v.changedRange!)} className="text-blue hover:underline">
                    Changed {clock(v.changedRange.start)}–{clock(v.changedRange.end)}
                  </button>
                )}
                {v.n === project.current ? (
                  <span className="text-blue">Current</span>
                ) : (
                  <button type="button" disabled={disabled} onClick={() => onRestore(v.n)} className="hover:text-ink disabled:opacity-50">
                    Restore
                  </button>
                )}
              </p>
            </div>
          </li>
        ))}
        {notice && (
          <li role="alert" className="border-l-2 border-danger pl-2 text-danger">
            {notice}
          </li>
        )}
      </ol>

      <form onSubmit={submit} className="space-y-2 border-t border-rule-l px-3 py-3">
        {busy && <BusyLine progress={busy} />}
        {range && (
          <p className="flex items-center justify-between gap-2 border border-blue px-2 py-1 font-mono text-[11px] text-blue">
            Only {clock(range.start)}–{clock(range.end)}
            <button type="button" aria-label="Clear range" onClick={onClearRange} className="hover:text-ink">
              ×
            </button>
          </p>
        )}
        <label className="sr-only" htmlFor="claude-prompt">
          Ask Claude to change the edit
        </label>
        <textarea
          id="claude-prompt"
          value={prompt}
          maxLength={1000}
          rows={3}
          disabled={disabled}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) void submit();
          }}
          placeholder="Cut the pauses and add captions."
          className="w-full border border-rule-l bg-white px-2 py-1.5 text-sm disabled:opacity-60"
        />
        <button type="submit" disabled={disabled || !prompt.trim()} className="arrow-link w-full bg-ink px-3 py-2 text-left text-sm font-medium text-white transition-colors duration-300 hover:bg-blue disabled:cursor-not-allowed disabled:bg-ink-soft/50">
          {range ? `Change ${clock(range.start)}–${clock(range.end)}` : "Send to Claude"} <span className="arrow">→</span>
        </button>
        <StyleEditor key={project.id} initial={style} disabled={disabled} onSave={onSaveStyle} />
      </form>
    </aside>
  );
}
