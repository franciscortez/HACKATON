# URL dossier implementation plan

**Goal:** Turn a URL into an evidence-backed business/brand dossier and Leveric call sheet.
**Spec:** ../specs/2026-10-26-url-dossier-design.md
**Architecture:** Existing Next.js REST run envelope, shared Apify services and feature-owned composition/UI. Versioned output preserves legacy results.
**Execution:** Superpowers executing-plans; tests before behaviour changes; no commits without a new request.

- [x] Task 1: URL-only input, versioned dossier/brand/call-sheet contracts and evidence/approval tests.
- [x] Task 2: bounded browser extraction, private-address controls, preview endpoint and actual charge reporting.
- [x] Task 3: evidence-backed dossier composition and configured Leveric capability mapping.
- [x] Task 4: report/evidence interface, history, edit/rebuild/approval and Markdown/A4 exports.
- [x] Task 5: deterministic unit/API/E2E, browser screenshots and bounded live smoke.
- [x] Task 6: independent whole-change review, fix significant findings, final checks and handoff.

Acceptance: URL alone works; fonts/colours have provenance; unsupported facts never gain verified status; partial sources remain useful; local-only never networks; exports respect approval/staleness/size; both clients and legacy history remain isolated.
