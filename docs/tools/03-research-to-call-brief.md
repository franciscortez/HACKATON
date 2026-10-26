# Tool 03: Research to call brief

Status: LIVE locally; integration and local-generation verification complete. Current design: `../superpowers/specs/2026-10-26-url-dossier-design.md`. Current implementation plan: `../superpowers/plans/2026-10-26-url-dossier.md`.

## Acceptance criteria
- One website URL is sufficient. Bare domains become HTTPS. Legacy contact and objective are optional API context.
- Inspect up to six public same-site pages with Apify Playwright Scraper: text, semantic HTML, observed colours/font families/logo candidate/imagery/actions and homepage screenshot. Do not execute captured markup inside the application.
- Produce business summary, offerings, audience, positioning, proof, messaging, visual-brand observations and up to three evidence-linked Leveric opportunities. No external contact or competitor searches.
- Facts are verified source extracts, not independently audited claims. Synthesis and hypotheses are labelled. Unknown information stays unknown. Partner logos must not be presented as the business logo.
- Show a flowing report and desktop evidence rail, with mobile disclosures and readable defaults. Editing is explicit. Dossier edits invalidate the call sheet until rebuild; rebuilding replaces prior call-sheet edits.
- Approval gates full-dossier Markdown and call-sheet Markdown/A4 exports. Call sheet at most 550 words; long edits cannot be silently truncated.
- Preserve old browser reports through the legacy renderer. Main uses one workspace; old demo history is labelled and copied on edit. Cancellation ignores late results.
- Local-only uses pasted text and Ollama with no DNS or cloud calls. Missing previews and partial crawls retain useful evidence; blocked sources offer pasted recovery.
- Six pages, concurrency one, no retries, 120-second Actor timeout, four-minute overall request deadline. **US$0.10 is a target, not a guaranteed ceiling** for the pay-per-usage browser Actor. Actual costs and pending charges are visible. Monthly 20-run browser counter remains advisory.

## Observed live verification
26 October 2026: final Leveric URL-only run returned HTTP 201 in 13 seconds after all review fixes; correct company name, one page, four services and three proposed opportunities. Rendered homepage preview and Chromium per-hop interception worked in Apify. Reported Apify usage US$0.000470. Six bounded upgrade smoke/diagnostic runs totalled US$0.003195; some earlier attempts hit free-model quotas. No paid AI was used.

## Limits
Public website evidence only; no website audit, independent fact verification, logged-in social scraping, outreach, database or authentication. An observed font family is a computed CSS declaration, not proof of a licensed font file. Text is bounded at 12,000 characters per page and 40,000 total. Screenshot links expire after seven days or earlier if Apify storage expires; the saved report remains readable. Local model availability and free-tier quotas affect completion.

Network checks use Chromium request-stage interception for each redirect and subresource, plus private-address DNS validation and service-worker bypass. Apify controls proxy/connection DNS; DNS rebinding isolation at that layer has not been independently verified. The browser regression uses a loopback HTTP fixture on port 80 and asserts private redirect destinations receive no requests.


## Main integration and local recovery

Current integration plan: `../superpowers/plans/2026-10-26-research-integration.md`.
- Runs use main's NDJSON progress/result/error contract, with an additional research event carrying a signed recovery snapshot.
- `aiMode` defaults to Auto: Groq, then Gemini, with Ollama fallback. Local Ollama remains selectable. Local-only workspace policy selects local processing and prevents new crawling.
- Model facts select numbered source extracts. Original source text supplies quotations; unsupported IDs and metadata are rejected. Missing offerings produces an explicit incomplete-research error.
- Availability/model preflight happens before paid collection. Recovery snapshots expire after 24 hours and are signed with a domain-separated HMAC derived from the Apify key. Requests are bounded to 256 KiB. Retrying generation does not scrape, resolve source DNS or consume another research count.
- Recovery captures published web text, measurements and original usage. The browser retains it across reloads; new research explicitly replaces it. Expired snapshots never trigger an automatic crawl.
