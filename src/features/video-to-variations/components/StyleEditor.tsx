"use client";

import { useState } from "react";

/** The project's style guide (style.md), which Claude follows on every edit. */
export function StyleEditor({ initial, disabled, onSave }: { initial: string; disabled: boolean; onSave: (text: string) => Promise<void> }) {
  const [text, setText] = useState(initial);
  const [saved, setSaved] = useState(true);

  return (
    <details className="border-t border-rule-l pt-3">
      <summary className="label cursor-pointer text-ink-soft hover:text-ink">Style guide · style.md</summary>
      <textarea
        value={text}
        maxLength={20_000}
        rows={12}
        onChange={(e) => {
          setText(e.target.value);
          setSaved(false);
        }}
        className="mt-3 w-full border border-rule-l bg-white px-2 py-1.5 font-mono text-xs"
      />
      <div className="mt-2 flex items-center gap-3">
        <button
          type="button"
          disabled={disabled || saved}
          onClick={async () => {
            await onSave(text);
            setSaved(true);
          }}
          className="label arrow-link text-ink hover:text-blue disabled:opacity-50"
        >
          Save style <span className="arrow">→</span>
        </button>
        <span className="text-xs text-ink-soft">{saved ? "Saved. Used on the next change." : "Not saved yet."}</span>
      </div>
    </details>
  );
}
