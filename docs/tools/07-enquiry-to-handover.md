# Tool 07: Enquiry to qualified handover

Status: PLANNED. Short spec; deepen before building.

| | |
|---|---|
| Input | Enquiry (form or email text), client's fit rules (minimum size, budget signals, services, regions) |
| Output | Qualification (fit score per rule with reasons and evidence), handover note for the salesperson, reply draft |
| Rule | Show reasons; no automatic rejection |
| Buyer | Firms with more enquiries than they can call back quickly |
| Recurring job | Triage every enquiry |
| Workaround | Owner reads each one and guesses |

## Data sources
The enquiry, the enquirer's website (via the research layer from tool 03), public company size signals.

## Model needs
Rule-by-rule evaluation into a schema: `{ rule, result: meets | fails | unknown, evidence }`. Unknown is a valid answer.

## Cost risk
Low; reuses tool 03 fetches. Cap research depth per enquiry.

## Notes
Josh: "qualified means they actually can afford your service" (e.g. a $10,000/month offer vs a brand-new micro business). Output recommends, never decides.

## Open questions
- Intake source: website form webhook, shared inbox, or paste.
