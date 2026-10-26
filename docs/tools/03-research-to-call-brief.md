# Tool 03: Research to call brief

Status: PLANNED. Short spec; deepen before building.

| | |
|---|---|
| Input | Company URL, contact name, call objective, any notes from the enquiry |
| Output | One-page call brief: company facts (size, founded, locations, services), contact background, likely needs, competitors in the same area, talking points, gaps |
| Rule | Separate facts (with source links) from inferences; flag gaps |
| Buyer | Founders and salespeople who take discovery calls (Leveric itself first) |
| Recurring job | Research before every booked call (e.g. Calendly bookings from Meta ads) |
| Workaround | Manual Google and LinkedIn search, or none |

## Data sources
Company website (several pages), public search results, Google Business listing. LinkedIn and socials only through a paid scraper (Apify) behind a per-client budget. Competitors: same industry and suburb or city.

## Model needs
Multi-step: fetch, summarise each source, then compose. Free tiers are fine for text; search API is the cost driver.

## Cost risk
Medium. Search and scraping cost cents per run. Budget field required before enabling Apify.

## Notes
Josh: "When I come to the call, I've already got notes and bullet points that are short, specific", "I know their business better than they do", and their competition. Builds the shared research layer reused by tools 04, 05 and 07.

## Open questions
- Which search API (free tier) to use.
- Trigger: manual form first; webhook from Calendly later.
