# Tech stack: Leveric Workbench

Goal: every tool runs for about $0 per run on free tiers, with a local fallback, so Leveric can include 15-20 tools in a $1,000/month plan without a variable cost that grows out of control (Josh, transcript 41:45).

## Summary
| Layer | Choice | Why | Cost |
|---|---|---|---|
| Framework | Next.js (App Router), TypeScript, strict mode | User's choice; server routes keep API keys off the client; deploys to Vercel in one step | $0 |
| Styling | Tailwind CSS v4 with `@theme` tokens from `DESIGN.md` | User's choice; one token file keeps every tool on brand | $0 |
| UI primitives | shadcn/ui (Radix), restyled to Leveric tokens | Accessible dialog, tabs, dropdown, toast without designing from scratch | $0 |
| Fonts | `geist` package (Geist, Geist Mono) | Same fonts as leveric.ai | $0 |
| Validation | Zod | One schema per tool for inputs, model output and exports | $0 |
| AI layer | Vercel AI SDK (`ai`) with `generateObject` / `streamObject` | One API across providers; structured output validated by Zod | $0 |
| LLM default | Groq free tier (`openai/gpt-oss-120b`) | Fast (about 5 s for a short meeting), free, JSON-schema output | $0 within free limits |
| LLM second | Google Gemini free tier (Flash class) | Long context (whole meetings), free | $0 within free limits |
| LLM fallback | Ollama local (7-8B instruct model, Q4) | Offline, private, no rate limit | Electricity only |
| Speech to text | Groq Whisper (large-v3-turbo) free tier; local faster-whisper fallback | Free, accurate; local copy already installed via the `video-editing` toolchain | $0 |
| Video (tools 06, 10) | FFmpeg, faster-whisper, HyperFrames (from the `video-editing` skill) | Already installed globally on this machine | $0, CPU time |
| Storage | Client configs as JSON in repo; runs and approvals in browser storage | No database to set up or pay for in a one-day build | $0 |
| Hosting | Vercel Hobby | Free, preview URLs for judging | $0 |
| API | REST endpoints as App Router route handlers in `app/api/` (no Server Actions for data) | One clear, testable server boundary; keys stay on the server | $0 |
| Tests | Vitest for unit and API tests; Playwright for one end-to-end path per tool; all in top-level `tests/` (see `TESTING.md`) | Proves "fresh input, reliable output" | $0 |

## AI providers in detail

### Provider chain
`Groq -> Gemini -> Ollama`. The first provider that is configured and not rate-limited handles the run. The UI's cost note always names the provider and model that produced the output.

| Provider | Package | Env vars | Notes |
|---|---|---|---|
| Groq | `@ai-sdk/groq` | `GROQ_API_KEY` | Free tier has per-minute and per-day token limits. Also serves Whisper for audio. |
| Gemini | `@ai-sdk/google` | `GOOGLE_GENERATIVE_AI_API_KEY` | Free tier may use prompts for training: do not send client data marked confidential to it. |
| Ollama | `ollama-ai-provider` (community) or OpenAI-compatible endpoint | `OLLAMA_BASE_URL` (default `http://localhost:11434`) | Only works when the app runs on a machine with Ollama. Not available on Vercel. |

### Model IDs
Free-tier model names change often. Keep them in one file (`lib/ai/models.ts`) and check them on the build day against the providers' model lists. Starting points:
- Groq: `openai/gpt-oss-120b` (text; `llama-3.3-70b-versatile` was no longer offered on 26 Oct 2026), `whisper-large-v3-turbo` (audio).
- Gemini: current free Flash model (for example `gemini-2.5-flash`).
- Ollama: `qwen2.5:7b-instruct` or `llama3.1:8b` at Q4.

### Local model on this machine
- GPU: AMD Radeon RX 6650 XT, 8 GB VRAM, no CUDA.
- Ollama on Windows: use the Vulkan backend (or LM Studio, which also exposes an OpenAI-compatible server). If the GPU is not used, a 7B Q4 model on CPU still works, but slowly (expect about 1 minute or more per meeting).
- faster-whisper runs on the CPU (int8). Use model `small` for speed, `medium` for accuracy.

## Cost controls
- Per-client monthly run cap in the client config (`usage.runsPerMonth`). The app shows `RUNS used / cap` and blocks runs over the cap with a "request more runs" message (Josh's idea: "only allowed to use the tool three times before emailing to ask for more").
- Input size cap per tool (for example, 60 minutes of audio or 120k characters of transcript).
- Cost note per run: provider, model, input and output tokens, estimated cost at paid rates (so the cost if the free tier ends is visible), actual cost now.
- No paid scraping in phase 1. Apify (cents per scrape) is allowed later for research tools, behind a per-client budget.

## Secrets
- Keys only in `.env.local` (git-ignored) and Vercel environment variables.
- `.env.example` lists names with empty values.
- No keys in client JSON, logs, exports or the handover.

### Tool 03 research

Uses native server-side `fetch` to the official Apify Playwright Scraper. A fixed page function extracts rendered text, semantic HTML and observed branding; hooks check network destinations before navigation. Actor scripts use Node 24 `process.getBuiltinModule` because the Actor VM does not support dynamic imports. No new app dependency. URL-only runs replace external contact/competitor searches. Six pages, concurrency one, no retries, 120-second Actor timeout and a four-minute request deadline bound work; US$0.10 is a target, not a guaranteed monetary cap for this pay-per-usage Actor. `APIFY_API_KEY` stays in ignored `.env.local` and hosting variables. Screenshot references are signed, expire after seven days and serve only JPEG records from the run through a restricted REST endpoint.

Developer Apify MCP 0.19.3 is installed outside the app on this machine. Its launcher loads `.env.local` explicitly and maps `APIFY_API_KEY` to `APIFY_TOKEN`; the token is absent from MCP configuration and command arguments. A new agent session may be required to expose newly registered tools.

## What is not in the stack (phase 1)
- No database, auth or payments. Add Supabase later if tools need shared history across users.
- No automatic sending (email, Slack, Asana). Exports are copy or download only. Integrations come after approval flows are proven.

## Versions (pinned 26 Oct 2026)
| Package | Version |
|---|---|
| Node | 24.22 (pnpm 10.34) |
| next | 16.4.3 |
| react, react-dom | 19.3.0 |
| tailwindcss | 4.3.3 |
| typescript | 5.9.3 |
| zod | 4.6.7 |
| ai | 7.0.153 |
| @ai-sdk/groq | 4.0.70 |
| @ai-sdk/google | 4.0.105 |
| @ai-sdk/openai-compatible | 3.0.78 (used for Ollama at `http://127.0.0.1:11434/v1`) |
| vitest | 5.0.5 |
| @playwright/test | 1.64.1 |
| Groq model | `openai/gpt-oss-120b` (reasoning effort low, 8k output cap) |
| Gemini model | `gemini-2.5-flash` (thinking budget 1024, 8k output cap) |
| Local model | `qwen2.5:7b-instruct` in Ollama 0.40.11 (Vulkan, 16k context, 2k output cap) |
