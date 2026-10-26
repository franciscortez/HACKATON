# Research integration implementation plan

## Follow-up: cloud default (26 October 2026)
User requested Groq or Gemini as the default AI processing mode. Set the UI and input-schema defaults to Auto, label the option with both providers, retain Ollama fallback and the local-only policy override, update existing regression coverage, and verify the research screen in the browser. This supersedes the original local-default decision below.

Goal: integrate Tool 03 into current main, make Ollama the default, preserve research for retries, and publish a ready PR.
Spec: ../specs/2026-10-26-research-integration.md
Execution: Superpowers executing-plans, inline with one final independent review. User explicitly authorised commits, push and PR by requesting implementation of this plan. No merge to main or deployment.

- [x] Preserve current Tool 03 in a checkpoint; fetch and merge origin/main. Retain main workspace, streaming, Tool 01 and rate-limit behaviour.
- [x] Adapt research to workspace settings, NDJSON progress/result/error, cancellation, legacy browser history. Default local AI; explicit Auto opt-in.
- [x] Add native Ollama structured generation with explicit 8192 context and bounded output. Select numbered source extracts instead of asking models to recopy quotes. Validate metadata and capabilities; flag empty evidence.
- [x] Preflight Ollama before paid collection. Classify provider errors. Sign 24-hour recovery snapshots, preserve in browser, retry AI without scraping or incrementing crawl count. Limit request to 256 KiB.
- [x] Regression tests first, full automated suite and real browser Ollama acceptance: correct Leveric name, two supported offerings, one supported opportunity, approve/export; bounded URL smoke and zero-scrape retry.
- [x] Independent review, fix significant findings, final suite/secrets/diff checks, update docs, commit, fetch main again, push and ready PR. Verify published head/base/body/CI.

Preserve other worktree and unmerged Tool 01 v2. Research target remains US$0.10, not guaranteed cap. No paid AI, no database, no authentication. Local-only policy always prohibits cloud AI and new crawling; Local AI mode with cloud-ok workspace permits explicit URL scraping through Apify.
