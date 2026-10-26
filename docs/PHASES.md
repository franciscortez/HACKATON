# Phases: Leveric Workbench

Rule from the deck: finish one usable tool before starting the next (slides 2, 17). Each phase ends with a working demo, a cost note and updated docs. A later phase never starts while the earlier one fails its exit criteria.

User-selected order on 26 October 2026: merge Tool 01 first (PR #4), then build Tool 03 in a separate worktree before Tool 08. Tool 01's documented L10 owner-accuracy limitation was retained for human review. Tool 03 is now built and verified locally; deployment and its own PR remain separate actions. The later ordering table below records the original proposal.

## Phase 0: Docs (this phase)
- Output: `PRD.md`, `DESIGN.md`, `TECH-STACK.md`, `ARCHITECTURE.md`, `PHASES.md`, `tools/01`-`tools/10`.
- Exit: docs reviewed by the user; open questions listed; implementation plan for phases 1-2 written.

## Phase 1: Shell and design system
- Scaffold Next.js (TypeScript) + Tailwind v4 + Geist fonts + shadcn/ui.
- Tokens from `DESIGN.md` in `globals.css`.
- App shell: top bar, client switcher, run counter, tools index with all 10 tools and their status.
- Shared workflow components: Stepper, SourcePanel, ReviewTable, ApprovalBar, ExportMenu, CostNote.
- Client config schema and the two seeded clients.
- AI provider chain with model config and cost note (tested with a trivial prompt).
- Exit: deployed to Vercel; index page matches the brand at desktop and 375px; provider chain falls back when Groq key is removed.

## Phase 2: Tool 01, Meeting to action
- Parsers, prompt, checks, exports, approval flow (see `tools/01-meeting-to-action.md`).
- Transcript input only (paste or file). Audio upload is phase 2b.
- Fixtures: Leveric transcript, Harbourside synthetic transcript, failure transcripts.
- Exit: every acceptance criterion in the tool spec passes; demo recorded.

## Phase 2b: Audio for tool 01 (after submission)
- Direct upload to Groq Whisper (about 20 MB cap); local faster-whisper on a local machine.

## Hackathon submission: 7 pm AEDT, 26 Oct 2026
- Submit phases 1-2 with the checklist in `PRD.md` section 13.
- Anything after phase 2 that is not fully working is left out of the demo or labelled as planned.
- Cut list if time runs short, in this order: Playwright end-to-end test, chunking for long transcripts (fixture fits in one call), Slack export, grain texture and reveal motion, Gemini provider (keep Groq + Ollama).

## Later phases: one tool each
Order, based on Josh's signals in the call, reuse of tool 01 code, and run cost:

| Phase | Tool | Why this order |
|---|---|---|
| 3 | 08 Discovery to proposal | Josh's favourite ("this one will definitely be used"); reuses transcript parsing from tool 01 |
| 4 | 03 Research to call brief | Strong demand from Josh; adds the web fetch and research layer used by 04, 05, 07 |
| 5 | 04 URL to social content | "Will sell like crazy"; reuses web fetch and brand config |
| 6 | 07 Enquiry to qualified handover | Reuses research layer from 03 |
| 7 | 10 Recording to SOP | Reuses transcription; adds screenshots via FFmpeg frames |
| 8 | 02 Sources to newsletter | Josh already has a strong version; needs scheduling and source checks |
| 9 | 09 Client intake to onboarding | Mostly templating and gap checks |
| 10 | 05 Brief to landing page | Heavier output (full page); needs a template system |
| 11 | 06 Source video to variations | Heaviest compute (video render on CPU); uses `video-editing` toolchain |

Each later phase follows the same steps: deepen the tool spec, write the plan, build, add two client examples and a failure case, record a short demo, update status in `PRD.md`.

## Cross-cutting work (schedule when needed)
- Server-side usage tracking (move run caps off the browser), before any external client uses the app.
- Integrations (Slack, Asana, Notion, HubSpot) after the approval flow has been used for real.
- Apify or other paid scraping behind a per-client budget (phases 4-6).
