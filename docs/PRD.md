# PRD: Leveric Workbench

## 1. Summary
Leveric Workbench is one branded web app that holds Leveric's client tools. Each tool turns a recurring business input (a meeting, a URL, a brief, a recording) into a reviewed, export-ready output. Every tool shares the same four-step workflow, the same client configuration, the same approval rules and the same cost controls. We build the tools one at a time, starting with **Meeting to action**.

Source material: `slides/TICKET-GOAL.md` (the 20-slide hackathon deck) and `docs/TRANSCRIPT.md` (the 26 October 2026 L10 call).

## 2. Problem
- Expert service businesses in Australia and New Zealand (accountants, consultants, agencies) repeat the same admin after every meeting, enquiry and client onboarding.
- Pasting into ChatGPT is the current workaround. It has no client context, guesses owners and dates, forgets the brand voice, gives no audit trail and produces "AI slop" that staff must rewrite.
- Leveric's top tier is $10,000/month. To sell a $1,000/month (entry) and about $7,000/month (middle) tier, it needs a bundle of 15-20 tools that cost almost nothing to run.

## 3. Buyer and users
| Who | Need |
|---|---|
| Buyer: owner or director of an expert service business (5-50 staff) | Hours back each week, consistent output, no tech team |
| User: operations lead, account manager, partner | Fast draft they can trust, edit and send |
| Leveric staff (internal use) | Same tools on Leveric's own meetings, sales calls and onboarding |

## 4. Goals
1. One polished, working tool first (Meeting to action), then the rest one at a time.
2. Each tool works for two different clients through configuration only, with no code change.
3. Every run shows its source evidence, approval status and cost.
4. Cost per run about $0 on free tiers; local fallback when free tiers fail.
5. Looks like leveric.ai (see `DESIGN.md`).

## 5. Non-goals (phase 1)
- No automatic sending or publishing (email, Slack, CRM, social).
- No multi-user accounts, login or payments.
- No live meeting bot that joins Zoom or Teams.
- No fine-tuning or paid models.

## 6. Anti-goals (would fail even if it works)
- Invents owners, dates, prices, testimonials or facts.
- Output that reads as generic AI text with no link to the source.
- A cost that grows without limit when a client uses the tool a lot.
- A look that does not match the Leveric brand.

## 7. Shared workflow (all tools)
Based on slide 14.

| Step | What happens | Rules |
|---|---|---|
| 01 · Source | User picks a client config, adds the source (paste, file, audio, URL) and an optional brief | A blocked or unreadable source shows why and offers a paste-text fallback |
| 02 · Extract | Server runs the tool's prompt through the provider chain; output is validated against the tool's Zod schema | Invalid output is retried once, then shown as an error with the raw text available |
| 03 · Review | User edits the output in place; every item shows its source quote | Every edit sets status to `EDITED`; flagged items (unknown, conflicting, missing) are highlighted |
| 04 · Export | User approves, then copies or downloads | Export is disabled until status is `APPROVED`; nothing is sent automatically |

## 8. Client configuration (reuse through configuration)
One JSON file per client in `clients/`. Shared fields:

| Field | Example | Used for |
|---|---|---|
| `id`, `name` | `leveric`, "Leveric" | Switcher, exports |
| `industry`, `region` | "AI services", "AU" | Prompt context, spelling |
| `brand.voice` | "Direct, plain, AU spelling" | Draft tone |
| `brand.signOff` | "Cheers, Josh" | Email drafts |
| `team[]` | `{ name, aliases[], role, email, slack? }` | Owner matching; optional Slack handle for `@` mentions in exports (plain name when missing) |
| `rules[]` | "Never commit to dates on behalf of the client" | Added to every prompt |
| `usage.runsPerMonth` | `20` | Cost cap |
| `tools.<slug>` | Tool-specific settings | e.g. export format, catalogue file |
| `dataPolicy` | `"local-only"` or `"cloud-ok"` | `local-only` forces the Ollama provider |

Two seeded clients ship with every tool:
1. **Leveric** (internal, real data owned by Leveric).
2. **Harbourside Accounting** (synthetic, a 12-person accounting firm in Geelong). Labelled "Synthetic demo client" in the UI.

