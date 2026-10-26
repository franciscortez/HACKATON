"use client";

import { useState } from "react";

export interface ExportOption {
  label: string;
  /** Text to copy, or to download when `fileName` is set. */
  build: () => string;
  fileName?: string;
  mime?: string;
}

/** Compact export buttons, disabled until the output is approved. Nothing is sent anywhere. */
export function ExportMenu({ enabled, options }: { enabled: boolean; options: ExportOption[] }) {
  const [done, setDone] = useState<string>();

  async function run(option: ExportOption) {
    const text = option.build();
    if (option.fileName) {
      const url = URL.createObjectURL(new Blob([text], { type: option.mime ?? "text/plain" }));
      const link = Object.assign(document.createElement("a"), { href: url, download: option.fileName });
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
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
    <div aria-label="Export" role="group" className="flex flex-wrap items-center gap-1.5" title={enabled ? undefined : "Approve the output to export it"}>
      <span aria-live="polite" className="label mr-1 text-blue">
        {done}
      </span>
      {options.map((option) => (
        <button
          key={option.label}
          type="button"
          disabled={!enabled}
          onClick={() => run(option)}
          className="border border-ink px-2.5 py-1.5 text-xs font-medium transition-colors duration-300 hover:bg-ink hover:text-white disabled:cursor-not-allowed disabled:border-rule-l disabled:text-ink-soft/50 disabled:hover:bg-transparent"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
