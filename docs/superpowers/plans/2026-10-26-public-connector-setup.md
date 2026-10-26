# Public connector and OS setup implementation plan

Approved in conversation. Publish connector-only source to franciscortez/leveric-video-connector; keep Workbench private and add no MIT licence. Generate the public source from an explicit allowlist with a minimal Next runtime and pinned lockfile. Add Windows/PowerShell and macOS/Terminal tabs, numbered copyable installation/clone/build/start/pairing instructions, return-user shortcuts and actionable dependency failures. Enable NEXT_PUBLIC_VIDEO_CONNECTOR_ENABLED=1 in Production and deploy the updated UI. Preserve pairing protocol and native Claude credentials.

## Tasks
- [x] Export and test a standalone connector package, with no private history/data/config.
- [x] Add accessible OS instructions, public clone URL, copy feedback and pairing form.
- [x] Validate FFmpeg subtitle support and missing dependencies; gate affected operations.
- [x] Test package/build/browser flows, review, publish public source and deploy production.
- [x] Record results and unverified macOS/clean-account acceptance in handoff.

## Decisions
- Use existing Next route handlers and original feature service paths; export a server-only barrel.
- Use home/Leveric/leveric-video-connector, Node 24, pnpm 10.34.7, Python 3.11 and CPU small speech model.
- No automatic OS installer. Users run visible commands. Public source includes only necessary connector code, not other tools or git history.
- This implementation request includes the accepted plan's public connector publication and production deployment. Workbench commits/pushes are not separately requested; deploy reviewed local source if needed and leave source changes reviewable.
