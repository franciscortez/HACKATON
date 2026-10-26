# Handoff

Read this first, then [`AGENTS.md`](../AGENTS.md) section 3 for which docs to load. Update this file at the end of every session (rules in `AGENTS.md` section 5).

**Last updated:** 26 Oct 2026, Claude Code, branch `feat/workbench-phase-1-2` (committed locally, not pushed)

## Current status
- Phases 1 and 2 are built: the workbench shell and tool **01 Meeting to action** work end to end (`docs/superpowers/plans/2026-10-26-phase-1-2-meeting-to-action.md`).
- Tool 01 status is `LIVE`. Tools 02-10 are `PLANNED` (spec only).
- Hackathon submission cutoff: **7 pm AEDT, 26 Oct 2026**.

## Done
| What | Where |
|---|---|
| Docs: PRD, design, stack, architecture, testing, phases, tool specs, AGENTS.md | PRs #1-#3 |
| Next.js 16.4 app (pnpm, `src/`, `@/*`), brand tokens, app shell, tools index | Branch `feat/workbench-phase-1-2` |
| REST API: `GET /api/tools`, `/api/tools/{slug}`, `/api/clients`, `/api/clients/{id}`, `POST /api/tools/{slug}/runs` | `src/app/api/` |
| AI provider chain Groq → Gemini → Ollama with per-provider output caps, fallback on 429/5xx/timeout/invalid output | `src/lib/ai/` |
| Meeting to action: parser (Fathom, VTT, SRT, plain), chunked extraction, checks (roster owners, stated dates only, quote verification), email draft, Markdown/CSV/Slack/email export, review UI with approval | `src/features/meeting-to-action/` |
| Two clients (Leveric real, Harbourside synthetic) | `src/data/clients/` |
| Tests: 96 unit + API (Vitest), 4 e2e (Playwright, desktop + mobile), playwright-cli browser checks; final review fixes (dedup, email rebuild, timestamped lines, CSV formula guard, feature imports) | `tests/` |

## Verified results (26 Oct 2026)
- `pnpm test` 96 passed, 2 skipped (fixture recorders); `pnpm test:e2e` 4 passed; `pnpm build`, `tsc`, `eslint` clean.
- Live Harbourside run via the API: Groq, 5.3 s, $0.00 (about $0.0012 at paid rates), correct owners and dates.
- Live L10 (45 min, 46k characters): Groq about 20 s when its per-minute limit is fresh; otherwise Gemini answers, which takes longer. Local Ollama alone took about 144 s.
- Browser: upload, run, edit (EDITED), approve (APPROVED), CSV download, re-edit (EDITED); no-speakers banner; forced 502 and 429 messages; 375 px with no horizontal scroll.

## Known limits
- **L10 owner accuracy:** Fathom puts `ACTION ITEM` lines inside whichever speaker's turn is current, so models sometimes pick the wrong owner (for example "Fix preview branch DB" given to Francis instead of Yohan). The reviewer fixes owners in the Review step. The spec target (5 of 6 golden owners) is not met on L10; Harbourside owners are correct.
- Groq's free tier has a small per-minute token limit: back-to-back long meetings fall back to Gemini.
- Run cap and history live in browser storage (a user can clear them).
- Audio upload is not built (phase 2b).
- Not deployed to Vercel yet.

## Next step
1. Push the branch, open a PR and merge (when the user asks).
2. Deploy to Vercel with `GROQ_API_KEY` and `GOOGLE_GENERATIVE_AI_API_KEY` set as environment variables.
3. Record the demo (script in `docs/tools/01-meeting-to-action.md` §9).

## Decisions made (with the user)
| Decision | Detail |
|---|---|
| Stack | Next.js 16.4 (App Router, TypeScript, `src/`, `@/*`), Tailwind v4, Zod 4, AI SDK 7, pnpm |
| AI | Groq `openai/gpt-oss-120b` → Gemini `gemini-2.5-flash` → Ollama `qwen2.5:7b-instruct` |
| Storage | No database: client configs in `src/data/clients/*.json`, runs in browser storage |
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
- Windows 11, AMD RX 6650 XT (8 GB, no CUDA). Microsoft Edge only (no Chrome): use `playwright-cli open --browser=msedge`.
- Ollama 0.40.11 at `http://127.0.0.1:11434`, GPU through Vulkan. User env: `OLLAMA_CONTEXT_LENGTH=16384`. Flash attention and q8 KV cache were turned off again: they did not speed up long prompts.
- Long prompts are slow locally (10.8k tokens took 194 s to read; 1k tokens reads at about 306 tokens/s). That is why transcripts are split into chunks of about 10,000 characters.
- Do not restart Ollama during `ollama pull`: it leaves empty `-partial-N` files and later pulls fail with `Error: EOF`. Fix: delete that model's `~/.ollama/models/blobs/sha256-<digest>-partial*` files and pull again.
- `.env` holds the Groq and Gemini keys (git-ignored). Load it in a shell with `set -a && . ./.env && set +a` before recording fixtures: `RECORD=1 pnpm vitest run tests/unit/meeting-to-action/record-fixtures.test.ts`.
- Video toolchain (FFmpeg, faster-whisper, HyperFrames) is installed globally; see the `video-editing` skill. Needed for tools 06 and 10.
