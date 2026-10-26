# Handoff

Last updated: 26 October 2026, Codex, branch `feat/hosted-video-connector`. User authorised commit, push and PR publication. Production rollout remains disabled.

## Current work: hosted video connector

- Implemented the approved [plan](superpowers/plans/2026-10-26-hosted-video-connector.md) and [design](superpowers/specs/2026-10-26-hosted-video-connector-design.md): hosted UI pairs directly with a same-computer production connector; native Claude subscription, local FFmpeg/Python, signed media, revocation, durable job recovery and stale-write rejection. Codex remains unavailable pending approved commercial authentication.
- Verified: 272 unit/API tests passed, 6 skipped; four real FFmpeg integration tests passed; connector hosted-origin browser acceptance passed, including recovered export download; lint, typecheck, default production build and isolated connector production build passed. Fresh independent review's three findings were fixed and checked: minimum CLI version, undo/replacement stale writes, recovered export link.
- Manual playwright-cli on Windows/Edge used the built UI intercepted at the production origin, two synthetic clips and the actual native Claude subscription. Claude added a three-second title; exported 1080x1920; desktop/375px layouts, disconnect and invalid-pairing feedback checked. Read-boundary smoke allowed a project file and denied a synthetic neighbouring file. No application console errors during successful editing; browser emitted loopback mixed-content warnings. Expected 503/400 errors occurred during disconnected/invalid-pairing checks.
- Evidence: ignored `tests/artifacts/connector-*.png`, `connector-native-export.mp4`, `connector-boundary-result.json`; browser traces under ignored test-results. Automated tests never call real AI providers.
- Implementation scope: connector services/launcher/routes/UI and tests; existing video routes, CLI/workspace/schema/client updates; Next/TypeScript/ESLint/package configuration; README, env example, architecture/design/testing/stack/tool docs, plan/spec and this handoff.
- Rollout stays disabled (`NEXT_PUBLIC_VIDEO_CONNECTOR_ENABLED=0`). Neither macOS nor an actual deployed Vercel preview was tested. Production is unchanged. Setup commands and dependencies are in README. Restart the connector for a new pairing code; keep the computer awake.
- Next action: verify a Vercel preview with the local connector, then complete macOS acceptance before enabling production.
- Previous handoff described an unmerged tool-06 branch; the current checkout already contains that editor. Its old PR next action is superseded. The known pre-existing meeting-to-action desktop e2e failure at line 28 was not retested; this change ran the dedicated connector suite. Existing servers on :3000/:3005 were not reused or changed. Test-owned connector processes were stopped.

## Earlier deployment history
Tool 03 integrated with main bc745df (PR #5); checkpoint 5557ab1. Published ready PR #6: https://github.com/franciscortez/HACKATON/pull/6. Integration commit: 053d73d. PR merged on 26 October 2026 as 1c6c877bead394ae4b1406d484e7ec702949906c. Live-only homepage and CI/CD deployed successfully from e58d777. Production: https://leveric-workbench.vercel.app. Local meeting-to-action-v2 branch deleted after confirming no unique commits.
Local preview: http://localhost:3000. Vercel project: leveric-workbench under bamcortezzs-projects, connected to main with Node 24.

## Deployment update
- Homepage now shows only the two LIVE tools. Registry and provider defaults are unchanged.
- GitHub CI runs type-check and lint only. Vercel repeats both before its production build.
- Vercel now has OLLAMA_BASE_URL, OLLAMA_MODEL and OLLAMA_AUTHORIZATION for an authenticated ngrok tunnel to this PC. Authenticated model listing passes; unauthenticated requests return 401 and management endpoints return 404. Header-support commit f20b6da deployed successfully; CI and build passed. Hosted research API verified with synthetic pasted text: HTTP 200, provider ollama, model qwen2.5:7b-instruct, 12 seconds, zero model/scraping charge. This verifies connectivity; generated categorisation still needs human review.
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

## Previous tool 03 next step
PR #6 is merged. Start the next tool from updated origin/main. Main pulled to 1c6c877. Research worktree registration and local research branch removed; residual node_modules directory remains at the former worktree path because automatic approval review blocked its removal; remote feature branch already deleted. Evidence and local env preserved in ignored .superpowers/archive/research-pr-6/. Next action: use Local Ollama on the hosted research page. Keep the PC, Ollama and ngrok running; the restart command is in README. Future main pushes automatically run CI and deploy through Vercel. This documentation closeout also triggers the same checks and deployment. Plan: docs/superpowers/plans/2026-10-26-live-homepage-deployment.md.
