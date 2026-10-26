# Handoff

Last updated: 26 October 2026, Codex, branch `fix/research-cloud-default`. PR [#9](https://github.com/franciscortez/HACKATON/pull/9) merged as `ce5ef09`; implementation commit `214c874`.

## Current change

Research AI processing now defaults to Auto (Groq, then Gemini, with Ollama fallback) in the UI and request schema. The selector names Groq/Gemini; local-only policy still selects Ollama. This user-requested change supersedes the original research integration plan's local default.

Change includes ResearchWorkbench.tsx, brief.schema.ts, research run unit tests, url-dossier browser tests, ARCHITECTURE.md, Tool 03 spec, research integration plan and this handoff. Pre-existing handoff updates are preserved. The user has authorised committing, pushing, opening a PR and merging after checks pass.

Verification: 278 unit/API tests passed, 6 skipped; lint and typecheck passed. All 27 research browser tests passed on desktop/mobile/tablet on a dedicated server. First run had one transient Next.js JSON parsing runtime error on tablet; the complete rerun passed. Playwright CLI confirmed the default and manual local/auto switching with no console errors. No real AI calls made.

Next action: publish and merge the cloud-default PR after checks pass. Earlier fresh-machine connector acceptance remains outstanding.

## Done

Implemented the [approved plan](superpowers/plans/2026-10-26-public-connector-setup.md). Public connector: https://github.com/franciscortez/leveric-video-connector at `5e2fc13`; fresh history, allowlisted files, pinned lockfile, no MIT licence. The user subsequently requested public visibility for Workbench; franciscortez/HACKATON is now PUBLIC, verified through GitHub on 26 October 2026. Anonymous clone, frozen-lockfile install and standalone build passed.

Production has `NEXT_PUBLIC_VIDEO_CONNECTOR_ENABLED=1`. Windows/macOS numbered setup tabs include prerequisites, clone location, Python/model setup, Claude login, build, doctor, start and pairing. Includes keyboard tabs, copy feedback, return-user commands and paired setup help. Missing FFmpeg/subtitle dependencies disable affected operations. Operation setup failures now record failed recovery state; regression test injects save failure. Underlying OS cause of one transient Windows import failure remains unknown; retry succeeded.

## Verification

276 unit/API tests passed, 6 skipped; lint/typecheck passed. Public connector build passed. Actual production browser acceptance with public clone passed imports, fake-Claude editing, export/recovery, dependency gating and revocation. Manual Windows/Edge native-Claude test exported two synthetic clips to a 34-second 1080x1920 video. Evidence: ignored tests/artifacts/public-native-export.mp4 and setup-production-{windows,macos,mobile}.png. Browser emits loopback mixed-content warnings and expected disconnected 503 responses.

macOS hardware and a clean Windows machine/account remain unverified; installed prerequisites were reused. Codex subscription support remains unavailable. Users must keep their own computer and connector terminal running.

## Source and next step

PR #9 is merged. GitHub CI and Vercel production build passed on ce5ef09. Local main matches origin/main; local and remote feature branches were deleted. This final handoff update is the only uncommitted change. Next action: have Josh follow the Windows or macOS setup on his own computer and record fresh-machine acceptance.

Existing unrelated servers on port 3000 and montage worktree untouched. Test-owned connectors stopped after checks. Earlier Tool 03 and PR #6 are merged. Production project leveric-workbench, team bamcortezzs-projects, Node 24. Existing Ollama/ngrok integration still requires its local services running.

Latest production deployment: dpl_B4bxKeXDMxQfwFtcfwMQBzRjdkm5, Ready with leveric-workbench.vercel.app assigned.

Production credentials updated on 26 October 2026: GROQ_API_KEY and GOOGLE_GENERATIVE_AI_API_KEY stored as Production-only Vercel secrets; existing Preview values preserved. Both provider model-list checks returned HTTP 200 (Groq checked with Node fetch after Python urllib was denied). No generation or paid model call was made. Redeployment: dpl_GY7V5drFhirFBEyZE5ugzbtGvh7z from ce5ef09. No secret values saved in repository files.
