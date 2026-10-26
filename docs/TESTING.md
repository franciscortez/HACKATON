# Testing: Leveric Workbench

Tests live in a top-level `tests/` folder, separate from source code. Structure in [ARCHITECTURE.md](ARCHITECTURE.md).

## 1. Layout
```
tests/
  unit/                    pure logic, no network
    <feature-name>/        one folder per feature, mirrors features/<feature-name>/services
    shared/                global services, schemas and helpers
  api/                     REST route handlers called directly, AI provider mocked
  e2e/                     Playwright browser flows
  fixtures/
    <feature-name>/        sample inputs and recorded model responses
```

## 2. Tools
| Layer | Tool | Runs |
|---|---|---|
| Unit and API | Vitest | `pnpm test` |
| End to end | Playwright (Microsoft Edge channel; Chrome is not installed here) | `pnpm test:e2e` |
| Browser checks by the agent | `playwright-cli` (the `/playwright-cli` skill) | Run against `pnpm dev` or the Vercel preview URL (section 5) |

## 3. What each layer covers
| Layer | Covers |
|---|---|
| Unit | Parsers, checks, exports, Zod schemas, approval state changes, cost maths |
| API | Each endpoint in ARCHITECTURE section 2: success status and body, every error code (`400`, `404`, `413`), streamed progress and error events, provider fallback and 429 wait |
| End to end | One full flow per feature: pick client, add source, run, edit, approve, export; on desktop and 375px width |

## 4. Rules
- Tests never call real AI providers. API and unit tests use **recorded model responses** from `tests/fixtures/`, so they are free and give the same result every time.
- Each feature has a **golden test**: a fixed input must produce the expected output listed in its tool spec (for tool 01, the six golden actions in `tools/01-meeting-to-action.md`).
- Each feature tests at least two different real-world inputs and one failure case from its spec.
- A live smoke run against the real free-tier provider is done by hand before each demo, not in the test suite.
- No secrets in fixtures. Real client data only where the owner approved it.

## 5. Browser checks with playwright-cli
Every feature is checked in a real browser with the `/playwright-cli` skill before it is called done. If the global command is missing, use `npx playwright cli` or install `@playwright/cli`. On this machine open the browser with `playwright-cli open --browser=msedge`. Use exact labels (`getByLabel('Owner for task 1', { exact: true })`), because "task 1" also matches "task 10".

### When
- After each UI task in a feature plan.
- Before every PR, on the local dev server.
- Before the demo, on the Vercel preview URL.

### Standard flow per feature
```bash
playwright-cli open http://localhost:3000/tools/<feature-name>
playwright-cli snapshot                       # find refs for source panel and run button
playwright-cli upload tests/fixtures/<feature-name>/<input-file>
playwright-cli click <run-ref>
playwright-cli find "APPROVE"                 # output and approval bar rendered
playwright-cli fill <cell-ref> "<new owner>"  # edit flips status to EDITED
playwright-cli find "EDITED"
playwright-cli click <approve-ref>
playwright-cli find "APPROVED"
playwright-cli console error                  # must be empty
playwright-cli requests                       # POST /api/tools/<feature-name>/runs returned 201
playwright-cli close
```

### Also check
| Check | Command |
|---|---|
| Phone layout (375px) | `playwright-cli open --mobile` or `playwright-cli resize 375 812`, then `screenshot` |
| Second input | Repeat the flow with a different transcript (for example the synthetic partners meeting) |
| Failure case | Upload the failure fixture; `find` the expected error message |
| API errors in UI | `playwright-cli route "**/api/tools/*/runs" --status=502`, run, `find` the error panel, then `unroute` |
| Reduced motion | `playwright-cli set-reduced-motion reduce`, check no transforms run |
| Brand match | `screenshot --filename=<feature>-desktop.png` and compare with `DESIGN.md` |

### From browser check to test
- `playwright-cli recording-start` / `recording-stop` turns a manual flow into Playwright code. Save it to `tests/e2e/<feature-name>.spec.ts` and clean it up (use role locators, not refs).
- `playwright-cli generate-locator <ref> --raw` gives stable locators for those tests.

### Evidence
- Save screenshots to `tests/artifacts/` (git-ignored). Attach the desktop and phone screenshots to the PR with `gh pr create --attach`.
- `playwright-cli video-start` / `video-stop` can record the demo flow for the Loom backup.

## 6. Done means
- `pnpm test` and `pnpm test:e2e` pass.
- The playwright-cli flow in section 5 passes for two inputs and the failure case, on desktop and 375px, with no console errors.
- Every acceptance criterion in the feature's tool spec maps to a test or a recorded browser check.

## 7. Hosted connector acceptance

Run `pnpm test`, `pnpm lint`, `pnpm typecheck` and `pnpm build`. Real media integration: set `VIDEO_E2E=1`, then `pnpm exec vitest run tests/integration`. Models remain fake in automated tests.

Build with `NEXT_PUBLIC_VIDEO_CONNECTOR_ENABLED=1` using `pnpm video:connector:build`, then set `CONNECTOR_E2E=1` and run `pnpm exec playwright test --config playwright.connector.config.ts`. This test owns port 43129 and a temporary workspace. It serves the branch build at an intercepted production origin without deploying, grants Chromium loopback-network permission, pairs, imports two synthetic clips, seeks, prompts a fake Claude, undoes/redoes, exports, reloads and revokes. Screenshots go to ignored tests/artifacts. It verifies origin/CORS behaviour, not a real deployed preview.

Unit/API coverage includes unpaired and hostile-origin denial, stale-write/undo conflicts, CLI minimum version, signed Range access, expiry/revocation and committed/interrupted job recovery. Before production rollout, verify the same flow on macOS, actual deployed Vercel preview, browser permission denial/recovery and the user's native subscription.

For real deployed UI acceptance, set `CONNECTOR_LIVE_UI=1` and `CONNECTOR_PUBLIC_ROOT` to a separately cloned public connector checkout, then run the dedicated connector configuration. This bypasses UI interception and exercises production with fake AI. Regression coverage includes operation setup persistence failure, public export allowlisting, OS keyboard tabs, copy fallback, dependency gating and accessible setup help after pairing. Actual native subscription checks are manual only.
