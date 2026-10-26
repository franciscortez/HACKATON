"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { StatusChip } from "@/components/workflow/StatusChip";
import { BusyLine } from "@/features/video-to-variations/components/BusyLine";
import { clock, videoApi, type ApiError, type ProjectView } from "@/features/video-to-variations/components/client";
import { ClaudePanel } from "@/features/video-to-variations/components/editor/ClaudePanel";
import { MediaBin, type ImportItem } from "@/features/video-to-variations/components/editor/MediaBin";
import { PreviewPlayer } from "@/features/video-to-variations/components/editor/PreviewPlayer";
import { TimelineView, type Selection } from "@/features/video-to-variations/components/editor/TimelineView";
import { LocalOnlyNotice } from "@/features/video-to-variations/components/LocalOnlyNotice";
import { ConnectComputer } from "@/features/video-to-variations/components/ConnectComputer";
import { mediaReadiness, computerStatus, connectorSession, disconnectComputer, lastProjectKey, refreshAssets, type ConnectorStatus } from "@/features/video-to-variations/components/connector-client";
import { duration, editCaption, insertClip, remove, setCaptions, setFormat, split } from "@/features/video-to-variations/services/timeline-ops";
import type { ClaudeModel, Project, TimeRange, Timeline } from "@/features/video-to-variations/types";
import type { RunProgress } from "@/types/tool";
import { cx } from "@/lib/utils";

const SAVE_DELAY_MS = 600;
const FRAME_S = 1 / 30;

function remember(id: string | null) {
  try {
    if (id) localStorage.setItem(lastProjectKey(), id);
    else localStorage.removeItem(lastProjectKey());
  } catch {
    // Storage is a convenience only.
  }
}

const message = (e: unknown) => (e as ApiError)?.message ?? "Something went wrong. Try again.";
const typing = (el: EventTarget | null) => el instanceof HTMLElement && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));
const hasFiles = (e: React.DragEvent) => e.dataTransfer.types.includes("Files");

