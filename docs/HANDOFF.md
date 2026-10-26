# Handoff

Read this first, then AGENTS.md for task-specific documentation.

**Last updated:** 26 October 2026, Codex, branch `feat/research-to-call-brief`.

## Current status
- Tool 01 merged in PR #4, commit `47148b595eba0ae4dc78f1eed0c4ddb726635d16`. Preserve unrelated changes in the original `E:/Code/HACKATON` checkout.
- Tool 03 URL dossier implementation is complete locally in `C:/Users/franc/.codex/worktrees/9ea3/HACKATON`. All Tool 03 work remains uncommitted; no push, PR or deployment requested.
- Preview: http://localhost:3103/tools/research-to-call-brief. Run `pnpm dev --port 3103` from this worktree if stopped.

## Done
- URL-only research using bounded Apify rendered HTML extraction: six same-site pages, text, colours, font families, logo candidate, imagery, actions and homepage screenshot.
- Evidence-backed business dossier, labelled synthesis and Leveric opportunity hypotheses, desktop evidence rail, mobile disclosures, explicit edits and call-sheet rebuild, approval-gated Markdown and A4 PDF.
- Legacy saved reports, client isolation, cancellation, pasted-text recovery and local-only model path retained. Cleared edited facts remain readable after reload.
- Fresh independent review completed. Fixed redirect bypass using Chromium Fetch interception on every hop; preserved complete rebuilt talking points instead of silently cutting edited hypotheses. Real Chromium regression observed two private redirect requests before the fix and zero after it.
- Apify developer MCP remains installed at `C:/Users/franc/.codex/mcp/apify`; the app uses REST. Keys stay in ignored env files.
- Current spec and plan: `docs/superpowers/specs/2026-10-26-url-dossier-design.md` and `docs/superpowers/plans/2026-10-26-url-dossier.md`.

## Verified
- Final automated suite: 153 unit/API tests passed, 2 recorder tests skipped; 43 browser tests passed across desktop/mobile/tablet, 1 duplicate network-boundary test skipped. Lint, TypeScript and production build passed. Browser command: `$env:PLAYWRIGHT_BASE_URL='http://localhost:3103'; pnpm test:e2e`.
- playwright-cli verified both clients, editing, stale/rebuild/approval, print invocation, failure/pasted recovery and reduced motion. Desktop/tablet/mobile screenshots reviewed; no horizontal overflow. Only browser error was the deliberately injected 502. A4 fixture PDFs contain one page.
- Final live URL-only success after all fixes: HTTP 201 in 13 seconds; company name Leveric, one page, four services and three proposed opportunities; US$0.000470 Apify usage. Rendered homepage preview and the updated redirect guard worked in Apify. Earlier retries hit free quotas before Groq recovered enough tokens; Gemini quota exhausted and Ollama unavailable. No paid AI used. Six bounded upgrade smoke/diagnostic runs totalled US$0.003195, separate from the earlier v1 work.
- Secret scan: 182 tracked/untracked non-ignored files, zero configured API key matches. Diff whitespace check passed.
- Browser artifacts, visual critique and execution ledger remain ignored under `tests/artifacts/` and `.superpowers/`.

## Decisions and limits
- US$0.10 is an approved target, not a guaranteed charge cap for pay-per-usage browser runs. Six pages/concurrency one/no retries/120-second Actor/four-minute total request bound resource use. Browser monthly counts remain advisory.
- Source extracts are website claims, not independent fact checks; synthesis and opportunities require human review. No external competitor/contact searches in the URL dossier. Preview links expire after seven days or earlier storage expiry.
- Request-stage DNS/redirect/subresource checks do not independently prove Apify proxy connection-level DNS rebinding protection. No authentication, durable quota, database or deployment in this scope.
- Existing brand micro-labels retained. Company-name output limited to 80 characters; unusually long legal names may need a trading name. Long call sheets require editing before PDF; content is preserved.
- Deferred minor: dossier Markdown omits city/industry as separate metadata fields, although report and source text retain them.
- Tool 01's L10 owner-accuracy gap remains accepted for human review; audio deferred. Hosting must support the 300-second route duration.

## Uncommitted work and next step
- Changes span Tool 03 feature/services/routes/tests/fixtures, shared AI/client/run integration and product/setup/design/architecture/spec/plan docs. Original checkout untouched.
- User reported a new Leveric run failing with HTTP 502 after 9.7 seconds and about US$0.0005 Apify usage. The generic brief_failed handler discards the underlying cause; free-model quota exhaustion is suspected from prior diagnostics, not confirmed for this request.
- Local verification: Ollama is now running at 127.0.0.1:11434 with qwen2.5:7b-instruct loaded on GPU (4,096-token runtime context). A manual run of the real dossier pipeline with 5,454 characters of saved Leveric source text and local-only providers returned HTTP 200 from Ollama and completed in 50 seconds at US$0. It produced a useful synthesis but no verified company name, services or opportunities after evidence validation; local connectivity works, output quality is not yet sufficient. The smoke harness blocked all non-local fetches; no scrape or cloud AI was used. Result: ignored .superpowers/sdd/2026-10-26-url-dossier/ollama-local-result.json.
- Next action: inspect local raw output against evidence validation and improve local extraction quality; also preserve safe provider failure categories and collected research for retries.
