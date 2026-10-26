"use client";

import { useState, type ChangeEvent } from "react";
import { cx } from "@/lib/utils";

interface Props {
  value: string;
  onChange: (text: string, fileName?: string) => void;
  accept: string;
  placeholder: string;
  maxChars: number;
}

/** Paste or upload a text source. Upload problems always fall back to the paste tab. */
export function SourcePanel({ value, onChange, accept, placeholder, maxChars }: Props) {
  const [tab, setTab] = useState<"paste" | "upload">("paste");
  const [fileName, setFileName] = useState<string>();
  const [fileError, setFileError] = useState<string>();

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!accept.split(",").includes(ext)) {
      setFileError("This file type is not supported. Paste the text instead.");
      setTab("paste");
      return;
    }
    const text = await file.text();
    setFileError(undefined);
    setFileName(file.name);
    onChange(text, file.name);
  }

  const tabClass = (t: string) =>
    cx("label px-3 py-2 transition-colors duration-200", tab === t ? "bg-ink text-white" : "text-ink-soft hover:text-ink");

  return (
    <div>
      <div role="tablist" className="inline-flex border border-ink">
        <button role="tab" aria-selected={tab === "paste"} className={tabClass("paste")} onClick={() => setTab("paste")} type="button">
          Paste text
        </button>
        <button role="tab" aria-selected={tab === "upload"} className={tabClass("upload")} onClick={() => setTab("upload")} type="button">
          Upload file
        </button>
      </div>
      {tab === "paste" ? (
        <textarea
          aria-label="Transcript text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="mt-3 h-64 w-full resize-y border border-rule-l bg-white p-3 font-mono text-[13px] leading-relaxed"
        />
      ) : (
        <label className="mt-3 flex h-40 cursor-pointer flex-col items-center justify-center gap-2 border border-dashed border-ink bg-white/60 text-center">
          <span className="font-medium">{fileName ?? "Choose a transcript file"}</span>
          <span className="label text-ink-soft">{accept.replaceAll(",", " ")}</span>
          <input type="file" accept={accept} onChange={onFile} className="sr-only" aria-label="Transcript file" />
        </label>
      )}
      {fileError && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {fileError}
        </p>
      )}
      <p className={cx("label mt-2", value.length > maxChars ? "text-danger" : "text-ink-soft")}>
        {value.length.toLocaleString("en-AU")} / {maxChars.toLocaleString("en-AU")} characters
      </p>
    </div>
  );
}
