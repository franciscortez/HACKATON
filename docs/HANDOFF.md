# Handoff

Last updated: 26 October 2026, Codex, branch feat/research-to-call-brief.

## Current status
Tool 03 integrated with main bc745df (PR #5); checkpoint 5557ab1. Published ready PR #6: https://github.com/franciscortez/HACKATON/pull/6. Integration commit: 053d73d. PR is mergeable; GitHub reports no checks. Not merged or deployed. Separate Tool 01 v2 worktree untouched.
Preview: http://localhost:3103/tools/research-to-call-brief.

## Done
- URL dossier with rendered HTML, branding, evidence, editable call sheet, approval, Markdown and A4 PDF.
- Current single-workspace and NDJSON contracts integrated; Tool 01 matches main.
- Ollama default with native structured output, 8192 context and evidence IDs; explicit Auto cloud opt-in.
- Preflight before paid scraping, safe provider errors, signed 24-hour recovery. Retry reuses research without scraping or increasing count.
- Legacy reports labelled and copied on edit. Strict local-only blocks cloud previews and crawls.
- Independent review fixes verified: native Auto fallback, legacy edit focus, history labels and preview policy.
- Apify MCP remains installed; application uses REST. Keys remain ignored.

## Verified
- 159 unit/API passed, 2 skipped; 40 browser passed, 1 skipped. Lint, TypeScript and production build passed.
- Real browser local generation: Leveric name, two supported offerings and two opportunities; approve, Markdown and one-page PDF passed. Artifacts under ignored tests/artifacts/.
- Real URL: 58 seconds, Ollama, USD0.000429 Apify. Retry: 15 seconds, same run and charge, no collection event, at advisory quota limit.

## Decisions and limits
- USD0.10 target is not a hard charge cap. Browser quota is advisory. No auth, durable quota, database or deployment.
- Website claims require human review. No external contact/competitor searches. Proxy connection-level DNS rebinding protection remains unverified.
- Ollama must run on the application server with the configured model. Cold loading varies. Local AI with cloud-ok still uses Apify for URLs; strict local-only allows pasted/recovered research only.
- Long call sheets need edits before PDF. Markdown omits separate city/industry fields. Tool 01 owner accuracy needs human review. Hosting needs 300-second route support.

## Next step
Review Tool 03 PR #6 before starting another tool. Plan: docs/superpowers/plans/2026-10-26-research-integration.md.
