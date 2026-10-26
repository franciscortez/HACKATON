# Tool 09: Client intake to onboarding

Status: PLANNED. Short spec; deepen before building.

| | |
|---|---|
| Input | Onboarding template, client intake form answers, required-items checklist |
| Output | Gap list (missing or conflicting items), kickoff agenda, welcome email draft, follow-up request for missing items |
| Rule | Use supplied data only; flag conflicts; isolate each client's data |
| Buyer | Agencies and firms onboarding new clients |
| Recurring job | Every new client |
| Workaround | Spreadsheet checklist and manual chasing |

## Data sources
Intake answers (form or paste), uploaded files list. Leveric's own checklist examples: brand guide, logos, URLs, staff list, system logins.

## Model needs
Mostly deterministic: checklist comparison in code; model only for conflict detection and email drafting.

## Cost risk
Very low.

## Open questions
- Leveric's real onboarding checklist (team knows it; collect before building).
- Where files are received (link only in phase 1, no storage).
