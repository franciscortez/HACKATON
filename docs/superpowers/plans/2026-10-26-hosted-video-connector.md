# Hosted video connector implementation plan

Spec: ../specs/2026-10-26-hosted-video-connector-design.md

Goal: edit and export through the Vercel UI using a paired local Claude subscription and local processing.

- [x] Connector authentication, capability endpoints, resource signing and negative security tests.
- [x] Production launcher, isolated build, dependency/auth checks and cross-platform paths.
- [x] Hosted connection UI, local API transport, media renewal and disconnect/recovery.
- [x] Durable operation records, atomic version commits and stale-write handling.
- [x] Provider contract, Claude read boundaries and gated Codex capability.
- [x] Unit/API/integration/build checks, browser acceptance and final independent review.
- [x] Update setup, architecture, testing, tool spec and handoff with evidence and limitations.

## Execution ledger

- Baseline: 258 tests passed, 6 skipped. Clean checkout, branch feat/hosted-video-connector.
- Ruling: execute in the existing clean checkout on a new feature branch; preserve existing dependencies and do not create an additional worktree.
- Builder review resolved: use production runtime; signed GET/HEAD permits absent Origin; record operation IDs at commit; constrain Claude reads.
- No commit, push or deployment authorised by this implementation request. macOS and production rollout remain gated until verified.

## Completion evidence

- 272 unit/API passed, six skipped. Four real-media integration tests passed. Hosted-origin connector browser test passed, including signed seeking, revocation and restored export links. Typecheck, lint and both production builds passed.
- Native Claude manual smoke through playwright-cli: two synthetic clips, requested title, exported 1080x1920. Read boundary allowed the project fixture and denied its neighbouring fixture.
- Fresh independent review resolved: reject Claude 2.0.x, use monotonic timeline revision across undo/replacement, restore completed-export download links. Regression tests cover these fixes.
- Ruling: Next.js normalises request URLs to localhost; accept that internal hostname only when the wire Host is the configured 127.0.0.1 endpoint. Hostile-host tests remain enforced.
- Ruling: leave this feature branch uncommitted and rollout disabled, consistent with repository Git policy and the approved release gates; no merge/publish menu or deployment is necessary for implementation.
- Release gates remain open: macOS execution and an authorised real Vercel preview. Browser acceptance used the built UI intercepted at the production origin, not a deployed branch. Existing unrelated meeting-to-action e2e baseline failure was not retested.

- Publication update: the user subsequently authorised committing, pushing and opening a PR. Production rollout and macOS/deployed-preview acceptance gates remain unchanged.
