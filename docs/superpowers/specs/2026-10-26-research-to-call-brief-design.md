# Research to call brief: approved design

## Intent and evidence

Prepare founders and salespeople for discovery calls with short, specific notes. The source brief is `slides/TICKET-GOAL.md`, tool 03; Josh's detail is in `docs/TRANSCRIPT.md` around lines 455–469: research company size, history, locations and competition before a booked call. Separate facts from inferences and flag gaps. The user approved this design in chat on 26 October 2026.

## Selected approach

The app calls fixed Apify REST Actors, followed by the existing free-model chain. A separate developer MCP connection supports development. Runtime MCP was considered and declined because deterministic REST calls make scope, cost and recovery easier to control. A website-only release was declined because local competitors matter to the call.

## Behaviour

- Manual form: business URL, contact, call objective and optional enquiry notes. URL submission automatically scrapes public company pages through the client's paid Apify account.
- Up to five company pages and three supplementary contact/competitor pages. Use Website Content Crawler plus RAG Web Browser: one contact/company query fetching at most one page, then one competitor query fetching at most two pages. Queries include the verified city and country; RAG's Google search locale is US, so location is checked against evidence rather than assumed from ranking.
- Core brief of at most 550 words: company facts, contact background, likely needs, three local competitors, talking points and gaps. Every factual claim has a source URL and a quote found in the retrieved content. Inferences stay labelled and reference evidence. Missing or conflicting information stays unknown.
- Find competitors only when company industry and city are supported by evidence. Do not claim market leadership, revenue or capacity from search ranking.
- A user edits, approves, then copies/downloads Markdown or prints an A4 PDF. Any edit resets approval. Expanded evidence does not print. Browser print is the export mechanism; no PDF service.
- Keep the existing Leveric tokens, two client configurations, AU/NZ spelling, REST API and feature-folder rules.

## Cost and recovery

Per-client settings explicitly enable research with a US$0.10 maximum per run and 20 advisory monthly runs. The maximum Actor allocations are US$0.05 company crawl, US$0.02 contact search/fetch and US$0.03 competitor search/fetch. Pass each allocation through Apify's `maxTotalChargeUsd`; do not retry billable start requests. Record charges on partial failures and poll started runs rather than restarting them. Include pay-per-event charges, not just platform compute. Browser counters do not enforce a financial monthly ceiling.

Implementation ruling: Google Search Scraper rejected a two-cent cap with `max-total-charge-usd-below-minimum` (US$0.50 minimum). RAG Web Browser accepted the two-cent cap in a live diagnostic. This substitution preserves the user's approved ten-cent ceiling. Facts are conservative verbatim extracts; partial contact names produce an identity gap rather than a guessed biography.

Blocked or empty sources offer pasted-text recovery. `local-only` clients use pasted sources and Ollama, with no Apify calls. Reject private/local/credentialled URLs, ignore embedded instructions, cap source text at 40,000 characters and bound research time. No credentials in browser code, logs or fixtures.

## Non-goals

No LinkedIn login scraping, Calendly triggers, automatic sending, database, authentication or other tools. The user requested merging the completed Tool 01 foundation first, with its documented owner-accuracy limitation retained. PR #4 was merged at `47148b5` before feature implementation began.

## Verification

Recorded/synthetic source and model responses cover both clients, supported citations, unknowns, ambiguity, competitors, prompt injection, spend ceilings, cancellation and failure recovery. Browser checks cover edit/approve/export, client isolation, desktop, 375px and one-page A4 output. Live smoke research is separate from automated tests and remains within US$0.10.
