# Tool 01: Meeting to action

Status: NEXT (first tool to build). Shared rules live in `../PRD.md`; design in `../DESIGN.md`; structure in `../ARCHITECTURE.md`.

## 1. Product note
| | |
|---|---|
| Buyer | Owner or ops lead at an expert service business that runs weekly team and client meetings |
| Recurring job | After every meeting, someone writes up who does what by when and emails it out |
| Current workaround | Fathom or Teams summary, then copy into ChatGPT, then fix wrong owners and invented dates by hand |
| Why better | Works on any transcript with no setup; owners come only from people in the meeting; never invents owners or dates; every action cites the quote it came from; output is reviewed and approved before export |
| Expected time saved | About 15-25 minutes per meeting; for 5 meetings a week, about 1.5-2 hours a week per business **(estimate, to validate)** |

Josh's bar (transcript ~17:00): "as soon as they finish a meeting, pressing stop, and it happens", with patterns that recognise names and send tasks somewhere, better than "here's my transcript, paste it into ChatGPT".

## 2. Inputs
| Input | Format | Notes |
|---|---|---|
| Settings | `src/data/settings.json` | Voice, sign-off, rules, data policy (one workspace) |
| Transcript (paste) | Plain text | Any format |
| Transcript (file) | `.txt`, `.md`, `.vtt`, `.srt` | Fathom markdown export supported (`[@m:ss](url) - **Name**` speaker lines, `**ACTION ITEM: ...**` lines) |
| Audio (file), **after the hackathon build** | `.mp3`, `.m4a`, `.wav`, `.webm`, max about 20 MB (~20 min) | Not in the hackathon build (user decision). Next step: transcribed by Groq Whisper (25 MB limit) via direct upload, because Vercel request bodies are capped at 4.5 MB; local faster-whisper when `dataPolicy` is `local-only` or Groq fails |
| Meeting details (optional) | Title, date, attendees | Date anchors relative deadlines ("tomorrow night") |

Input cap: 120,000 characters of transcript per run **(our call)**.

## 3. Outputs
### 3.1 Action register
| Field | Type | Rule |
|---|---|---|
| `id` | string | Stable within the run |
| `task` | string | Starts with a verb, under 120 characters |
| `owner` | person in the meeting or `Unassigned` | A speaker (full, first or partial name) or someone named in the transcript; otherwise `Unassigned` |
| `due` | ISO date, original phrase, or `No date` | Relative phrases resolved against meeting date and shown with the original words, e.g. `2026-10-27 ("tomorrow night")` |
| `priority` | `urgent` / `normal` | `urgent` only if the meeting says so |
| `quote` | string | Exact words from the transcript |
| `timestamp` | `m:ss` or empty | From the transcript when present |
| `confidence` | `high` / `medium` / `low` | Low confidence rows are highlighted for review |
| `flags[]` | `owner-unknown`, `date-unknown`, `owner-not-in-transcript`, `ambiguous` | Shown as chips |

### 3.2 Also produced
- **Decisions**: what was agreed, with quotes.
- **Open questions**: things raised but not resolved.
- **Follow-up email draft**: subject + body in the workspace voice and sign-off; lists actions grouped by owner; unassigned items listed as "Needs an owner".

### 3.3 Exports (only after approval)
- Copy as Markdown.
- Download CSV (`task, owner, due, priority, quote, timestamp`).
- Copy for Slack (grouped by owner).
- Copy email (subject and body separately).

