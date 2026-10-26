# Tool 06 v3: multi-video editor, editor-first — Plan (delta on the v2 build)

> Execute with superpowers:executing-plans (native, no subagent per task). Worktree `E:\Code\HACKATON-video`, branch `feat/video-to-variations` (based on `origin/main` c3ae5b6, all work uncommitted). Ledger: scratchpad `ledger.md`.

## Context

v2 (built this session, uncommitted) is a single-video editor: timeline with trim/split/delete/reorder, caption track, Claude panel, undo/redo, 9:16/16:9 export. Tasks 0a–6 are done and green (unit/API/real-FFmpeg integration); Task 7 (UI) is written and type/lint clean, e2e not yet run.

The user tried it on :3002 and reported:
- "it didn't add caption". Cause found: :3002 is the **e2e server started with the fake Claude CLI** (canned reply "Cut the pauses and turned captions on.", `cards: []`), and their `3.mp4` has sound but **no speech** (transcript 0 words). So nothing could be captioned.
- "I want to include multiple videos".
- "I do not want the first page to be uploading videos, make UI the layout editor already."

**User decisions (26 Oct):** no speech + "add captions" → Claude writes the on-screen text itself (editable, same caption style); imports go into a Media bin and are auto-appended to the end of the timeline; the tool opens straight into the editor, reopening the last edit, with a "New edit" button.

**My calls:** one project = one edit with many media; caption cards belong to a media item (source time), so they move with their clips; an edit may be empty (export refuses an empty timeline); preview uses one hidden `<video>` per media item and switches at clip boundaries; imports upload one file at a time with per-file progress; dropping files anywhere on the editor imports them.

## Global Constraints (unchanged from v2 unless noted)
Export MP4 H.264 CRF 20 veryfast, AAC 160k, 30 fps, two-pass −14 LUFS (compressor → measured gain → limiter), +faststart; 9:16 = 1080×1920, 16:9 = 1920×1080, other-shape media framed over a blurred fill **per clip**. Captions ≤6 words, uppercase, white, black outline, emphasis `#E0201B`, margins 22%/12% bottom, 8% sides. Each media ≤20 min, ≤4 GB; **edit total ≤60 min, ≤20 media**. Claude CLI flags unchanged. Local only (503 `local_only`). Light Leveric theme. Tests never call real Claude.

## Review Focus
1. Clips from media of different sizes/frame rates/with and without audio export together (per-clip framing, `aevalsrc` silence for silent media). Task C.
2. Caption cards only show over clips of their own media after reorder across media. Task A.
3. Preview switching between two `<video>` elements at a boundary (no black flash longer than one frame on seek; paused state correct). Task F (e2e asserts playhead advances across the boundary).
4. Import while Claude is working → queued or 409, never corrupting versions. Task E.
5. Empty edit: undo back to empty, export refused with a clear message. Tasks A/E.

---

### Task A: Media-aware model
**Files:** `schemas/timeline.schema.ts`, `schemas/project.schema.ts`, `types/index.ts`, `services/timeline.ts`, `services/timeline-ops.ts`, `services/workspace.ts`; tests `timeline`, `timeline-ops`, `workspace`.
- Timeline: clips `{id, mediaId, start, end}`; cards `{id, mediaId, start, end, text, emphasis}`. Empty `clips` allowed (normalise no longer throws for empty; drops clips whose media is unknown).
- Project: `{ id, name ("Untitled edit"), createdAt, media: Media[], sessionId, versions, current, status, job }`; `Media = { id ("m1".."m20"), name, file, durationS, width, height, hasAudio, language }`.
- Workspace: `create(name?)` writes v001 = empty timeline (`source: "upload", label: "New edit"`); `mediaPath(id, mediaId, ...parts)`; `addMedia(id, media)`; folders `media/<mediaId>/{source.ext, proxy.mp4, thumbs/, frames/, waveform.png, transcript.json, silences.json}`.
- `appendMedia(t, media, words)`: adds clip `[0, duration]` at the end and its caption cards; `remove` may empty the timeline; `visibleCaptions` matches `card.mediaId === clip.mediaId`.
- [ ] Tests first: append two media → 2 clips + cards tagged; reorder → captions of m2 only over m2's clip; remove last clip → empty; normalise drops clip with unknown mediaId.

### Task B: Import = add media + append
**Files:** `services/ingest.ts` → `addMedia(ws, id, body, {fileName}, onProgress)`; tests `ingest`.
- Same checks/assets as v2 per media (probe, proxy, thumbs, frames, waveform, transcript, silences); limits per media and totals (20 media, 60 min) → `too_many` 413.
- On success: register media, write new version `appendMedia(...)` labelled `Added <name>`; on failure remove only that media folder.
- [ ] Tests: second import appends after the first; failure leaves project and versions untouched; 21st media → `too_many`.

