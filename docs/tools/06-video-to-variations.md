# Tool 06: Source video to variations

Status: PLANNED. Short spec; deepen before building.

| | |
|---|---|
| Input | Owned video (talking head or product), audience, 3 hooks |
| Output | Three captioned short variations (one format first: 9:16, 30-60s) |
| Rule | One reliable format first; disclose rendering cost and time |
| Buyer | Businesses with webinar or long-form video they never repurpose |
| Recurring job | Turning each long video into shorts |
| Workaround | Manual editing or paid tools (Opus Clip and similar) |

## Toolchain (reuse the `video-editing` skill)
- FFmpeg: probe, trim, reframe 16:9 to 9:16 (blurred-background fit for wide shots), concat.
- `analyze.py`: shot cuts and speech, so segments never cross a hard cut.
- `transcribe.py` (faster-whisper, CPU int8): word timings for captions.
- HyperFrames: captions, hook title card, end card, final render.
- All local: $0 per run, but CPU render time (minutes per variation on this machine: AMD RX 6650 XT, no CUDA).

## Model needs
Free LLM picks segments from the transcript for each hook (returns time ranges with reasons).

## Cost risk
Compute time, not money. Rendering cannot run on Vercel; needs a local or worker machine (the DGX Spark or Mac Mini Josh mentioned).

## Open questions
- Job queue and where renders run.
- Maximum source length (suggest 20 minutes).