Later (cross-cutting integrations in `PHASES.md`, not in this tool's first build): push to Asana, Notion or a Kanban board.

## 4. Rules
1. Never guess an owner or a date. Unknown stays `Unassigned` / `No date`.
2. Every action, decision and question cites an exact quote. Quotes are checked server-side: if the quote is not found in the transcript (after whitespace normalising), the item gets the `ambiguous` flag and `low` confidence.
3. Owners must be people in the meeting (speakers or people named in the transcript). Any other name produces `owner-not-in-transcript`.
4. Personal chit-chat (weekend news, sport) is ignored.
5. Explicit action lines from Fathom (`**ACTION ITEM: ...**`) are always included and matched to owners.
6. Workspace `rules[]` (settings) are added to the prompt.

## 5. Pipeline
1. **Transcribe** (audio only): Groq Whisper, fallback faster-whisper (`python -I scripts/transcribe.py` from the `video-editing` skill, model `small`). Output is an SRT-style transcript.
2. **Parse**: detect format (Fathom md, VTT, SRT, plain). Produce `segments[] { speaker, timestamp, text }`.
3. **Chunk** if over ~25k tokens: split on speaker turns with overlap; extract per chunk; merge and de-duplicate by task similarity.
4. **Extract**: `generateText` + `Output.object` with the Zod schema, one call per transcript part (about 10,000 characters); system prompt lists the speakers, house rules and meeting date. Progress streams to the browser after each part.
5. **Check**: verify quotes, map owners to people in the meeting, resolve dates said with the action, set flags and confidence.
6. **Draft email**: second, small call using the checked register (not the raw transcript).
7. **Return** register, decisions, questions, email and cost note.

## 6. Examples
### A. Leveric (internal, real)
- Source: `docs/TRANSCRIPT.md` (L10, 26 Oct 2026). User approved using it as-is: committed, deployed and sent to cloud models. `dataPolicy: "cloud-ok"`.
- People come from the transcript: Josh Batalibasi, Francis Emil Cortez, Yohan, Jaz.
- Expected actions (golden set, from the Fathom action lines and discussion):

| Task | Owner | Due |
|---|---|---|
| Fix preview branch DB so it connects to the right branch | Yohan | No date |
| Stop YSL CI running on draft PRs | Yohan | No date |
| Reply to Ruth about latest videos; confirm update | Jaz | 2026-10-27 ("tomorrow night") |
| Remove Melissa's Formula admin; keep partner access; send login steps (email must match Wendy's) | Yohan | No date |
| Send Fathom recording and slides to Jaz, Yohan, Francis | Josh | No date |
| Test role-based access PR before merging | Francis | No date |

Note: the `Fix preview branch DB` owner is discussed by Yohan; the model must justify the owner with a quote.

### B. Synthetic accounting-firm partners meeting (no setup)
- Source: `tests/fixtures/meeting-to-action/harbourside-partners.md`, a synthetic partners meeting: lodgement deadlines, a new client onboarding, a staff member mentioned only by first name, and one task with no owner.
- Owners come from its speakers (Margaret Chen, David O'Neill, Sophie Tran, Liam Walsh); "Priya" is mentioned only as help, and the clearance letter has no owner.
- Shows reuse: a different business and meeting, the same code, no configuration.

### C. Failure cases (demo one)
| Case | Expected behaviour |
|---|---|
| Transcript with no speaker names | Runs, but all owners `Unassigned`; banner: "No speaker names found. Only people named in the text can own tasks; the rest are left unassigned." |
| Audio with no speech | "No speech found in this audio." Offer paste fallback. Do not run extraction. |
| Groq rate limit | Falls back to Gemini or Ollama; cost note shows which provider ran |
| Output fails schema twice | Tries the next provider; if all fail, error state with the raw model text and a retry button |

## 7. Cost note
| Item | Estimate |
|---|---|
| 45-minute meeting transcript | ~10k-12k input tokens |
| Extraction output | ~1.5k tokens |
| Email draft | ~1.5k in, ~0.5k out |
| Audio transcription | 45 min of Whisper on free tier |
| Cost on free tiers | $0.00 |
| Cost at paid rates **(estimate, verify)** | under $0.02 per run |
| Monthly at 20 runs | under $0.40 at paid rates; $0.00 free |
| Local fallback | $0, about 1-3 min per run on this machine |

## 8. Acceptance criteria
- [ ] Leveric transcript produces at least 5 of the 6 golden actions with correct owners; no invented dates.
- [ ] Every item has a quote found in the transcript.
- [x] A different meeting (synthetic partners meeting) works with no setup: owners come from its own speakers.
- [ ] Editing any cell sets status to `EDITED`; export disabled until approved.
- [ ] Each failure case in 6C shows its message.
- [ ] Cost note visible on every run.
- [ ] Run completes in under 30 seconds for a 45-minute transcript on Groq (cloud path only; the Ollama fallback may take 1-3 minutes and shows progress).
- [ ] Works at 375px width.

## 9. Demo script (about 3 minutes)
1. Problem (20s): "After every meeting someone spends 20 minutes writing actions; ChatGPT guesses owners."
2. Leveric meeting: upload `TRANSCRIPT.md`, run, show register with quotes and `Unassigned` rows (60s). Recorded locally; stop Groq (remove key) once to show the Ollama fallback in the cost note.
3. Edit one owner, show status flip to `EDITED`, approve, copy for Slack and email (30s).
4. New transcript: paste the synthetic partners meeting, show owners taken from its own speakers (30s).
5. Failure: paste a transcript with no names, show banner (20s).
6. Cost note and provider fallback (20s).

## 10. Decisions and open questions
- Hackathon build is transcript-only (paste or file). Audio follows right after.
- Demo: judges use the Vercel URL (cloud providers only). The recorded demo runs locally and also shows the Ollama fallback.
- Slack export uses `team[].slack` handles when present, else plain names. Real handles still to collect.
