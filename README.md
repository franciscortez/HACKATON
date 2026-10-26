# Leveric Workbench

Leveric's client tools in one app. Each tool turns a source (a meeting transcript, a page, a brief) into reviewed, export-ready work: **Source → Extract → Review → Approve → Export**. Nothing is sent automatically.

Tool 01, **Meeting to action**, is live: transcript in; action register, decisions, open questions and a follow-up email out. Owners come only from people in the meeting and dates only from what was said, so unknowns stay "Unassigned" and "No date".

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

Free tiers and local models: **$0.00 per run**. Every run shows its provider, tokens and the estimated cost at paid rates (about $0.001 for a short meeting, about $0.012 for a 45-minute one). There is no run limit; workspace voice and sign-off are in `src/data/settings.json`.

## Docs

Start with `AGENTS.md` and `docs/HANDOFF.md`. Product: `docs/PRD.md`. Design: `docs/DESIGN.md`. Structure and API: `docs/ARCHITECTURE.md`. Tests: `docs/TESTING.md`. Tool spec: `docs/tools/01-meeting-to-action.md`.


## Research to call brief

Tool 03 takes one business URL and produces a sourced dossier, measured website branding and an editable call sheet. Ollama is the default AI processor. Start Ollama on the application server and install `qwen2.5:7b-instruct`; the research adapter requests an 8192-token context through the native API. Select Auto explicitly to allow Groq/Gemini fallback. Local AI mode still uses Apify for URLs; pasted source text avoids scraping. Workspace local-only policy prohibits both cloud AI and new website collection.

Apify needs `APIFY_API_KEY` in `.env.local`. The browser Actor is bounded to six pages, concurrency one, no retries and 120 seconds. US$0.10 is a target, not a guaranteed ceiling. Research has a four-minute total deadline. Failed AI generation retains signed collected research for 24 hours; Retry generation reuses it without another scraping charge. Screenshots expire after seven days or earlier Apify storage expiry.

Run this worktree with `pnpm dev --port 3103`. Browser checks: `$env:PLAYWRIGHT_BASE_URL='http://localhost:3103'; pnpm test:e2e`. Existing Leveric history is retained; old demo reports are labelled and copied into workspace history when edited.