### Task C: Multi-input export
**Files:** `services/ffmpeg-args.ts` (`buildRenderArgs({inputs:[{path, w, h, hasAudio}], clips:[{input, start, end}], format, assName, out, loudness?})`, `buildLoudnessArgs` same shape), `services/render.ts`; tests `ffmpeg-args`, integration `render`.
- One `-i` per media used; each clip: trim → setpts → framed to output size (fill or blurred fill by that media's shape) → `setsar=1,fps=30`; audio: media with sound `atrim,asetpts,aresample=48000,aformat=channel_layouts=stereo`, silent media `aevalsrc=0:channel_layout=stereo:sample_rate=48000:duration=<len>`; concat `n=N:v=1:a=1`; then subtitles, loudness (skip measurement when no media has sound).
- Export of an empty timeline → `EmptyTimelineError`.
- [ ] Unit: two inputs → `-i` twice, clip from input 1 uses `[1:v]`, portrait+landscape mix gets one `boxblur` branch only for the off-shape clip, silent media → `aevalsrc`. Integration (VIDEO_E2E): landscape speech clip + portrait silent clip → 1080×1920, duration = sum ±0.15 s, −14 LUFS ±1.

### Task D: Claude across media; writes text when there is no speech
**Files:** `services/claude-editor.ts`, `prompts/system.md`, fixtures `stream-*.jsonl` (clips/cards carry `mediaId`), tests `claude-editor`.
- Prompt lists each media: id, name, length, folder `media/<id>/`, and "no speech" where the transcript is empty.
- System prompt rule change: captions for speech use the transcript's words; **for media with no speech, when the user asks for captions or text, write short on-screen text yourself (≤6 words per card) based on the request and the frames**; titles only when asked; keep ids and mediaIds.
- Server safety net: if Claude enables captions, a media has transcript words and Claude returned no cards for it → rebuild that media's cards from the transcript.
- [ ] Tests: prompt names both media and "no speech"; safety net fills cards; fixture with written text for a silent media is accepted.

### Task E: Routes
**Files:** `services/api.ts`, `index.ts`, routes: `POST /api/video-projects` (create empty edit, JSON `{name?}` → `{project, timeline}`), `POST [id]/media` (upload, header `x-file-name`, NDJSON → `{project, timeline, media}`), `GET [id]` (project, timeline, `words: Record<mediaId, Word[]>`, style), `PUT [id]` (rename, `{name}`), `GET [id]/media/[mediaId]/[file]` (proxy.mp4 Range, waveform.png, tNNNN.jpg), `GET [id]/exports/[file]`, existing timeline/prompt/versions/export/style. Remove `[id]/assets`.
- Import and prompt/export share the job lock (409 `job_running`); export on empty timeline → 409 `empty_timeline`.
- [ ] Tests: create → v001 empty; import appends v002; import during prompt → 409; media asset traversal 400; export empty → 409.

### Task F: Editor-first UI
**Files:** `components/editor/VideoEditor.tsx` (no drop page; on open: last edit or create one), new `MediaBin.tsx` (list with thumb, name, length, speech/no-speech chip, "Add to timeline", drag to timeline; Import button, multi-select; per-file progress), `PreviewPlayer.tsx` (one `<video>` per media, active one visible; empty-state frame "Import videos to start"), `TimelineView.tsx` (clip colour band per media, empty-state hint, drop from bin inserts at pointer), `EditorHeader` inline (editable edit name, New edit). Delete `DropZone.tsx`. Whole editor is a file drop target.
- Layout desktop: `[Media 260px | Preview | Claude 340px]` row, timeline full width below. ≤1024 px: Media and Claude become tabs under the preview. 375 px: no horizontal page scroll.
- [ ] E2E (`PLAYWRIGHT_BASE_URL=http://localhost:3002`, fake Claude, VIDEO_E2E=1): open tool → editor visible with empty timeline (no upload page); import TTS clip + silent clip together → 2 clips; reorder; captions on → chips only over the speech clip; ask Claude (range) → new version; undo/redo; export 9:16 and 16:9; 375 px no overflow. Local-only notice test kept.
- [ ] `playwright-cli open --browser=msedge` screenshots desktop + 375 px.

### Task G: Close-out
- [ ] Stop the fake-Claude :3002 server; start a normal `pnpm dev -p 3002` (real Claude) for the user and say so.
- [ ] `pnpm typecheck`, `pnpm lint`, `pnpm test`, gated integration, e2e, `pnpm build`.
- [ ] Live check with real Claude (Sonnet): speech clip "cut the pauses and add captions"; silent clip "add captions about a summer outfit" → text appears.
- [ ] Update tool doc, design spec (v3 decisions), ARCHITECTURE §7b, HANDOFF; whole-branch review; report rulings. No commit unless asked.

## Verification
1. All suites green as above.
2. On :3002 with real Claude: import two videos at once, edit by hand, prompt, undo/redo, export both formats; ffprobe + ebur128.
3. `VERCEL=1` → "Runs locally" notice, API 503.
