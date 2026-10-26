# Handoff

Read this first, then [`AGENTS.md`](../AGENTS.md) section 3 for which docs to load. Update this file at the end of every session (rules in `AGENTS.md` section 5).

**Last updated:** 26 Oct 2026, Claude Code, branch `docs/agents-handoff`

## Current status
- Phase: **0, docs** (see `docs/PHASES.md`). Docs are written and merged. **No code exists yet.**
- First tool: **01 Meeting to action** (`docs/tools/01-meeting-to-action.md`).
- Hackathon submission cutoff: **7 pm AEDT, 26 Oct 2026**.

## Done
| What | Where |
|---|---|
| Hackathon brief summarised from the 20-slide deck | `slides/TICKET-GOAL.md` (commit `d2bc5d8`) |
| PRD, design (Leveric brand tokens from leveric.ai), tech stack, architecture, phases, deep spec for tool 01, short specs for tools 02-10 | PR #1 |
| Architecture simplified to feature folders + REST API in `app/api/`; separate `TESTING.md` with playwright-cli browser checks | PR #2 |
| `AGENTS.md` (read-first rules), `CLAUDE.md` (imports `AGENTS.md`), this handoff | Branch `docs/agents-handoff` (pushed, no PR yet) |
| Local Ollama configured for the fallback provider (settings below) | This machine only, not in git |

## In progress
- Downloading `qwen2.5:7b-instruct` (about 4.7 GB) into Ollama. The first download broke when Ollama restarted, so its partial files were deleted and a fresh pull started.
- When it finishes: run `ollama list` to confirm it is there, then test it with a short JSON extraction prompt (`ollama run qwen2.5:7b-instruct`, or `POST http://127.0.0.1:11434/api/chat` with `"format": "json"`). Record speed and whether it ran on the GPU (`ollama ps` shows `100% GPU`).

## Next step
After the model test, write the implementation plan for **phase 1 (shell and design system) and phase 2 (Meeting to action)** with the `superpowers:writing-plans` skill. Save it to `docs/superpowers/plans/2026-10-26-phase-1-2-meeting-to-action.md`, then ask the user which execution method to use.

## Decisions made (with the user)
| Decision | Detail |
|---|---|
| Stack | Next.js (App Router, TypeScript), Tailwind v4, shadcn/ui, Zod, Vercel AI SDK |
| AI | Free tiers with local fallback: Groq, then Gemini, then Ollama |
| Storage | No database in phase 1: client configs as JSON in `clients/`, runs in browser storage |
| Structure | `features/<feature-name>/` for each tool; global `components/`, `lib/`, `services/`, `types/`, `schemas/` |
| API | REST route handlers in `app/api/` only |
| Tests | Top-level `tests/`; Vitest, Playwright, and playwright-cli browser checks |
| Hosting | Judges use the Vercel URL; the demo video is recorded locally so it can show the Ollama fallback |
| Data | The real L10 transcript may be committed, deployed and sent to cloud models |
| Tool 01 scope | Transcript only (paste or file) for the hackathon; audio upload is phase 2b |

## Open questions
- For Josh: maximum demo length; dark logo files.
- Free-tier model IDs must be checked on build day (`docs/TECH-STACK.md`).
- Time saved per meeting (15-25 min) is an estimate, not yet validated.

## Environment notes
- Windows 11, AMD RX 6650 XT (8 GB, no CUDA). Whisper and video tools run on CPU.
- Video toolchain (FFmpeg, faster-whisper, HyperFrames) is installed globally; see the `video-editing` skill. Needed for tools 06 and 10.
- Ollama 0.40.11 at `http://127.0.0.1:11434`, GPU through Vulkan (RX 6650 XT, 7.2 GB free). The "AMD driver is too old" log warning only affects ROCm and can be ignored.
- Ollama user environment variables (set 26 Oct 2026; restart Ollama after changing them): `OLLAMA_CONTEXT_LENGTH=16384` (default 4096 is too small for a 45-minute transcript), `OLLAMA_FLASH_ATTENTION=1`, `OLLAMA_KV_CACHE_TYPE=q8_0` (halves context memory so 16k fits in 8 GB).
- Do not restart Ollama during `ollama pull`: it leaves empty `-partial-N` files and later pulls fail with `Error: EOF`. Fix: delete that model's `~/.ollama/models/blobs/sha256-<digest>-partial*` files and pull again.
- No `.env.local` yet. Needs `GROQ_API_KEY`; optional `GOOGLE_GENERATIVE_AI_API_KEY` and `OLLAMA_BASE_URL`.
