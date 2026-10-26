# Handoff

Read this first, then [`AGENTS.md`](../AGENTS.md) section 3 for which docs to load. Update this file at the end of every session (rules in `AGENTS.md` section 5).

**Last updated:** 26 Oct 2026, Claude Code, branch `feat/meeting-ui-generalise` (committed locally, not pushed; phases 1-2 merged as PR #4)

## Current status
- Phases 1 and 2 are built: the workbench shell and tool **01 Meeting to action** work end to end (`docs/superpowers/plans/2026-10-26-phase-1-2-meeting-to-action.md`).
- Tool 01 status is `LIVE`. Tools 02-10 are `PLANNED` (spec only).
- Hackathon submission cutoff: **7 pm AEDT, 26 Oct 2026**.

## Done
| What | Where |
|---|---|
| Docs: PRD, design, stack, architecture, testing, phases, tool specs, AGENTS.md | PRs #1-#3 |
| Next.js 16.4 app (pnpm, `src/`, `@/*`), brand tokens, app shell, tools index, meeting-to-action | PR #4 |
| REST API: `GET /api/tools`, `GET /api/tools/{slug}`, `POST /api/tools/{slug}/runs` (streams NDJSON progress, then result or a plain error) | `src/app/api/` |
| AI provider chain Groq → Gemini → Ollama: per-provider output caps, waits once on a short 429, falls back on 429/5xx/timeout/invalid output | `src/lib/ai/` |
| Meeting to action: parser (Fathom markdown and plain-text export, VTT, SRT, plain), chunked extraction, checks (owners from people in the meeting, stated dates only, quote verification), email draft rebuilt after edits, Markdown/CSV/Slack/email export | `src/features/meeting-to-action/` |
| UI: transcript check card, real 0-100% progress in the sidebar, source hides on result, New transcript, review with approval | `src/features/meeting-to-action/components/` |
| One workspace, no clients, no run limit (user decision) | `src/data/settings.json` |
| Tests: 94 unit + API (Vitest), 4 e2e (Playwright, desktop + mobile), playwright-cli browser checks | `tests/` |

## Verified results (26 Oct 2026)
- `pnpm test` 94 passed, 2 skipped (fixture recorders); `pnpm test:e2e` 4 passed; `pnpm build`, `tsc`, `eslint` clean.
- Live synthetic partners meeting via the API: Groq, about 3-5 s, $0.00, correct owners and dates.
- Live L10 (45 min): Groq about 20 s when its per-minute limit is fresh; about 90 s when it has to wait or fall back.
- Browser: transcript check card, progress in the sidebar while the form stays locked, review replaces the form, edit/approve/export, New transcript, plain error message.

## Known limits
- **Owners on messy transcripts:** on L10 the model leaves several recorder action items Unassigned instead of guessing (allowed by "never guess"; the reviewer assigns them). It also still lists some tool ideas from Josh's presentation as ownerless actions; the reviewer deletes those rows.
- **Long meetings and Groq's free tier:** a 76-minute meeting is about 8 parts and can exceed Groq's per-minute token limit. The app waits once for a short `retry-after`, then falls back to Gemini, then Ollama (slow: about 18-25 s per part locally).
- **Reusability for judging:** there is no client switcher any more. Reuse is shown by running a different business's meeting (the synthetic partners meeting) with no setup.
- History lives in browser storage (a user can clear it). Audio upload is not built (phase 2b). Not deployed to Vercel yet.

## Next step
1. Push the branch, open a PR and merge (when the user asks).
2. Deploy to Vercel with `GROQ_API_KEY` and `GOOGLE_GENERATIVE_AI_API_KEY` set as environment variables.
3. Record the demo (script in `docs/tools/01-meeting-to-action.md` §9).

## Decisions made (with the user)
| Decision | Detail |
|---|---|
| Stack | Next.js 16.4 (App Router, TypeScript, `src/`, `@/*`), Tailwind v4, Zod 4, AI SDK 7, pnpm |
| AI | Groq `openai/gpt-oss-120b` → Gemini `gemini-2.5-flash` → Ollama `qwen2.5:7b-instruct` |
| Workspace | One Leveric workspace; no client switcher, no run counter, no run limit |
| Owners | People in the transcript (speakers, or named in it); anyone else becomes Unassigned |
| Progress | Real: the server streams one step per transcript part plus the email |
| Errors | Plain message only; model output never reaches the browser |
| Structure | `src/features/<feature-name>/`; global `components/`, `lib/`, `services/`, `types/`, `schemas/` |
| API | REST route handlers in `src/app/api/` only |
| Tests | Root `tests/`; Vitest, Playwright, playwright-cli |
| Hosting | Judges use the Vercel URL; the demo video is recorded locally |
| Data | The real L10 transcript may be committed, deployed and sent to cloud models |
| Tool 01 scope | Transcript only for the hackathon; audio upload is phase 2b |

## Open questions
- For Josh: maximum demo length; dark logo files.
- Claude Code reads `CLAUDE.md`, not `AGENTS.md`. Ask the user whether to add a one-line `CLAUDE.md` containing `@AGENTS.md`.
- Time saved per meeting (15-25 min) is an estimate, not yet validated.

## Environment notes
- Windows 11, AMD RX 6650 XT (8 GB, no CUDA). Microsoft Edge only (no Chrome): use `playwright-cli open --browser=msedge`. Long transcripts are too big to pass to `playwright-cli fill` on the command line; use a short fixture.
- Ollama 0.40.11 at `http://127.0.0.1:11434`, GPU through Vulkan. User env: `OLLAMA_CONTEXT_LENGTH=16384`. Flash attention and q8 KV cache made no difference to long prompts and are off.
- Long prompts are slow locally (10.8k tokens took 194 s to read), which is why transcripts are split into parts of about 10,000 characters.
- Do not restart Ollama during `ollama pull`: it leaves empty `-partial-N` files and later pulls fail with `Error: EOF`. Fix: delete that model's `~/.ollama/models/blobs/sha256-<digest>-partial*` files and pull again.
- `.env` holds the Groq and Gemini keys (git-ignored). Load it in a shell with `set -a && . ./.env && set +a` before recording fixtures: `RECORD=1 pnpm vitest run tests/unit/meeting-to-action/record-fixtures.test.ts`.
- Video toolchain (FFmpeg, faster-whisper, HyperFrames) is installed globally; see the `video-editing` skill. Needed for tools 06 and 10.
