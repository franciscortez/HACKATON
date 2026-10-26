# Tool 05: Brief to landing page

Status: PLANNED. Short spec; deepen before building.

| | |
|---|---|
| Input | Offer brief, call to action, approved proof (testimonials, results), brand guide, optional reference site |
| Output | Responsive landing page draft (HTML/Next.js section set) with a working enquiry form |
| Rule | Never invent testimonials or results; publishing needs approval |
| Buyer | Businesses running a campaign or new offer without a web team |
| Recurring job | A new page per offer, event or campaign |
| Workaround | Squarespace or WordPress templates, agencies |

## Data sources
Brief and proof from the user only. Optional reference site for structure (not copied).

## Model needs
Structured output: page sections as JSON, rendered by our own premium section templates (so quality comes from templates, not from free-form model HTML).

## Cost risk
Low per draft. Hosting per page is free on Vercel; form submissions to the client's CRM (HubSpot) later.

## Notes
Josh wants premium, non-template looks (reference: Aura-style sites), "making it look premium". Placeholders for missing proof must be obvious, e.g. "[Add an approved testimonial]".

## Open questions
- Template library size for v1 (suggest 3 layouts).
- Where approved pages are published (subdomain per client?).
