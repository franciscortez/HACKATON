# Handoff

Last updated: 26 October 2026, Codex, branch main.

## Current status
Tool 03 integrated with main bc745df (PR #5); checkpoint 5557ab1. Published ready PR #6: https://github.com/franciscortez/HACKATON/pull/6. Integration commit: 053d73d. PR merged on 26 October 2026 as 1c6c877bead394ae4b1406d484e7ec702949906c. Live-only homepage and CI/CD deployed successfully from e58d777. Production: https://leveric-workbench.vercel.app. Local meeting-to-action-v2 branch deleted after confirming no unique commits.
Local preview: http://localhost:3000. Vercel project: leveric-workbench under bamcortezzs-projects, connected to main with Node 24.

## Deployment update
- Homepage now shows only the two LIVE tools. Registry and provider defaults are unchanged.
- GitHub CI runs type-check and lint only. Vercel repeats both before its production build.
- Vercel now has OLLAMA_BASE_URL, OLLAMA_MODEL and OLLAMA_AUTHORIZATION for an authenticated ngrok tunnel to this PC. Authenticated model listing passes; unauthenticated requests return 401 and management endpoints return 404. Header-support deployment and hosted generation verification are in progress.
- Security guidance added in docs/SECURITY.md. This private repository uses private issues for collaborator reports; the dedicated vulnerability-reporting API is unavailable.
- Local type-check and lint passed; independent review found no significant issues. GitHub CI run 40284978022 succeeded. Vercel deployment dpl_9KxbT8f27rtbesmw5U4DZww9utRt reached Ready for e58d777. Production homepage and both LIVE routes returned HTTP 200, with exactly two tool links and count. No E2E, unit tests or paid research calls were run for this deployment change.

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
- USD0.10 target is not a hard charge cap. Browser quota is advisory. No auth, durable quota or database.
- Website claims require human review. No external contact/competitor searches. Proxy connection-level DNS rebinding protection remains unverified.
- Ollama must run on the application server with the configured model. Cold loading varies. Local AI with cloud-ok still uses Apify for URLs; strict local-only allows pasted/recovered research only.
- Long call sheets need edits before PDF. Markdown omits separate city/industry fields. Tool 01 owner accuracy needs human review. Hosting needs 300-second route support.

## Next step
PR #6 is merged. Start the next tool from updated origin/main. Main pulled to 1c6c877. Research worktree registration and local research branch removed; residual node_modules directory remains at the former worktree path because automatic approval review blocked its removal; remote feature branch already deleted. Evidence and local env preserved in ignored .superpowers/archive/research-pr-6/. Next action: verify hosted Local Ollama after deploying header support. Keep the PC, Ollama and ngrok running; the restart command is in README. Future main pushes automatically run CI and deploy through Vercel. This documentation closeout also triggers the same checks and deployment. Plan: docs/superpowers/plans/2026-10-26-live-homepage-deployment.md.
