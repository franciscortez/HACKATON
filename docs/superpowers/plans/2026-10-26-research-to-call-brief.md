# Research to call brief implementation plan

> **For agentic workers:** Use `superpowers:executing-plans` to implement this plan task by task. Do not commit or push without an explicit request.

**Goal:** Turn a public business URL, contact and objective into a reviewed, evidence-backed one-page call brief.

**Architecture:** Reuse the shared REST run contract, providers and workflow. Shared research services call bounded Apify Actors; feature-owned schemas, prompts, checks and UI compose the brief. Developer MCP is independent of the application runtime.

**Tech stack:** Existing Next.js 16.4, TypeScript, Tailwind, Zod 4, AI SDK 7, Vitest and Playwright; native fetch for Apify REST.

**Spec:** `docs/superpowers/specs/2026-10-26-research-to-call-brief-design.md` and `docs/tools/03-research-to-call-brief.md`.

## Global constraints

- Isolated branch `feat/research-to-call-brief`; preserve the other checkout.
- No feature code before Tool 01's completion prerequisite is resolved.
- Free models: Groq, Gemini, Ollama. Local-only means no cloud research.
- Server-owned client settings; US$0.10 cumulative Apify cap per request; browser monthly caps are advisory.
- All automated tests use fixtures, not real providers. Secrets only in ignored environment files.
- Facts require verified evidence. Unknown information remains unknown. AU/NZ copy, existing brand and REST only.

## Review focus

- Contact names shared by different people must not produce an unverified biography.
- Missing business location must not generate guessed local competitors.
- Failed or cancelled Actor requests must not restart billable work or conceal charges.
- Client switches during a pending request must not reveal another client's results.
- Expanded citations and long edits must not silently truncate the approved print export.

## Task 1: Workspace, developer MCP and specification

- [x] Resolve Tool 01 prerequisite: user requested merging first; PR #4 merged at `47148b5`, known owner-accuracy limitation documented in PR and handoff. Worktree updated to merged main.
- [x] Create the managed worktree from committed foundation `6d8dc10`, name the feature branch and install frozen dependencies.
- [x] Verify baseline unit/API suite: 88 passed, 2 skipped.
- [x] Install official Apify MCP server 0.19.3 outside the app; load `.env.local` explicitly without storing credentials in configuration.
- [x] Verify MCP handshake and list tools without starting an Actor.
- [x] Save the approved design and this implementation plan.

## Task 2: Bounded research services

Files: shared research services and schemas under `src/services/research/`; typed research settings in the client schema; both seeded client configs. Tests under `tests/unit/shared/research/`.

Interfaces: `ResearchSource { id, url, title, text, fetchedAt }`; `ResearchUsage { costUsd, runIds }`; `ResearchError` carries a safe code/message and known usage. `ResearchCollection` wraps an `ApifySession`, exposes `company` and `additional` research, and retains sources/gaps. The feature enforces client policy/settings before creating paid work.

- [x] Write failing tests for URL safety, budget allocation, Actor lifecycle, provider response validation and local-only gating.
- [x] Add typed client research configuration with missing settings disabled; enable both seeded clients at US$0.10 and 20 advisory research runs/month.
- [x] Implement bounded company crawl, regional search and supplementary crawl using native fetch and validated Apify responses. Limit company pages to five, search queries to three and supplementary pages to three; cap source text at 40,000 characters.
- [x] Set per-Actor charge limits, disable enrichment, never retry starts, poll existing IDs and abort active work on cancellation/timeout. Preserve known charges on failures.
- [x] Run research unit tests; expected: all pass with no external network.

## Task 3: Brief generation, checks and REST integration

Files: `src/features/research-to-call-brief/` owns schemas, prompts, generation, verification, exports and module; shared cost/error types and generic run API receive backward-compatible additions. Tests under `tests/unit/research-to-call-brief/` and `tests/api/`.

Interfaces: input contains business URL, contact, objective, optional notes/pasted sources. Output contains evidence-linked company/contact facts, inferences, local competitors, talking points, gaps and source records. Existing `{clientId,input,usedThisMonth}` request and `{output,cost}` response remain; cost gains optional research usage.

- [x] Write failing fixture tests for both clients, citation verification, fabricated facts, contact ambiguity, competitor geography and prompt injection.
- [x] Extract evidence in bounded batches and compose through existing structured providers. Verify quoted evidence; demote unsupported factual claims to gaps. Enforce the 550-word core brief limit.
- [x] Add the feature module to the registry; adapt safe errors and cost reporting without changing Tool 01 behaviour.
- [x] Test success, validation, missing settings/key, over-limit, all-providers-failed and partial research failure. Run complete Vitest suite; expected: all pass.

## Task 4: Workbench, approval and export

Files: feature-owned source/review/workbench components and feature stylesheet; generic tool page integration. Tests and fixtures under the existing top-level test folders.

- [x] Add browser tests for both client flows, evidence, editing, approval reset, Markdown download, failure recovery and client switch during a pending run.
- [x] Build URL/contact/objective/notes input and pasted-source fallback using existing shell, stepper, status, approval and cost components.
- [x] Keep results/client counters isolated. Show facts, inferences and gaps distinctly; expose source links and quotes. Do not send anything automatically.
- [x] Add approval-gated Markdown copy/download and print. Print only the brief and compact source links on A4; expanded evidence stays on screen. Long edits must warn/block printing rather than truncate text.
- [x] Run browser flows on desktop and 375px with reduced motion and no console errors; save screenshots under ignored artifacts.

## Task 5: Verification and handoff

- [x] Run `pnpm test`, `pnpm lint`, `pnpm build` and `pnpm test:e2e` from this worktree.
- [x] Perform required playwright-cli checks for both clients and a failure case; inspect screenshots and A4 PDF page count.
- [x] Run one live public-URL Apify smoke within US$0.10; report actual charges and provider used. Never put credentials in logs or fixtures.
- [x] Obtain one independent whole-change review, fix important findings with regression tests, and rerun affected checks.
- [x] Update handoff, tool spec/status, architecture, setup and costs with observed outcomes and known limits. Leave all changes uncommitted for review.

## Execution outcome

Implemented locally against merged main `47148b5`. Final checks: 139 unit/API tests passed, 2 fixture recorders skipped; 16 browser tests passed; lint and production build passed. Independent review findings were fixed with regressions. Native developer MCP is installed and authenticated. Tool 03 remains uncommitted and not deployed.

Ruling: Google Search Scraper requires a US$0.50 minimum cap. Its replacement, RAG Web Browser, uses one contact query (one page, US$0.02) and one competitor query (two pages, US$0.03), preserving the US$0.10 total. Geography is explicit in queries and checked in quotes because search locale is US. Cost if wrong: fewer locally relevant results, reported as gaps rather than guessed competitors.

Ruling: Verified claims are conservative extracts; partial contact names suppress biography. Cost if wrong: useful paraphrases or genuine single-name contacts may be omitted, so review shows a gap.

Live final smoke: Leveric URL, HTTP 201 in 66 seconds, US$0.012228 reported Apify usage; unknown contact/location stayed flagged. Details and artifacts are in the handoff and ignored execution ledger.
