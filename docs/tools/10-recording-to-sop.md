# Tool 10: Recording to SOP

Status: PLANNED. Short spec; deepen before building.

| | |
|---|---|
| Input | Authorised process recording (screen recording with voice) or transcript |
| Output | Editable step-by-step SOP: title, purpose, prerequisites, numbered steps with screenshots, warnings, unclear steps flagged |
| Rule | Authorised recordings only; flag unclear steps |
| Buyer | Firms that train staff and want repeatable processes |
| Recurring job | Documenting each internal process |
| Workaround | Someone writes the doc by hand or skips it |

## Toolchain (reuse the `video-editing` skill and tool 01)
- `transcribe.py` (faster-whisper) for word timings.
- `analyze.py` or FFmpeg scene detection to pick a frame per step.
- Tool 01 parsers for transcript-only input.

## Model needs
Free LLM turns transcript segments into steps with start times; code grabs a frame at each start time.

## Cost risk
Low money, moderate CPU time for long recordings. Cap recording length (suggest 30 minutes).

## Notes
Josh already does this with Claude and Grok bots for YSL; the bar is a cleaner, cheaper result. Export Markdown and DOCX.

## Open questions
- Consent checkbox wording for "authorised recording".