## 9. Cost policy
- Target: $0.00 per run on free tiers. Show estimated cost at paid rates next to it.
- Hard cap: runs per client per month, and input size per tool.
- Each tool spec states its expected tokens per run and its worst case.
- Paid services (Apify, paid models) need a per-client budget field before use.

## 10. Safeguards
- Source quotes on every extracted item.
- Unknowns stay unknown (`Unassigned`, `No date`, `Missing`), never guessed.
- `dataPolicy: local-only` keeps client data off cloud models.
- Use public or synthetic data unless client use is authorised (slide 16).
- Label mocks, seeded data and pre-generated outputs in the UI and in the demo.

## 11. Tools
Status: `LIVE` built and demoed, `NEXT` being built, `PLANNED` spec only.

| # | Tool | Input to output | Spec | Status |
|---|---|---|---|---|
| 01 | Meeting to action | Transcript or audio + roster to action register + email draft | [tools/01-meeting-to-action.md](tools/01-meeting-to-action.md) | LIVE |
| 02 | Sources to newsletter | Approved URLs + audience to cited newsletter draft | [tools/02-sources-to-newsletter.md](tools/02-sources-to-newsletter.md) | PLANNED |
| 03 | Research to call brief | Company URL + contact + objective to one-page brief | [tools/03-research-to-call-brief.md](tools/03-research-to-call-brief.md) | PLANNED |
| 04 | URL to social content | Page + brand to three posts and a caption | [tools/04-url-to-social-content.md](tools/04-url-to-social-content.md) | PLANNED |
| 05 | Brief to landing page | Offer brief + proof + brand to responsive page draft | [tools/05-brief-to-landing-page.md](tools/05-brief-to-landing-page.md) | PLANNED |
| 06 | Source video to variations | Owned video + hooks to three captioned variations | [tools/06-video-to-variations.md](tools/06-video-to-variations.md) | PLANNED |
| 07 | Enquiry to qualified handover | Enquiry + fit rules to qualification + reply draft | [tools/07-enquiry-to-handover.md](tools/07-enquiry-to-handover.md) | PLANNED |
| 08 | Discovery to proposal | Discovery notes + catalogue to proposal draft | [tools/08-discovery-to-proposal.md](tools/08-discovery-to-proposal.md) | PLANNED |
| 09 | Client intake to onboarding | Template + intake + checklist to gaps + kickoff + welcome | [tools/09-intake-to-onboarding.md](tools/09-intake-to-onboarding.md) | PLANNED |
| 10 | Recording to SOP | Recording or transcript to step-by-step SOP | [tools/10-recording-to-sop.md](tools/10-recording-to-sop.md) | PLANNED |

## 12. How the judging criteria are covered (slide 15)
| Category | Weight | Evidence |
|---|---|---|
| Customer value and commercial use | 30 | Product note per tool: buyer, recurring job, current workaround, time saved |
| Functionality, reliability, demo | 25 | Fresh input run live in the demo; schema validation; retry; provider fallback; failure case shown |
| Reusability across clients | 20 | Two client configs, same code, different outputs |
| UX and output quality | 15 | Leveric design system; source quotes; editable output; clean exports |
| Maintainability, cost, safeguards | 10 | Cost note per run; run caps; local-only mode; handover doc |

## 13. Submission checklist (slide 16)
- [ ] Working build: Vercel URL, setup steps in `README.md`, reproducible from a clean clone.
- [ ] Product note: buyer, recurring job, workaround, expected time saved (in each tool spec).
- [ ] Two client examples: both configs and both outputs, plus one failure case.
- [ ] Cost note: cost per run, monthly use, assumptions, limits.
- [ ] Short handover: architecture, checks, known limits, remaining work (`ARCHITECTURE.md` + `PHASES.md`).
- [ ] Recorded demo (Loom or Zoom): buyer and problem, fresh input end to end, second client and failure, costs and handover. Mocks and seeded data labelled.
- [ ] No secrets in repo or handover. Reused work disclosed.

## 14. Decisions (26 Oct 2026)
- Submission cutoff: 7 pm AEDT today.
- Hosting: judges use the Vercel URL (cloud free tiers). The recorded demo runs locally so it can also show the Ollama fallback.
- The real Leveric L10 transcript may be committed, deployed and sent to cloud models.
- Tool 01 hackathon build is transcript-only; audio upload comes next.

## 15. Open questions for Josh
- Maximum demo length.
- Dark wordmark and icon files.
