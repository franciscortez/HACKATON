# Handoff

Last updated: 26 October 2026, Codex, branch `feat/video-setup-guide`.

## Done

Implemented the [approved plan](superpowers/plans/2026-10-26-public-connector-setup.md). Public connector: https://github.com/franciscortez/leveric-video-connector at `5e2fc13`; fresh history, allowlisted files, pinned lockfile, no MIT licence. Workbench remains private. Anonymous clone, frozen-lockfile install and standalone build passed.

Production has `NEXT_PUBLIC_VIDEO_CONNECTOR_ENABLED=1`. Windows/macOS numbered setup tabs include prerequisites, clone location, Python/model setup, Claude login, build, doctor, start and pairing. Includes keyboard tabs, copy feedback, return-user commands and paired setup help. Missing FFmpeg/subtitle dependencies disable affected operations. Operation setup failures now record failed recovery state; regression test injects save failure. Underlying OS cause of one transient Windows import failure remains unknown; retry succeeded.

## Verification

276 unit/API tests passed, 6 skipped; lint/typecheck passed. Public connector build passed. Actual production browser acceptance with public clone passed imports, fake-Claude editing, export/recovery, dependency gating and revocation. Manual Windows/Edge native-Claude test exported two synthetic clips to a 34-second 1080x1920 video. Evidence: ignored tests/artifacts/public-native-export.mp4 and setup-production-{windows,macos,mobile}.png. Browser emits loopback mixed-content warnings and expected disconnected 503 responses.

macOS hardware and a clean Windows machine/account remain unverified; installed prerequisites were reused. Codex subscription support remains unavailable. Users must keep their own computer and connector terminal running.

## Source and next step

The user authorised commit, push, PR and merge. Production was already deployed from reviewed local source; this branch records that implementation. Changed files: README, handoff/testing/tool docs and plan; setup UI, dependency checks, launcher/exporter, operation recovery, .vercelignore and tests. Next action: verify PR checks, merge into main and verify the resulting production deployment. PR #8 previously merged as 415ab30.

Existing unrelated servers on port 3000 and montage worktree untouched. Test-owned connectors stopped after checks. Earlier Tool 03 and PR #6 are merged. Production project leveric-workbench, team bamcortezzs-projects, Node 24. Existing Ollama/ngrok integration still requires its local services running.

Latest production deployment: dpl_D4h4h6Hf1qr8h7Lk1ZRBxQfAcUgL, Ready with leveric-workbench.vercel.app assigned.
