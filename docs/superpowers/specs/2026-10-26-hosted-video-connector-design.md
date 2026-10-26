# Hosted video connector

Approved in conversation on 26 October 2026. The Vercel editor connects directly to a same-computer production Next.js connector on loopback. Claude Code uses the user's native subscription sign-in; FFmpeg, faster-whisper, source files and renders stay local. Transcripts, prompts and still frames may reach Claude. Windows and macOS with Chrome-family browsers are the release targets. Developer setup is intentional; no installer, tunnel, cloud render or new editing features.

The connector uses one-use 256-bit pairing codes (ten minutes), origin-bound bearer sessions (eight hours), exact origin/Host checks and five-minute resource-scoped media capabilities. Codes and sessions are never provider credentials. The browser grants loopback permission. Credentials and video never pass through Vercel. Missing AI access must not prevent manual editing.

Reuse the existing REST routes and schemas. Persist operation identifiers with committed versions, keep incomplete imports out of the project, recover completed operations without rerunning AI, reject stale edits and serialise project writers. Restart interrupts uncommitted jobs. Existing local development remains supported.

Codex is an explicitly unavailable future provider until approved commercial authentication and a real-account workflow have been verified. Do not reuse consumer tokens for a hosted commercial integration. Claude remains unmodified and signs in through its own flow. Project read boundaries must prevent access to neighbouring projects and credentials.

Alternatives considered: cloud execution requires additional storage/compute/authentication; a relay/tunnel adds infrastructure without benefit for same-computer use. Direct loopback was selected and a synthetic authenticated request from the real production origin succeeded in Chromium after granting loopback permission.

Release requires fake-provider automated tests, real FFmpeg checks, production-origin browser checks on both operating systems, and a separate manual subscription smoke run. Feature flag defaults off until these gates pass. Preserve local projects on rollback.

Research: https://github.com/morluto/rea ; https://edit.voogle.app/ ; https://code.claude.com/docs/en/legal-and-compliance ; https://learn.chatgpt.com/docs/app-server#auth-endpoints ; https://developers.openai.com/siwc/request-client-id ; https://wicg.github.io/local-network-access/ . REA inspected the public Voogle landing page/bundle, not its desktop internals. Facebook reel visual evidence was blocked by its login overlay.
