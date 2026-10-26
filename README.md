# Leveric Workbench

Leveric's client tools in one app. Each tool turns a source (a meeting transcript, a page, a brief) into reviewed, export-ready work: **Source → Extract → Review → Approve → Export**. Nothing is sent automatically.

Tool 01, **Meeting to action**, is live: transcript in; action register, decisions, open questions and a follow-up email out. Owners come only from the client's roster and dates only from what was said, so unknowns stay "Unassigned" and "No date".

## Run it

Requirements: Node 24, pnpm 10. Optional: [Ollama](https://ollama.com) for the local fallback.

```bash
pnpm install
cp .env.example .env          # add free keys: GROQ_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY
ollama pull qwen2.5:7b-instruct   # optional local fallback
pnpm dev                      # http://localhost:3000
```

AI providers are tried in order **Groq → Gemini → Ollama**. A provider without a key is skipped. With no keys at all the app uses local Ollama only.

## Test it

```bash
pnpm test       # unit + API tests (models mocked, recorded fixtures)
pnpm test:e2e   # Playwright, desktop + mobile (uses Microsoft Edge)
pnpm build
```

Sample inputs are in `tests/fixtures/meeting-to-action/`: a real Leveric L10 transcript, a synthetic accounting partners meeting, and failure cases.

## Cost

Free tiers and local models: **$0.00 per run**. Every run shows its provider, tokens and the estimated cost at paid rates (about $0.001 for a short meeting, about $0.012 for a 45-minute one). Each client has a monthly run cap (`src/data/clients/*.json`).

## Docs

Start with `AGENTS.md` and `docs/HANDOFF.md`. Product: `docs/PRD.md`. Design: `docs/DESIGN.md`. Structure and API: `docs/ARCHITECTURE.md`. Tests: `docs/TESTING.md`. Tool spec: `docs/tools/01-meeting-to-action.md`.
