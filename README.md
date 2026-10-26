# Leveric Workbench

Leveric's client tools in one app. Each tool turns a source (a meeting transcript, a page, a brief) into reviewed, export-ready work: **Source → Extract → Review → Approve → Export**. Nothing is sent automatically.

Tool 01, **Meeting to action**, is live: transcript in; action register, decisions, open questions and a follow-up email out. Owners come only from the client's roster and dates only from what was said, so unknowns stay "Unassigned" and "No date".

Tool 03, **Research to call brief**, accepts one website URL and produces an evidence-backed business dossier, observed visual brand and a one-page Leveric call sheet. Review, edit, rebuild a stale call sheet and approve before Markdown or A4 exports. Previous results remain readable.

## Run it

Requirements: Node 24, pnpm 10. Optional: [Ollama](https://ollama.com) for the local fallback.

```bash
pnpm install
cp .env.example .env.local    # add keys: GROQ_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY; APIFY_API_KEY for URL research
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

Free tiers and local models: **$0.00 model cost per run**. Every run shows its provider, tokens and the estimated cost at paid rates (about $0.001 for a short meeting, about $0.012 for a 45-minute one). Each client has a monthly run cap (`src/data/clients/*.json`).

Tool 03 uses bounded Apify browser research: **US$0.10 is a target, not a guaranteed ceiling**. Each run allows six pages, one concurrent page, no retries and a 120-second Actor timeout. Actual charges are reported. The verified Leveric URL run took 10 seconds and cost US$0.000317; diagnostic attempts were separate. Monthly counters are advisory browser storage. Pasted-source recovery skips Apify; local-only clients use Ollama without cloud research.

The app calls Apify REST directly. Developer MCP is optional and separate; it is installed and verified on the current development machine, with details in `docs/HANDOFF.md`. No MCP package is needed to deploy the app.

For an isolated worktree browser run, set `PLAYWRIGHT_BASE_URL=http://localhost:3103` before `pnpm test:e2e`; this prevents reusing another workspace's server.

## Docs

Start with `AGENTS.md` and `docs/HANDOFF.md`. Product: `docs/PRD.md`. Design: `docs/DESIGN.md`. Structure and API: `docs/ARCHITECTURE.md`. Tests: `docs/TESTING.md`. Tool spec: `docs/tools/01-meeting-to-action.md`.
