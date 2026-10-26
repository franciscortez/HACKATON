# Tool 08: Discovery to proposal

Status: PLANNED (next after tool 01). Short spec; deepen before building.

| | |
|---|---|
| Input | Discovery call transcript or notes (or audio), approved service catalogue with prices, proposal template |
| Output | Proposal draft: client situation, goals, recommended services from the catalogue, scope, pricing, timeline, next steps; list of missing details |
| Rule | Approved prices only; flag missing details |
| Buyer | Consultancies and agencies that send proposals after sales calls (Leveric first) |
| Recurring job | A proposal after every discovery call |
| Workaround | Copy last proposal, edit for hours |

## Data sources
Transcript (reuses tool 01 parsers and transcription), catalogue JSON in client config (`tools.discovery-to-proposal.catalogue`), template.

## Model needs
Match needs to catalogue items by ID; the model may only select catalogue IDs, prices are filled from the catalogue by code, never by the model.

## Cost risk
Low (same as tool 01).

## Notes
Josh: "This is the one I really like... this one will definitely be used." Ideal flow: press stop during the call, proposal ready before the call ends, then e-signature (DocuSign) later. Export PDF or DOCX in the first build of this tool; signature integration later.

## Open questions
- Leveric's real catalogue and prices (Josh to supply; use synthetic until then).
- Proposal template and branding.
