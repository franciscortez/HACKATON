"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { duration, toOutput, toSource, visibleCaptions } from "@/features/video-to-variations/services/timeline-ops";
import type { Media, Timeline } from "@/features/video-to-variations/types";

/**
 * Live preview: one <video> per imported video (its proxy), steered through the timeline. The video under the
 * playhead is shown; at a cut it jumps, and at a clip of another video it hands over to that video's element.
 * Captions and titles are drawn as HTML in the export's style. Nothing is rendered until export.
 */
export function PreviewPlayer({
  media,
  src,
  timeline,
  playhead,
  playing,
  onTime,
  onPlayingChange,
}: {
  media: Media[];
  src: (mediaId: string) => string;
  timeline: Timeline;
  playhead: number;
  playing: boolean;
  onTime: (outS: number) => void;
  onPlayingChange: (playing: boolean) => void;
}) {
  const videos = useRef(new Map<string, HTMLVideoElement>());
  const clipRef = useRef(0);
  const reported = useRef(-1);
  const total = duration(timeline);
  const hit = toSource(timeline, Math.min(playhead, total));
  const active = hit ? timeline.clips[hit.clipIndex].mediaId : null;
  const vertical = timeline.format === "9:16";

  // Seek when the playhead moves from outside (timeline click, step keys, undo, a new import).
  useEffect(() => {
    if (playing || Math.abs(playhead - reported.current) < 0.02) return;
    const at = toSource(timeline, Math.min(playhead, duration(timeline)));
    if (!at) return;
    clipRef.current = at.clipIndex;
    const video = videos.current.get(timeline.clips[at.clipIndex].mediaId);
    if (video) video.currentTime = at.sourceS;
    reported.current = playhead;
  }, [playhead, timeline, playing]);

  useEffect(() => {
    const all = () => [...videos.current.values()];
    if (!playing) {
      all().forEach((v) => v.pause());
      return;
    }
    const end = duration(timeline);
    if (end === 0) {
      onPlayingChange(false);
      return;
    }
    const startAt = toSource(timeline, playhead >= end - 0.05 ? 0 : playhead);
    if (!startAt) return;
    clipRef.current = startAt.clipIndex;
    let current = videos.current.get(timeline.clips[startAt.clipIndex].mediaId);
    if (!current) return;
    current.currentTime = startAt.sourceS;
    current.play().catch(() => onPlayingChange(false));

    let raf = 0;
    const tick = () => {
      const clips = timeline.clips;
      let i = Math.min(clipRef.current, clips.length - 1);
      if (current!.currentTime >= clips[i].end - 0.02) {
        if (i + 1 >= clips.length) {
          current!.pause();
          reported.current = end;
          onTime(end);
          onPlayingChange(false);
          return;
        }
        i += 1;
        clipRef.current = i;
        const next = videos.current.get(clips[i].mediaId)!;
        next.currentTime = clips[i].start;
        if (next !== current) {
          current!.pause();
          current = next;
          next.play().catch(() => onPlayingChange(false));
        }
      }
      const out = toOutput(timeline, i, Math.min(Math.max(current!.currentTime, clips[i].start), clips[i].end));
      reported.current = out;
      onTime(out);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // Restart the loop only when play state or the edit changes; the playhead is read once at start.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, timeline]);

  const caption = visibleCaptions(timeline).find((c) => playhead >= c.start && playhead < c.end);
  const titles = timeline.titles.filter((t) => playhead >= t.start && playhead < t.end);
  const frame: CSSProperties = vertical ? { height: "min(52vh, 600px)", aspectRatio: "9 / 16", maxWidth: "100%" } : { width: "100%", maxWidth: "calc(min(52vh, 600px) * 16 / 9)", aspectRatio: "16 / 9" };
  const text: CSSProperties = {
    fontFamily: '"Arial Black", "Arial", sans-serif',
    fontWeight: 900,
    textTransform: "uppercase",
    color: "#fff",
    WebkitTextStroke: `${vertical ? 0.32 : 0.45}cqh #000`,
    paintOrder: "stroke fill",
    lineHeight: 1.1,
    textAlign: "center",
  };

  return (
    <div className="relative mx-auto overflow-hidden bg-ink [container-type:size]" style={frame} data-testid="preview-frame">
      {media.map((m) => {
        const sameShape = vertical === m.height >= m.width;
        return (
          <video
            key={m.id}
            ref={(el) => {
              if (el) videos.current.set(m.id, el);
              else videos.current.delete(m.id);
            }}
            src={src(m.id)}
            playsInline
            preload="auto"
            className="absolute inset-0 h-full w-full"
            style={{ objectFit: sameShape ? "cover" : "contain", visibility: m.id === active ? "visible" : "hidden" }}
            aria-hidden={m.id !== active}
            aria-label={m.id === active ? "Preview" : undefined}
          />
        );
      })}
      {timeline.clips.length === 0 && (
        <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-white/70">Import videos to start. They go on the timeline in order.</p>
      )}
      {titles.map((t) => (
        <p key={t.id} className="pointer-events-none absolute inset-x-[8%] top-[12%]" style={{ ...text, fontSize: vertical ? "5cqh" : "7.5cqh" }}>
          {t.text}
        </p>
      ))}
      {caption && (
        <p data-testid="preview-caption" className="pointer-events-none absolute inset-x-[8%]" style={{ ...text, bottom: vertical ? "22%" : "12%", fontSize: vertical ? "4.4cqh" : "6cqh" }}>
          {caption.text
            .trim()
            .split(/\s+/)
            .map((word, i) => (
              <span key={i} style={caption.emphasis.includes(i) ? { color: "#E0201B" } : undefined}>
                {i > 0 ? " " : ""}
                {word}
              </span>
            ))}
        </p>
      )}
    </div>
  );
}
