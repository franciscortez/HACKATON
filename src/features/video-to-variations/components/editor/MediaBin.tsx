"use client";

import { useRef } from "react";
import { clock, thumbName } from "@/features/video-to-variations/components/client";
import { MEDIA_DRAG } from "@/features/video-to-variations/components/editor/TimelineView";
import type { Media } from "@/features/video-to-variations/types";

export interface ImportItem {
  name: string;
  state: "waiting" | "working" | "failed";
  label?: string;
}

/**
 * The edit's imported videos. Import adds them to the end of the timeline; Add or drag puts a video on it again.
 * Files can also be dropped anywhere on the editor.
 */
export function MediaBin({
  media,
  queue,
  disabled,
  thumb,
  onImport,
  onAdd,
}: {
  media: Media[];
  queue: ImportItem[];
  disabled: boolean;
  thumb: (mediaId: string, file: string) => string;
  onImport: (files: File[]) => void;
  onAdd: (mediaId: string) => void;
}) {
  const input = useRef<HTMLInputElement | null>(null);

  return (
    <aside aria-label="Media" className="flex min-h-0 flex-col border border-ink bg-white">
      <div className="flex items-center justify-between gap-2 border-b border-rule-l px-3 py-2">
        <p className="label">Media · {media.length}</p>
        <input
          ref={input}
          type="file"
          multiple
          accept="video/*,.mov,.mp4,.m4v,.webm,.mkv"
          className="sr-only"
          aria-label="Import videos"
          onChange={(e) => {
            const files = [...(e.target.files ?? [])];
            e.target.value = "";
            if (files.length) onImport(files);
          }}
        />
        <button type="button" disabled={disabled} onClick={() => input.current?.click()} className="label bg-ink px-2.5 py-1 text-[10px] text-white hover:bg-blue disabled:cursor-not-allowed disabled:bg-ink-soft/50">
          + Import
        </button>
      </div>
      <ul className="min-h-[96px] flex-1 space-y-1 overflow-y-auto p-2">
        {media.length === 0 && queue.length === 0 && (
          <li className="px-1 py-4 text-sm text-ink-soft">
            Import one or more videos, or drop them anywhere here. They go on the timeline in order. Up to 20 videos, 20 minutes each.
          </li>
        )}
        {media.map((m) => (
          <li
            key={m.id}
            draggable={!disabled}
            onDragStart={(e) => {
              e.dataTransfer.setData(MEDIA_DRAG, m.id);
              e.dataTransfer.effectAllowed = "copy";
            }}
            className="group flex cursor-grab items-center gap-2 border border-transparent p-1 hover:border-rule-l"
            data-testid="media-item"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- local editor thumbnail */}
            <img src={thumb(m.id, thumbName(1))} alt="" draggable={false} className="h-10 w-10 shrink-0 bg-ink object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm" title={m.name}>
                {m.name}
              </p>
              <p className="font-mono text-[10px] text-ink-soft">
                {m.id} · {clock(m.durationS)} · {m.language ? "speech" : m.hasAudio ? "no speech" : "no sound"}
              </p>
            </div>
            <button type="button" disabled={disabled} onClick={() => onAdd(m.id)} className="label shrink-0 border border-rule-l px-1.5 py-0.5 text-[10px] hover:border-ink disabled:opacity-40" aria-label={`Add ${m.name} to the timeline`}>
              Add
            </button>
          </li>
        ))}
        {queue.map((q, i) => (
          <li key={`${q.name}-${i}`} className="border border-dashed border-rule-l p-1.5 text-sm" role="status">
            <p className="truncate">{q.name}</p>
            <p className={q.state === "failed" ? "text-xs text-danger" : "font-mono text-[10px] text-ink-soft"}>{q.state === "waiting" ? "Waiting…" : (q.label ?? "Working…")}</p>
          </li>
        ))}
      </ul>
    </aside>
  );
}
