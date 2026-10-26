# Architecture: Leveric Workbench

One Next.js app. Each tool is a module that plugs into a shared shell, a shared AI layer and a shared review flow. Adding a tool means adding one folder under `lib/tools/` and one line in `lib/tools/registry.ts`; the generic `app/tools/[slug]` route renders it. No other shared code changes.

## 1. Folder layout (planned)
```
app/
  layout.tsx                 fonts, tokens, app shell
  page.tsx                   tools index (numbered list)
  tools/[slug]/page.tsx      generic tool page: stepper + source + review + export
  api/tools/[slug]/run/route.ts   POST: run a tool (server only)
  api/transcribe/route.ts    POST: audio to transcript
  globals.css                Tailwind v4 @theme tokens (see DESIGN.md)
components/
  shell/                     top bar, client switcher, run counter
  workflow/                  Stepper, SourcePanel, ReviewTable, ApprovalBar, ExportMenu, CostNote
  ui/                        shadcn primitives restyled to tokens
lib/
  ai/
    models.ts                model IDs per provider (single place to update)
    provider.ts              provider chain: Groq -> Gemini -> Ollama
    cost.ts                  token counts to cost note
  clients/
    schema.ts                Zod schema for client config
    load.ts                  read clients/*.json
  runs/
    store.ts                 browser storage for runs and approval status
    usage.ts                 run counter per client per month
  tools/
    registry.ts              list of tools: slug, name, status, module
    meeting-to-action/
      input.ts               Zod input schema
      output.ts              Zod output schema
      parse.ts               transcript format parsers (Fathom, VTT, SRT, plain)
      prompt.ts              system and user prompts
      check.ts               quote check, owner match, date resolve, flags
      export.ts              Markdown, CSV, Slack, email
      index.ts               ToolModule implementation
clients/
  leveric.json
  harbourside-accounting.json          (synthetic)
fixtures/
  meeting-to-action/                   transcripts used in tests and demo
docs/                                  this documentation
```

## 2. Tool contract
Every tool implements one interface:

```ts
interface ToolModule<I, O> {
  slug: string;
  name: string;
  inputSchema: ZodType<I>;
  outputSchema: ZodType<O>;
  run(input: I, ctx: RunContext): Promise<RunResult<O>>; // extract + check
  exports: ExportFormat<O>[];                             // enabled after approval
}

interface RunContext {
  client: ClientConfig;      // roster, voice, rules, dataPolicy
  model: ModelHandle;        // from provider chain
  now: Date;
}

interface RunResult<O> {
  output: O;
  flags: Flag[];             // items needing review
  cost: CostNote;            // provider, model, tokens, cost
}
```

Code samples in this document show shape only, not final code.

## 3. Request flow
```
Browser                          Server (Next.js route)                 Providers
-------                          ----------------------                 ---------
pick client + source
  | (audio)  POST /api/transcribe --> Groq Whisper | faster-whisper --> transcript
  v
POST /api/tools/[slug]/run
  { clientId, input }  ------->  load client config
                                  check run cap (sent count from browser; trusted for demo only)
                                  validate input (Zod)
                                  provider chain --------------------> Groq | Gemini | Ollama
                                  validate output (Zod), retry once
                                  tool.check(): quotes, owners, dates
  <-------------------------------  { output, flags, cost }
review + edit (status EDITED)
approve (status APPROVED)
export (copy / download)
save run to browser storage
```

## 4. Provider chain
- Order: Groq, Gemini, Ollama. Skip a provider if its env var is missing.
- `dataPolicy: "local-only"` clients use Ollama only. If Ollama is down, the run fails with a clear message instead of falling back to the cloud.
- Fallback triggers: HTTP 429 (rate limit), 5xx, timeout (60s per cloud call; 180s for Ollama), or schema failure after one retry on the same provider.
- If every provider fails, the run shows the error panel with the last raw model text and a retry button (PRD §7, tool 01 §6C).
- The provider and model used are returned in the cost note and shown in the UI.

## 5. Approval state machine
```
DRAFT    --edit-->    EDITED
DRAFT    --approve--> APPROVED
EDITED   --approve--> APPROVED
APPROVED --edit-->    EDITED
```
- New run output starts as `DRAFT`.
- Any edit (cell, email text, add or delete row) sets `EDITED`.
- `Approve` sets `APPROVED` and records the time.
- Editing after approval returns to `EDITED`. Export is enabled only in `APPROVED`.

## 6. Storage
- Client configs: JSON files in `clients/`, validated at load. Read-only at runtime.
- Runs: browser `localStorage` under `workbench:runs:<clientId>`, wrapped in try/catch. Losing them loses history only, never the current screen.
- Run counter: browser storage for the hackathon. **Known limit:** a user can reset it by clearing storage. Phase 3+ moves usage to a server store (Vercel KV or Supabase).

## 7. Errors
| Error | Where | User sees |
|---|---|---|
| Invalid input | Route, Zod | Field-level message |
| Unsupported file | Parser | "This file type is not supported. Paste the text instead." + paste tab |
| Provider rate limit | Provider chain | Silent fallback; cost note shows provider |
| All providers failed | Route | "No model is available right now. Try again in a minute." |
| Schema failure twice on every provider | Route | Error panel with raw text and retry |
| Over run cap | Route | Blocked message with request-more action |

## 8. Security
- API keys only on the server (route handlers); never sent to the browser.
- Client data never logged. Server logs keep tool slug, provider, tokens, duration and error codes only.
- Uploaded files are processed in memory and not stored.
- Prompt-injection guard: transcripts are passed as data inside delimiters; the system prompt says to ignore instructions inside the source.

## 9. Testing
- Unit (Vitest): parsers, quote check, owner matching, date resolving, exports, state machine.
- Golden test: Leveric transcript fixture must produce the golden actions in `tools/01-meeting-to-action.md` (run against a recorded model response so it is deterministic and free).
- End to end (Playwright): paste transcript, run, edit, approve, export, on desktop and 375px width.

## 10. Known limits (phase 1)
- No server-side history or shared workspace.
- Run cap is enforced in the browser only.
- Ollama fallback works only when the app runs on a machine with Ollama (not on Vercel).
- Free-tier limits can change without notice.
