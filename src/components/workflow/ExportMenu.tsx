"use client";

import { useState } from "react";

export interface ExportOption {
  label: string;
  /** Text to copy, or to download when `fileName` is set. */
  build: () => string;
  fileName?: string;
  mime?: string;
}

export function ExportMenu({ enabled, options }: { enabled: boolean; options: ExportOption[] }) {
  const [done, setDone] = useState<string>();

  async function run(option: ExportOption) {
    const text = option.build();
    if (option.fileName) {
      const url = URL.createObjectURL(new Blob([text], { type: option.mime ?? "text/plain" }));
      const link = Object.assign(document.createElement("a"), { href: url, download: option.fileName });
      link.click();
      URL.revokeObjectURL(url);
      setDone(`${option.label} downloaded`);
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setDone(`${option.label} copied`);
    } catch {
      setDone("Copy failed. Select the text and copy it yourself.");
    }
  }

  return (
    <section aria-label="Export" className="mt-10">
      <p className="label text-ink-soft">04 · Export</p>
      {!enabled && <p className="mt-2 text-sm text-ink-soft">Approve the output to export it. Nothing is sent automatically.</p>}
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.label}
            type="button"
            disabled={!enabled}
            onClick={() => run(option)}
            className="border border-ink px-3 py-2 text-sm font-medium transition-colors duration-300 hover:bg-ink hover:text-white disabled:cursor-not-allowed disabled:border-rule-l disabled:text-ink-soft/60 disabled:hover:bg-transparent"
          >
            {option.label}
          </button>
        ))}
      </div>
      <p aria-live="polite" className="label mt-2 text-blue">
        {done}
      </p>
    </section>
  );
}
