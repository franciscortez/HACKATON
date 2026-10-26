"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { clock, fitZoom, MAX_ZOOM, MIN_ZOOM, rulerStep, thumbIndex, thumbName } from "@/features/video-to-variations/components/client";
import { duration, move, offsets, trim, visibleCaptions } from "@/features/video-to-variations/services/timeline-ops";
import type { Media, TimeRange, Timeline } from "@/features/video-to-variations/types";
import { cx } from "@/lib/utils";

export type Selection = { kind: "clip" | "card" | "title"; id: string } | null;

const LABEL_W = 80;
const ROWS = { ruler: 24, titles: 24, captions: 28, video: 56, audio: 40 };
const THUMB_H = 48;
// A colour band per imported video, so clips from different videos are easy to tell apart.
const BANDS = ["#1d35d0", "#b4540a", "#2a7a4b", "#7a2a7a", "#0e0e0e", "#a3221b"];
export const MEDIA_DRAG = "application/x-vtv-media";

/**
 * The timeline: ruler (drag to scrub, Shift+drag to mark a range), titles, captions, video thumbnails and the
 * audio waveform. Clips are trimmed by their edges and reordered by dragging; changes preview live and commit on release.
 * Videos dragged in from the Media bin are inserted where they are dropped.
 */
export function TimelineView({
  timeline,
  media,
  playhead,
  range,
  selection,
  disabled,
  asset,
  onSeek,
  onRange,
  onSelect,
  onPreview,
  onCommit,
  onInsert,
}: {
  timeline: Timeline;
  media: Media[];
  playhead: number;
  range: TimeRange | null;
  selection: Selection;
  disabled: boolean;
  asset: (mediaId: string, file: string) => string;
  onSeek: (outS: number) => void;
  onRange: (range: TimeRange | null) => void;
  onSelect: (selection: Selection) => void;
  onPreview: (t: Timeline | null) => void;
  onCommit: (t: Timeline, label: string) => void;
  onInsert: (mediaId: string, index: number) => void;
}) {
  const scroller = useRef<HTMLDivElement | null>(null);
  const content = useRef<HTMLDivElement | null>(null);
  const [zoom, setZoom] = useState(20);
  const [drag, setDrag] = useState<{ id: string; dx: number; to: number } | null>(null);
  const [dropX, setDropX] = useState<number | null>(null);
  const total = duration(timeline);
  const starts = offsets(timeline);
  const byId = new Map(media.map((m, i) => [m.id, { ...m, band: BANDS[i % BANDS.length] }]));

  // Fit the whole edit when the set of videos changes, not on every edit.
  useEffect(() => {
    if (scroller.current) setZoom(fitZoom(Math.max(total, 10), scroller.current.clientWidth - 24));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [media.length]);

  /** The clip index a drop at this x lands before. */
  const indexAt = (x: number) => timeline.clips.filter((c, i) => (starts[i] + (c.end - c.start) / 2) * zoom < x).length;

  const xOf = (e: { clientX: number }) => e.clientX - (content.current?.getBoundingClientRect().left ?? 0);
  const timeOf = (e: { clientX: number }) => Math.min(total, Math.max(0, xOf(e) / zoom));

  function onRuler(e: ReactPointerEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    const from = timeOf(e);
    const marking = e.shiftKey;
    if (!marking) onSeek(from);
    const moveTo = (ev: PointerEvent) => {
      const t = timeOf(ev);
      if (marking) onRange(Math.abs(t - from) > 0.05 ? { start: Math.min(from, t), end: Math.max(from, t) } : null);
      else onSeek(t);
    };
    const up = () => {
      el.removeEventListener("pointermove", moveTo);
      el.removeEventListener("pointerup", up);
    };
    el.addEventListener("pointermove", moveTo);
    el.addEventListener("pointerup", up);
  }

  function onTrimStart(e: ReactPointerEvent<HTMLElement>, clipId: string, edge: "start" | "end") {
    if (disabled) return;
    e.stopPropagation();
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    const base = timeline;
    const clip = base.clips.find((c) => c.id === clipId)!;
    const x0 = e.clientX;
    let latest = base;
    const moveTo = (ev: PointerEvent) => {
      const delta = (ev.clientX - x0) / zoom;
      latest = trim(base, clipId, edge, (edge === "start" ? clip.start : clip.end) + delta, byId.get(clip.mediaId)?.durationS ?? clip.end);
      onPreview(latest);
    };
    const up = () => {
      el.removeEventListener("pointermove", moveTo);
      el.removeEventListener("pointerup", up);
      onPreview(null);
      if (latest !== base) onCommit(latest, "Trimmed clip");
    };
    el.addEventListener("pointermove", moveTo);
    el.addEventListener("pointerup", up);
  }

  function onClipDown(e: ReactPointerEvent<HTMLElement>, clipId: string) {
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    const x0 = e.clientX;
    let moved = false;
    let to = timeline.clips.findIndex((c) => c.id === clipId);
    const others = timeline.clips.map((c, i) => ({ c, mid: (starts[i] + (c.end - c.start) / 2) * zoom })).filter(({ c }) => c.id !== clipId);
    const moveTo = (ev: PointerEvent) => {
      const dx = ev.clientX - x0;
      if (!moved && Math.abs(dx) < 5) return;
      if (disabled) return;
      moved = true;
      const x = xOf(ev);
      to = others.filter((o) => o.mid < x).length;
      setDrag({ id: clipId, dx, to });
    };
    const up = (ev: PointerEvent) => {
      el.removeEventListener("pointermove", moveTo);
      el.removeEventListener("pointerup", up);
      setDrag(null);
      if (moved) {
        const next = move(timeline, clipId, to);
        if (next.clips.map((c) => c.id).join() !== timeline.clips.map((c) => c.id).join()) onCommit(next, "Moved clip");
      } else {
        onSelect({ kind: "clip", id: clipId });
        onSeek(timeOf(ev));
      }
    };
    el.addEventListener("pointermove", moveTo);
    el.addEventListener("pointerup", up);
  }

  const step = rulerStep(zoom);
  const width = Math.max(total * zoom + 24, 200);
  // Where a dragged clip would land: before the `to`-th other clip, or at the end.
  const others = drag ? timeline.clips.filter((c) => c.id !== drag.id) : [];
  const insertX = drag ? (drag.to < others.length ? starts[timeline.clips.indexOf(others[drag.to])] : total) * zoom : 0;

  return (
    <section aria-label="Timeline" className="border border-ink bg-white select-none">
      <div className="flex items-center justify-between gap-3 border-b border-rule-l px-3 py-1.5">
        <p className="label text-ink-soft">
          Timeline · {clock(total)} · {timeline.clips.length} {timeline.clips.length === 1 ? "clip" : "clips"}
          {range && (
            <>
              {" "}
              · <span className="text-blue">Range {clock(range.start)}–{clock(range.end)}</span>
            </>
          )}
        </p>
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Zoom out" onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z / 1.5))} className="label border border-rule-l px-2 py-0.5 hover:border-ink">
            −
          </button>
          <button type="button" onClick={() => scroller.current && setZoom(fitZoom(total, scroller.current.clientWidth - 24))} className="label border border-rule-l px-2 py-0.5 hover:border-ink">
            Fit
          </button>
          <button type="button" aria-label="Zoom in" onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z * 1.5))} className="label border border-rule-l px-2 py-0.5 hover:border-ink">
            +
          </button>
        </div>
      </div>
      <div className="flex">
        <div className="shrink-0 border-r border-rule-l bg-field/40" style={{ width: LABEL_W }}>
          <div style={{ height: ROWS.ruler }} />
          {(
            [
              ["Titles", ROWS.titles],
              ["Captions", ROWS.captions],
              ["Video", ROWS.video],
              ["Audio", ROWS.audio],
            ] as const
          ).map(([label, h]) => (
            <p key={label} className="label flex items-center border-t border-rule-l/30 px-2 text-[10px] text-ink-soft" style={{ height: h }}>
              {label}
            </p>
          ))}
        </div>
        <div ref={scroller} className="relative min-w-0 flex-1 overflow-x-auto overflow-y-hidden">
          <div ref={content} className="relative" style={{ width }}>
            <div role="slider" aria-label="Playhead" aria-valuemin={0} aria-valuemax={total} aria-valuenow={playhead} aria-valuetext={clock(playhead)} tabIndex={-1} onPointerDown={onRuler} className="relative cursor-ew-resize border-b border-rule-l" style={{ height: ROWS.ruler }}>
              {Array.from({ length: Math.floor(total / step) + 1 }, (_, i) => (
                <span key={i} className="absolute top-0 h-full border-l border-rule-l/50 pl-1 font-mono text-[10px] leading-6 text-ink-soft" style={{ left: i * step * zoom }}>
                  {clock(i * step).replace(/\.0$/, "")}
                </span>
              ))}
            </div>

            <div className="relative border-b border-rule-l/30" style={{ height: ROWS.titles }}>
              {timeline.titles.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onSelect({ kind: "title", id: t.id })}
                  className={cx("absolute top-1 truncate border bg-ink px-1 text-left text-[11px] text-white", selection?.id === t.id ? "border-blue" : "border-ink")}
                  style={{ left: t.start * zoom, width: Math.max(8, (t.end - t.start) * zoom), height: ROWS.titles - 8 }}
                >
                  {t.text}
                </button>
              ))}
            </div>

            <div className="relative border-b border-rule-l/30" style={{ height: ROWS.captions }}>
              {!timeline.captions.enabled && <p className="label absolute left-2 top-1.5 whitespace-nowrap text-[10px] text-ink-soft/60">Captions off</p>}
              {visibleCaptions(timeline).map((c, i) => (
                <button
                  key={`${c.id}-${i}`}
                  type="button"
                  data-testid="caption-chip"
                  onClick={() => {
                    onSelect({ kind: "card", id: c.id });
                    onSeek(c.start + 0.01);
                  }}
                  className={cx("absolute top-1 truncate border bg-white px-1 text-left text-[10px] uppercase", selection?.id === c.id ? "border-blue text-blue" : "border-danger text-danger")}
                  style={{ left: c.start * zoom, width: Math.max(6, (c.end - c.start) * zoom - 1), height: ROWS.captions - 8 }}
                  title={c.text}
                >
                  {c.text}
                </button>
              ))}
            </div>

            <div
              className="relative border-b border-rule-l/30"
              style={{ height: ROWS.video }}
              onDragOver={(e) => {
                if (disabled || !e.dataTransfer.types.includes(MEDIA_DRAG)) return;
                e.preventDefault();
                const i = indexAt(xOf(e));
                setDropX((i < starts.length ? starts[i] : total) * zoom);
              }}
              onDragLeave={() => setDropX(null)}
              onDrop={(e) => {
                const mediaId = e.dataTransfer.getData(MEDIA_DRAG);
                setDropX(null);
                if (!mediaId || disabled) return;
                e.preventDefault();
                onInsert(mediaId, indexAt(xOf(e)));
              }}
            >
              {timeline.clips.length === 0 && <p className="label absolute left-2 top-5 whitespace-nowrap text-[10px] text-ink-soft/70">Imported videos appear here, in order. Drag one in from Media to place it.</p>}
              {timeline.clips.map((c, i) => {
                const m = byId.get(c.mediaId);
                const w = (c.end - c.start) * zoom;
                const thumbW = THUMB_H * (m && m.height ? m.width / m.height : 16 / 9);
                const count = Math.min(200, Math.ceil(w / thumbW));
                const dragging = drag?.id === c.id;
                return (
                  <div
                    key={c.id}
                    data-testid="clip"
                    aria-label={`Clip ${i + 1}, ${clock(c.end - c.start)}`}
                    onPointerDown={(e) => onClipDown(e, c.id)}
                    className={cx(
                      "absolute top-1 cursor-grab overflow-hidden border-2 bg-ink-soft",
                      selection?.kind === "clip" && selection.id === c.id ? "border-blue" : "border-ink",
                      dragging && "z-10 opacity-70",
                    )}
                    style={{ left: starts[i] * zoom, width: Math.max(4, w), height: THUMB_H, transform: dragging ? `translateX(${drag.dx}px)` : undefined, boxShadow: `inset 0 3px 0 ${m?.band ?? "#0e0e0e"}` }}
                    title={m?.name}
                  >
                    <div className="pointer-events-none flex h-full">
                      {Array.from({ length: count }, (_, k) => (
                        // eslint-disable-next-line @next/next/no-img-element -- local editor thumbnails, not page images
                        <img key={k} alt="" draggable={false} src={asset(c.mediaId, thumbName(thumbIndex(c.start + (k * thumbW) / zoom, m?.durationS ?? c.end)))} className="h-full shrink-0 object-cover" style={{ width: thumbW }} />
                      ))}
                    </div>
                    <span className="pointer-events-none absolute left-1 top-0.5 bg-ink/70 px-1 font-mono text-[10px] text-white">{clock(c.end - c.start)}</span>
                    <span aria-label="Trim start" onPointerDown={(e) => onTrimStart(e, c.id, "start")} className="absolute inset-y-0 left-0 w-2 cursor-ew-resize bg-white/70 hover:bg-blue" />
                    <span aria-label="Trim end" onPointerDown={(e) => onTrimStart(e, c.id, "end")} className="absolute inset-y-0 right-0 w-2 cursor-ew-resize bg-white/70 hover:bg-blue" />
                  </div>
                );
              })}
              {drag && <span className="absolute top-0 h-full w-0.5 bg-blue" style={{ left: insertX }} />}
              {dropX !== null && <span className="absolute top-0 h-full w-0.5 bg-blue" style={{ left: dropX }} />}
            </div>

            <div className="relative" style={{ height: ROWS.audio }}>
              {timeline.clips.map((c, i) => {
                const m = byId.get(c.mediaId);
                return (
                  <div
                    key={c.id}
                    className="absolute top-1 overflow-hidden border border-rule-l/40 bg-field/40"
                    style={{
                      left: starts[i] * zoom,
                      width: Math.max(4, (c.end - c.start) * zoom),
                      height: ROWS.audio - 8,
                      backgroundImage: m?.hasAudio ? `url(${asset(c.mediaId, "waveform.png")})` : undefined,
                      backgroundSize: `${(m?.durationS ?? 0) * zoom}px 100%`,
                      backgroundPosition: `${-c.start * zoom}px 0`,
                      backgroundRepeat: "no-repeat",
                    }}
                  >
                    {m && !m.hasAudio && <span className="label pointer-events-none absolute left-1 top-1.5 text-[9px] text-ink-soft/60">No sound</span>}
                  </div>
                );
              })}
            </div>

            {range && <div className="pointer-events-none absolute inset-y-0 border-x border-blue bg-blue/10" style={{ left: range.start * zoom, width: (range.end - range.start) * zoom }} />}
            <div className="pointer-events-none absolute inset-y-0 w-px bg-blue" style={{ left: playhead * zoom }}>
              <span className="absolute -left-1.5 top-0 h-3 w-3 bg-blue" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
