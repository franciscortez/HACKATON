# Tool 02: Sources to newsletter

Status: PLANNED. Short spec; deepen before building.

| | |
|---|---|
| Input | Approved source URLs (or RSS), audience, date range, client voice samples |
| Output | Cited newsletter draft: intro, items with "what happened / what it means / risk / what to tell clients", table of contents, social post ideas |
| Rule | Flag old or conflicting information; review before sending |
| Buyer | Accounting and advisory firms that brief staff and clients on rule changes |
| Recurring job | Weekly or monthly update on regulator and industry news |
| Workaround | Partner reads sites manually and writes the email |

## Data sources
Government and industry sites (ATO, ASIC, Treasury, CPA, CA ANZ for Australian accounting clients). Fetch with server-side `fetch` and readability extraction; blocked pages fall back to paste text.

## Model needs
Long context for several articles (Gemini free tier first). Voice matching from 3-5 sample emails in the client config.

## Cost risk
Low per run; higher if scheduled every 6 hours like Josh's version. Cap: one scheduled run per day per client by default.

## Notes
Josh already runs a strong version for YSL (sources checked every 6 hours, written in Rob Andrew's voice, sent to Outlook). This tool must match or beat that: every claim links to its source, and dates are shown.

## Open questions
- Scheduling on Vercel Cron vs a local machine.
- Email delivery is out of scope until approval flow is proven; export HTML only.
