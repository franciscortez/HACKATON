# Tool 06: Source video to variations

Status: LIVE locally and through the production hosted connector. Windows verified; macOS setup provided but execution unverified. Design: [`superpowers/specs/2026-10-26-video-to-variations-design.md`](../superpowers/specs/2026-10-26-video-to-variations-design.md). Plan: [`superpowers/plans/2026-10-26-video-to-variations.md`](../superpowers/plans/2026-10-26-video-to-variations.md).

A video editor in the Workbench. It opens straight into the editor. Import one or more videos, edit them by hand on a timeline or by asking Claude, and export a vertical or horizontal MP4.

| | |
|---|---|
| Input | Up to 20 owned videos per edit, each up to 20 minutes, one hour in total. Speech is optional |
| Output | One edited MP4: 9:16 (1080×1920) or 16:9 (1920×1080) |
| Rule | Runs locally, or through a paired same-computer connector from the Vercel UI. Original videos and renders stay local; Claude receives transcripts, prompts and selected still frames |
| Buyer | Businesses with talking-head, product or long-form video they never repurpose |
| Workaround | Manual editing (Premiere, CapCut) or paid tools (Opus Clip, Voogle edit) |

## Flow
1. **Open the tool.** The editor shows at once: your last edit, or a new empty one. "New edit" starts another.
2. **Import videos.** Use Import (several at once) or drop files anywhere on the editor. Each video goes into the Media panel and onto the end of the timeline, in order. The app makes a preview copy, thumbnails, a waveform and, if there is speech, a transcript with word timings.
3. **Edit by hand.** Trim clip edges, split at the playhead, delete, drag clips to reorder, drag a video from Media onto the timeline (or press Add), turn captions on and edit their text, switch 9:16 / 16:9.
4. **Edit by asking.** Type a request in the Claude panel ("cut the pauses and add captions"), optionally over a range you marked on the timeline. Claude Code, signed in with your own Claude subscription, returns a new timeline; the panel shows its summary and "Changed a–b". For a video with no speech, asking for captions makes Claude write short on-screen text itself, which you can edit.
5. **Undo and redo** walk every version, whether you, an import or Claude made it.
6. **Export** renders the current version with FFmpeg and downloads it.

## Editor layout
Header (edit name, format switch, captions, undo/redo, status, Export, New edit) · Media panel on the left · preview with live captions and titles in the middle · Claude panel on the right · full-width timeline below with tracks for titles, captions, video thumbnails (a colour band per video) and the audio waveform. Light Leveric theme. On narrow screens the panels stack.

## Output format
MP4, H.264 + AAC, 30 fps, −14 LUFS. Captions: up to 6 words, uppercase, white with a black outline, one emphasised word in red. Each clip whose video is the other shape gets a blurred background fill. Videos with no sound play silence.

## Acceptance criteria
- Opening the tool shows the editor, never an upload page.
- Several videos import at once and land on the timeline in order; videos with or without speech or sound work.
- Trim, split, delete, reorder, add from Media and caption text edits update the preview at once and are still there after a reload.
- A prompt, optionally over a marked range, creates a new version and shows "Changed a–b"; captions for speech use the transcript; videos without speech get text Claude writes.
- Undo and redo walk every version.
- Export 9:16 and 16:9 give files matching the output format (checked with ffprobe and `ebur128`, −14 LUFS ±1); an empty timeline cannot be exported.
- On Vercel the tool shows "Runs locally" and its API returns 503 `local_only`.
- Browser check passes at desktop width and 375 px.

## Cost
$0 per run in money: Claude Code uses the user's flat-rate subscription; everything else runs on this computer.

## Out of scope
Your own images or text layers beyond titles and captions, keyframes, transitions, picture-in-picture or multi-track compositing, multi-user editing, rendering on Vercel.

## Hosted connector preview

See [approved design](../superpowers/specs/2026-10-26-hosted-video-connector-design.md) and [implementation plan](../superpowers/plans/2026-10-26-hosted-video-connector.md). The hosted page first shows pairing when the rollout flag is enabled. Manual editing remains available without Claude authentication; import/export require their local dependencies. Claude uses native subscription sign-in; Codex remains unavailable. Windows browser acceptance is recorded in the handoff; production Windows acceptance is complete; macOS execution and fresh-machine installation remain unverified.

## Public onboarding

Approved: provide Windows and macOS setup tabs directly in the hosted pairing screen, with commands to install prerequisites, clone a public connector-only repository under the user home directory, build, start and paste the pairing code. Keep Workbench private. Missing dependencies must identify the affected capabilities. Production pairing is enabled as part of this release; macOS hardware is not labelled verified without execution evidence. Plan: ../superpowers/plans/2026-10-26-public-connector-setup.md.
