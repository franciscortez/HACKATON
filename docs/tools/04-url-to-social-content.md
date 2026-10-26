# Tool 04: URL to social content

Status: PLANNED. Short spec; deepen before building.

| | |
|---|---|
| Input | Public page URL, audience, brand guide (colours, fonts, voice), 3-5 inspiration social handles or posts |
| Output | Three posts (copy + layout direction) and one caption, in the client's brand, blending the inspiration styles |
| Rule | Stay grounded in the page; text outputs first; never copy an inspiration post outright |
| Buyer | Service businesses that know they should post but do not |
| Recurring job | Weekly social posts about offers and updates |
| Workaround | Canva templates, ad-hoc ChatGPT posts |

## Data sources
The client's page (fetched), brand guide from client config or upload, inspiration posts (pasted text or screenshots).

## Model needs
Text first (free LLM). Follow-up release of this tool: render post images as HTML templates to PNG (Puppeteer, already installed) instead of paid image models.

## Cost risk
Low for text. Image generation (Higgsfield or similar) is a paid add-on and needs a budget field.

## Notes
Josh: "this one will sell like crazy". Example he showed: inspiration post on the left, branded version for Andrew on the right, similar feel but different layout and real message.

## Open questions
- Which platforms first (LinkedIn, Instagram)?
- How inspiration posts are supplied without scraping private accounts.