/** Tool 06: a video editor. Import videos, edit them by hand on the timeline or by asking Claude, then export. */
export function VideoEditor() {
  const [connectionAttempt, setConnectionAttempt] = useState(0);
  const [computer, setComputer] = useState<ConnectorStatus | null>(null);
  const [, setMediaRevision] = useState(0);
  const [gate, setGate] = useState<"checking" | "ok" | ApiError>("checking");
  const [project, setProject] = useState<Project | null>(null);
  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [preview, setPreview] = useState<Timeline | null>(null);
  const [style, setStyle] = useState("");
  const [busy, setBusy] = useState<RunProgress | null>(null);
  const [thinking, setThinking] = useState<RunProgress | null>(null);
  const [queue, setQueue] = useState<ImportItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [playhead, setPlayhead] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [selection, setSelection] = useState<Selection>(null);
  const [range, setRange] = useState<TimeRange | null>(null);
  const [mark, setMark] = useState<number | null>(null);
  const [model, setModel] = useState<ClaudeModel>("opus");
  const [lastExport, setLastExport] = useState<string | null>(null);
  const [dropping, setDropping] = useState(false);
  const pending = useRef<{ t: Timeline; label: string } | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const saving = useRef<Promise<void>>(Promise.resolve());

  const open = useCallback((view: Pick<ProjectView, "project" | "timeline"> & Partial<ProjectView>) => {
    setProject(view.project);
    setTimeline(view.timeline);
    setStyle(view.style ?? "");
    setPlayhead(0);
    setSelection(null);
    setRange(null);
    setLastExport(null);
    setNotice(null);
    remember(view.project.id);
  }, []);

  const newEdit = useCallback(async () => open(await videoApi.create()), [open]);

  // Open straight into the editor: the last edit, or a new empty one.
  useEffect(() => {
    let alive = true;
    (async () => {
      const problem = await videoApi.health().catch((e) => ({ code: "connector_offline", message: message(e) }));
      if (!alive) return;
      setGate(problem ?? "ok");
      if (problem) return;
      if (connectorSession()) {
        try { setComputer(await computerStatus()); }
        catch (e) { setGate({ code: "connector_offline", message: message(e) }); return; }
      } else setComputer(null);
      let last: string | null = null;
      try {
        last = localStorage.getItem(lastProjectKey());
      } catch {}
      const view = last ? await videoApi.get(last).catch(() => null) : null;
      if (!alive) return;
      if (view) open(view);
      else await newEdit().catch((e) => setError(message(e)));
    })();
    return () => {
      alive = false;
    };
  }, [open, newEdit, connectionAttempt]);

  useEffect(() => {
    if (!project || !connectorSession()) return;
    const renew = () => refreshAssets(project, undefined, true).then(() => setMediaRevision((n) => n + 1)).catch((e) => setError(message(e)));
    const interval = window.setInterval(renew, 240_000);
    const visible = () => { if (document.visibilityState === "visible") void renew(); };
    document.addEventListener("visibilitychange", visible);
    return () => { clearInterval(interval); document.removeEventListener("visibilitychange", visible); };
  }, [project]);

  useEffect(() => {
    if (!project || !connectorSession()) return;
    const pendingKey = `vtv:pending:${connectorSession()!.connectorId}:${project.id}`;
    const operationId = sessionStorage.getItem(pendingKey);
    if (!project.job && !operationId) return;
    let cancelled = false;
    const interval = window.setInterval(async () => {
      try {
        if (operationId) {
          const operation = await videoApi.operation(project.id, operationId);
          if (operation.state !== "running") {
            if (operation.state === "completed" && operation.result?.file) {
              await refreshAssets(project, operation.result.file);
              if (!cancelled) setLastExport(operation.result.file);
            }
            sessionStorage.removeItem(pendingKey);
            if (operation.error && !cancelled) setError(operation.error.message);
          }
        }
        const view = await videoApi.get(project.id);
        if (!cancelled) { setProject(view.project); setTimeline(view.timeline); }
      } catch (e) { if (!cancelled) setError(message(e)); }
    }, 2000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [project]);

  /** Saves the latest hand edit now (if any), in order with earlier saves. */
  const flush = useCallback(() => {
    window.clearTimeout(timer.current);
    const next = pending.current;
    pending.current = null;
    if (next && project) {
      saving.current = saving.current.then(() =>
        videoApi.saveTimeline(project.id, next.t, next.label).then(
          (res) => setProject(res.project),
          (e) => setError(message(e)),
        ),
      );
    }
    return saving.current;
  }, [project]);

  /** A hand edit: shows at once, saved as a version shortly after. */
  const commit = useCallback(
    (next: Timeline, label: string) => {
      if (!project || next === timeline) return;
      setTimeline(next);
      setPlayhead((p) => Math.min(p, duration(next)));
      pending.current = { t: next, label };
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => void flush(), SAVE_DELAY_MS);
    },
    [project, timeline, flush],
  );

  const readiness = mediaReadiness(computer);

  /** Imports files one after another; each lands at the end of the timeline as its own version. */
  async function importFiles(files: File[]) {
    if (!project || files.length === 0) return;
    if (!readiness.importReady) { setError(readiness.messages.join(" ")); return; }
    await flush();
    setPlaying(false);
    setError(null);
    const items: ImportItem[] = files.map((f) => ({ name: f.name, state: "waiting" }));
    setQueue(items);
    const update = (i: number, patch: Partial<ImportItem>) => setQueue((q) => q.map((item, j) => (j === i ? { ...item, ...patch } : item)));
    let failed = false;
    for (let i = 0; i < files.length; i++) {
      update(i, { state: "working", label: "Uploading…" });
      try {
        const res = await videoApi.importVideo(project.id, files[i], (p) => update(i, { label: p.label.replace(`${files[i].name}: `, "") }));
        setProject(res.project);
        setTimeline(res.timeline);
        update(i, { state: "working", label: "Done" });
      } catch (e) {
        failed = true;
        update(i, { state: "failed", label: message(e) });
      }
    }
    // Keep failures on screen; clear the rest.
    setQueue((q) => (failed ? q.filter((x) => x.state === "failed") : []));
  }

  async function go(n: number) {
    if (!project || busy || thinking || queue.some((q) => q.state !== "failed")) return;
    await flush();
    setPlaying(false);
    try {
      const res = await videoApi.restore(project.id, n);
      setProject(res.project);
      setTimeline(res.timeline);
      setPlayhead((p) => Math.min(p, duration(res.timeline)));
      setSelection(null);
    } catch (e) {
      setError(message(e));
    }
  }

  const canUndo = !!project && project.current > 1;
  const canRedo = !!project && project.versions.some((v) => v.n > project.current);

  async function ask(prompt: string): Promise<boolean> {
    if (!project) return false;
    await flush();
    setPlaying(false);
    setNotice(null);
    setThinking({ done: 0, total: 1, label: "Claude is starting" });
    try {
      const res = await videoApi.prompt(project.id, { prompt, range, model }, setThinking);
      setProject(res.project);
      setTimeline(res.timeline);
      setPlayhead(res.changedRange?.start ?? 0);
      setSelection(null);
      return true;
    } catch (e) {
      setNotice(message(e));
      setProject(await videoApi.get(project.id).then((v) => v.project).catch(() => project));
      return false;
    } finally {
      setThinking(null);
    }
  }

  async function exportVideo() {
    if (!project) return;
    if (!readiness.exportReady) { setError(readiness.messages.join(" ")); return; }
    await flush();
    setPlaying(false);
    setError(null);
    setBusy({ done: 0, total: 1, label: "Starting the export" });
    try {
      const res = await videoApi.exportVideo(project.id, setBusy);
      setProject(res.project);
      const href = videoApi.exportFile(project.id, res.file);
      setLastExport(res.file);
      const a = document.createElement("a");
      a.href = href;
      a.download = "";
      a.click();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(null);
    }
  }

  async function startNew() {
    await flush();
    setPlaying(false);
    setError(null);
    await newEdit().catch((e) => setError(message(e)));
  }

  async function rename(name: string) {
    if (!project || !name.trim() || name.trim() === project.name) return;
    try {
      setProject((await videoApi.rename(project.id, name.trim())).project);
    } catch (e) {
      setError(message(e));
    }
  }

  const importing = queue.some((q) => q.state !== "failed");
  const locked = !!busy || !!thinking || importing || !!project?.job;

  // Keyboard shortcuts, as in other editors. Ignored while typing.
  useEffect(() => {
    if (!timeline) return;
    const onKey = (e: KeyboardEvent) => {
      if (typing(e.target) || locked) return;
      const total = duration(timeline);
      const key = e.key.toLowerCase();
      if (key === " ") {
        e.preventDefault();
        setPlaying((p) => !p);
      } else if (key === "s" && !e.ctrlKey && !e.metaKey) commit(split(timeline, playhead), `Split at ${clock(playhead)}`);
      else if ((key === "delete" || key === "backspace") && selection?.kind === "clip") {
        commit(remove(timeline, selection.id), "Deleted clip");
        setSelection(null);
      } else if (key === "z" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        void (e.shiftKey ? canRedo && go(project!.current + 1) : canUndo && go(project!.current - 1));
      } else if (key === "y" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        if (canRedo) void go(project!.current + 1);
      } else if (key === "arrowleft" || key === "arrowright") {
        e.preventDefault();
        const step = (e.shiftKey ? 1 : FRAME_S) * (key === "arrowleft" ? -1 : 1);
        setPlaying(false);
        setPlayhead((p) => Math.min(total, Math.max(0, p + step)));
      } else if (key === "i") setMark(playhead);
      else if (key === "o" && mark !== null && playhead !== mark) setRange({ start: Math.min(mark, playhead), end: Math.max(mark, playhead) });
      else if (key === "escape") {
        setSelection(null);
        setRange(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (gate === "checking") return <p className="label mt-6 text-ink-soft">Checking this computer…</p>;
  if (gate !== "ok") return process.env.NEXT_PUBLIC_VIDEO_CONNECTOR_ENABLED === "1" || connectorSession()
    ? <><ConnectComputer onConnected={() => { setGate("checking"); setConnectionAttempt((n) => n + 1); }} />{gate.code !== "local_only" && gate.message && <p role="alert" className="mt-3 text-sm text-danger">{gate.message}</p>}</>
    : <LocalOnlyNotice code={gate.code} />;
  if (!project || !timeline) {
    return error ? (
      <p role="alert" className="border border-danger bg-white px-4 py-3 font-medium text-danger">
        {error}
      </p>
    ) : (
      <p className="label mt-6 text-ink-soft">Opening the editor…</p>
    );
  }

  const shown = preview ?? timeline;
  const total = duration(shown);
  const card = selection?.kind === "card" ? shown.captions.cards.find((c) => c.id === selection.id) : undefined;
  const selectedClip = selection?.kind === "clip" ? shown.clips.find((c) => c.id === selection.id) : undefined;
  const empty = shown.clips.length === 0;
  // cx only joins classes, so the active and resting colours must never both be present.
  const toggle = (active: boolean) => cx("label border px-2.5 py-1.5 transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-40", active ? "border-ink bg-ink text-white" : "border-rule-l bg-white hover:border-ink");
  const button = toggle(false);

  return (
    <div
      className={cx("relative flex flex-col gap-3 pb-6", dropping && "outline-2 outline-offset-4 outline-blue")}
      onDragOver={(e) => {
        if (!hasFiles(e) || locked) return;
        e.preventDefault();
        setDropping(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setDropping(false);
      }}
      onDrop={(e) => {
        if (!hasFiles(e)) return;
        e.preventDefault();
        setDropping(false);
        if (!locked) void importFiles([...e.dataTransfer.files].filter((f) => f.type.startsWith("video/") || /\.(mov|mp4|m4v|webm|mkv)$/i.test(f.name)));
      }}
    >
      {computer && <div className="flex flex-wrap items-center gap-3 border-b border-rule-l pb-3 text-sm">
        <span>Computer connected · Claude Code {computer.providers.claude.ready ? "ready" : "not ready"}</span>
        <button type="button" onClick={() => void computerStatus().then(setComputer).catch((e) => setError(message(e)))} className="underline">Check connection</button>
        <button type="button" onClick={() => void disconnectComputer().catch(() => {}).finally(() => { setComputer(null); setProject(null); setTimeline(null); setGate({ code: "local_only", message: "Disconnected. Restart the connector for a new pairing code." }); })} className="underline">Disconnect</button>
        {!computer.providers.claude.ready && <p className="w-full text-warn">{computer.providers.claude.message}</p>}
        {Object.entries(computer.dependencies).filter(([, ready]) => !ready).map(([name]) => <p key={name} className="text-warn">{name === "transcriptionModel" ? "Speech model is not cached. The first import downloads it." : `${name} is unavailable. Run pnpm video:connector:doctor.`}</p>)}
        <p className="w-full text-xs text-ink-soft">Videos stay on this computer. Claude receives prompts, transcripts and selected frames. Codex is not available yet.</p>
      </div>}
      <div className="flex flex-wrap items-center gap-2 border-b border-rule-l pb-3">
        <label className="mr-auto flex min-w-0 items-center gap-2">
          <span className="sr-only">Edit name</span>
          <input
            key={project.id + project.name}
            defaultValue={project.name}
            maxLength={80}
            onBlur={(e) => void rename(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
            className="min-w-0 max-w-[24ch] border border-transparent bg-transparent px-1 py-0.5 font-semibold hover:border-rule-l focus:border-ink"
          />
          <span className="hidden font-mono text-xs text-ink-soft sm:inline">
            {project.media.length} {project.media.length === 1 ? "video" : "videos"} · {clock(total)}
          </span>
        </label>
        <div role="radiogroup" aria-label="Format" className="flex">
          {(["9:16", "16:9"] as const).map((f) => (
            <button key={f} type="button" role="radio" aria-checked={shown.format === f} disabled={locked} onClick={() => commit(setFormat(timeline, f), `Format ${f}`)} className={cx(toggle(shown.format === f), "border-r-0 last:border-r")}>
              {f === "9:16" ? "9:16 Reels" : "16:9 YouTube"}
            </button>
          ))}
        </div>
        <button
          type="button"
          aria-pressed={shown.captions.enabled}
          disabled={locked || shown.captions.cards.length === 0}
          title={shown.captions.cards.length === 0 ? "No speech to caption. Ask Claude to write on-screen text." : undefined}
          onClick={() => commit(setCaptions(timeline, !timeline.captions.enabled), timeline.captions.enabled ? "Captions off" : "Captions on")}
          className={toggle(shown.captions.enabled)}
        >
          Captions {shown.captions.enabled ? "on" : "off"}
        </button>
        <button type="button" aria-label="Undo" disabled={locked || !canUndo} onClick={() => go(project.current - 1)} className={button}>
          ↶ Undo
        </button>
        <button type="button" aria-label="Redo" disabled={locked || !canRedo} onClick={() => go(project.current + 1)} className={button}>
          Redo ↷
        </button>
        <StatusChip value={project.status} />
        <button type="button" disabled={locked || empty || !readiness.exportReady} onClick={exportVideo} className="arrow-link bg-ink px-4 py-1.5 text-sm font-medium text-white transition-colors duration-300 hover:bg-blue disabled:cursor-not-allowed disabled:bg-ink-soft/50">
          Export {shown.format} <span className="arrow">→</span>
        </button>
        <button type="button" disabled={locked} onClick={startNew} className="label arrow-link text-ink hover:text-blue disabled:opacity-40">
          New edit <span className="arrow">→</span>
        </button>
      </div>

      {computer && <details className="border-t border-rule-l py-2"><summary className="cursor-pointer py-2 text-sm font-medium text-blue">Setup instructions for this computer</summary><ConnectComputer instructionsOnly onConnected={() => {}} /></details>}
      {readiness.messages.length > 0 && <div role="status" className="border border-warn bg-white p-3 text-sm"><p className="font-semibold">Finish setting up this computer</p>{readiness.messages.map((text) => <p key={text}>{text}</p>)}<p>Use the setup instructions, then select Check connection.</p></div>}
      {error && (
        <p role="alert" className="border border-danger bg-white px-3 py-2 text-sm font-medium text-danger">
          {error}
        </p>
      )}
      {lastExport && project.status === "APPROVED" && (
        <p className="text-sm">
          Exported.{" "}
          <a href={videoApi.exportFile(project.id, lastExport)} download referrerPolicy="no-referrer" className="text-blue underline-offset-4 hover:underline">
            Download again
          </a>
        </p>
      )}
      {busy && <BusyLine progress={busy} />}

      <div className="grid gap-3 lg:grid-cols-[240px_minmax(0,1fr)_330px]">
        <div className="order-2 lg:order-1">
          <MediaBin
            media={project.media}
            queue={queue}
            disabled={locked}
            importDisabled={!readiness.importReady}
            thumb={(mediaId, file) => videoApi.mediaFile(project.id, mediaId, file)}
            onImport={importFiles}
            onAdd={(mediaId) => {
              const m = project.media.find((x) => x.id === mediaId);
              if (m) commit(insertClip(timeline, m.id, 0, m.durationS, timeline.clips.length), `Added ${m.name}`);
            }}
          />
        </div>

        <section aria-label="Preview" className="order-1 flex min-w-0 flex-col gap-2 border border-ink bg-white p-3 lg:order-2">
          <PreviewPlayer media={project.media} src={(mediaId) => videoApi.mediaFile(project.id, mediaId, "proxy.mp4")} timeline={shown} playhead={playhead} playing={playing} onTime={setPlayhead} onPlayingChange={setPlaying} />
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button type="button" aria-label="Back one frame" disabled={empty} onClick={() => setPlayhead((p) => Math.max(0, p - FRAME_S))} className={button}>
              ◂
            </button>
            <button type="button" disabled={empty} onClick={() => setPlaying((p) => !p)} className="label min-w-20 bg-ink px-3 py-1.5 text-white hover:bg-blue disabled:bg-ink-soft/50">
              {playing ? "Pause" : "Play"}
            </button>
            <button type="button" aria-label="Forward one frame" disabled={empty} onClick={() => setPlayhead((p) => Math.min(total, p + FRAME_S))} className={button}>
              ▸
            </button>
            <span className="font-mono text-xs tabular-nums" aria-live="off">
              {clock(playhead)} / {clock(total)}
            </span>
            <span className="mx-1 h-4 w-px bg-rule-l" />
            <button type="button" disabled={locked || empty} onClick={() => commit(split(timeline, playhead), `Split at ${clock(playhead)}`)} className={button} title="S">
              Split
            </button>
            <button type="button" disabled={locked || !selectedClip} onClick={() => selectedClip && (commit(remove(timeline, selectedClip.id), "Deleted clip"), setSelection(null))} className={button} title="Delete">
              Delete clip
            </button>
            <button type="button" disabled={empty} onClick={() => setMark(playhead)} className={button} title="I">
              Mark in
            </button>
            <button type="button" disabled={mark === null} onClick={() => mark !== null && playhead !== mark && setRange({ start: Math.min(mark, playhead), end: Math.max(mark, playhead) })} className={button} title="O">
              Mark out
            </button>
          </div>
          {card && (
            <form
              aria-label="Edit caption"
              className="flex flex-wrap items-center gap-2 border-t border-rule-l pt-2"
              onSubmit={(e) => {
                e.preventDefault();
                const text = String(new FormData(e.currentTarget).get("caption") ?? "").trim();
                if (text && text !== card.text) commit(editCaption(timeline, card.id, text), "Edited caption");
                setSelection(null);
              }}
            >
              <label htmlFor="caption-text" className="label text-ink-soft">
                Caption
              </label>
              <input id="caption-text" name="caption" key={card.id} defaultValue={card.text} maxLength={200} className="min-w-0 flex-1 border border-rule-l px-2 py-1 text-sm" />
              <button type="submit" disabled={locked} className="label bg-ink px-3 py-1.5 text-white hover:bg-blue">
                Save
              </button>
            </form>
          )}
        </section>

        <div className="order-3">
          <ClaudePanel
            project={project}
            busy={thinking}
            disabled={locked || empty || (computer !== null && !computer.providers.claude.ready)}
            range={range}
            model={model}
            notice={notice}
            style={style}
            onModel={setModel}
            onClearRange={() => setRange(null)}
            onShowRange={(r) => {
              setRange(r);
              setPlayhead(r.start);
            }}
            onRestore={go}
            onSend={ask}
            onSaveStyle={async (text) => {
              await videoApi.saveStyle(project.id, text);
              setStyle(text);
            }}
          />
        </div>
      </div>

      <TimelineView
        timeline={shown}
        media={project.media}
        playhead={playhead}
        range={range}
        selection={selection}
        disabled={locked}
        asset={(mediaId, file) => videoApi.mediaFile(project.id, mediaId, file)}
        onSeek={(t) => {
          setPlaying(false);
          setPlayhead(t);
        }}
        onRange={setRange}
        onSelect={setSelection}
        onPreview={setPreview}
        onCommit={commit}
        onInsert={(mediaId, index) => {
          const m = project.media.find((x) => x.id === mediaId);
          if (m) commit(insertClip(timeline, m.id, 0, m.durationS, index), `Added ${m.name}`);
        }}
      />
      <p className="font-mono text-[11px] text-ink-soft">
        Drop videos anywhere to import · Space play · S split · Delete remove clip · drag clip edges to trim · drag clips to reorder · Shift+drag ruler or I / O to mark a range · Ctrl+Z undo · Ctrl+Shift+Z redo
      </p>
    </div>
  );
}
