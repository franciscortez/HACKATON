# Design: Tool 06, Source video to variations (video editor)

Date: 26 October 2026. Status: approved by the user (v3, plan mode). Supersedes v1 ("three hooks, three shorts") and v2 (single-video editor), both built earlier the same day.

## Intent
A real editor inside the Workbench, like Voogle edit or a light Premiere: open it, import videos, edit by hand on a timeline or by asking Claude, export. Claude runs through the user's own Claude Code subscription, so there is no API key and no per-call bill.

## How we got here
- v1 was a form (audience, three hooks). The user asked to remove the hooks and the form: "just paste video and I get to prompt on the website", "make sure that this is like editing site where you can edit for real", with a Premiere Pro screenshot as reference.
- v2 was a single-video editor behind an upload page. The user asked for "multiple videos" and "I do not want the first page to be uploading videos, make UI the layout editor already". They also saw no captions: the test server used a fake Claude, and their video had no speech.

## Reference
- **edit.voogle.app** and its demo reel (facebook.com/reel/1582044807273422): 9:16 preview in the centre, timeline below (ruler, thumbnails, waveform, caption clips, graphic clips), Claude chat on the right with its report, "Changed 0:00.0–2:21.3", Restore and Show on timeline. Export 1080×1920, 30 fps, H.264 + AAC, −14 LUFS.

## Decisions (the user's)
- No hooks, audience or form. The tool opens straight into the editor, reopening the last edit; "New edit" starts fresh.
- Several videos per edit. Imports go to a Media bin and are appended to the end of the timeline in order.
- Hand edits: trim, split, delete, reorder, edit caption text. Undo and redo shared with Claude's edits.
- Imported videos load raw; nothing else changes until the user edits or asks.
- A video with no speech: asking for captions makes Claude write the on-screen text itself (editable, same style).
- Light Leveric theme. Output 9:16 by default with a 16:9 switch.
- Web tool in the Workbench, no desktop wrapper. Slug and name stay `video-to-variations` / "Source video to variations". Built on current `main`.

## Calls made by the builder (flagged to the user)
- One project is one edit holding many videos (`m1`…`m20`). Card summary: "Owned video to a captioned short, edited by asking or by hand."
- Caption cards belong to a video (its own seconds), so they move with its clips; they show only over clips of that video.
- An edit may be empty; Claude and export refuse an empty timeline.
- The preview plays live in the browser from a 720p H.264 proxy per video (one `<video>` each, switched at clip boundaries), drawing captions and titles as HTML. FFmpeg renders only on export, framing each clip by its own shape.
- Captions are built from transcripts but start off. If Claude turns captions on and leaves out a video that has speech, the server fills that video's cards from its transcript.
- Export is approve plus render (DRAFT, EDITED, APPROVED chip kept).
- Limits: 20 videos, 20 minutes each, one hour per edit.
- Desktop first; at 375 px the panels stack and the timeline scrolls sideways.

## Model
A versioned `Timeline` (format; ordered clips `{mediaId, start, end}`; caption cards `{mediaId, start, end, text, emphasis}`; titles in output seconds) is the single source of truth. Every change (an import, a hand edit or Claude) saves a new version; a new change after an undo drops the redo branch. Claude returns a whole new timeline through a JSON schema and never runs commands.

## Goals
- Editing feels immediate.
- Claude's edits and hand edits mix freely and are always undoable.
- The export posts as is.

## Non-goals
Compositing, keyframes, transitions, collaboration, hosted rendering.

## Anti-goals
- Invented caption words for speech (written text is only for videos with no speech, on request).
- Losing work: every change is a version.
- Sending videos anywhere.
