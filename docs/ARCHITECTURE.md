# Architecture: Leveric Workbench

One Next.js app (App Router). Each tool is a **feature** that plugs into a shared shell, a shared AI layer and a shared review flow. This document shows the overall shape and flow only; each feature's files are decided when that feature is planned. Testing is in [TESTING.md](TESTING.md).

## 1. Folder layout
```
src/
  app/                     pages and API routes only; thin, no business logic
    (pages)                tools index, generic tool page /tools/[slug]
    api/                   every REST endpoint (see section 2)
  components/              global UI: ui primitives, app shell, shared workflow parts
  lib/                     global helpers: AI provider chain, model config, cost, utils
  services/                global services: clients, runs, usage
  types/                   global types: tool contract, run, cost
  schemas/                 global Zod schemas: client config, run
  data/clients/            client config JSON (one file per client)
  features/
    registry.ts            slug -> feature, name, status
    <feature-name>/        one folder per tool, e.g. meeting-to-action
      components/          UI only this tool uses
      services/            logic only this tool uses
      schemas/             Zod schemas for this tool's input and output
      types/               types inferred from the schemas
      prompts/             model prompts
      index.ts             public API of the feature

tests/                     all tests, separate from source (see TESTING.md)
```

Imports use the `@/*` alias, which points at `src/` (for example `@/features/meeting-to-action`).

### Rules
- A feature keeps everything it owns inside `features/<feature-name>/`.
- A feature imports from global folders and its own folder only, never from another feature.
- Global folders never import from a feature. Code outside a feature imports only its `index.ts`.
- When a second feature needs something, move it to the global folder instead of copying it.
- Folder name = tool slug = URL (`/tools/meeting-to-action`). Zod schema files end in `.schema.ts`.

## 2. API (REST, App Router route handlers)
All server work goes through REST endpoints in `app/api/`. Pages and components call these endpoints; they do not call AI providers or read client files directly. No Server Actions for data. Route handlers stay thin: validate with Zod, call a service, return JSON.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/tools` | List tools with name and status |
| `GET` | `/api/tools/{slug}` | One tool's details |
| `GET` | `/api/clients` | List client configs (safe fields only) |
| `GET` | `/api/clients/{clientId}` | One client config |
| `POST` | `/api/tools/{slug}/runs` | Create a run: validate input, run the feature, return output, flags and cost |
| `POST` | `/api/transcriptions` | Audio to transcript (phase 2b) |

Responses:
- Success: `200` (read) or `201` (run created) with JSON body.
- Errors: one shape for every endpoint, `{ error: { code, message } }`, with `400` invalid input, `404` unknown tool or client, `413` input too large, `429` run cap reached, `502` all AI providers failed.

Runs, edits and approvals are kept in the browser in phase 1. When server storage is added, runs get `GET /api/tools/{slug}/runs`, `GET /api/runs/{runId}` and `PATCH /api/runs/{runId}` (edit, approve).

## 3. Flow
```
Browser                                Server (app/api)                    AI providers
pick client, add source
POST /api/tools/{slug}/runs  ------->  validate input (Zod)
                                        load client config
                                        check run cap
                                        feature service: extract  -------> Groq | Gemini | Ollama
                                        validate output (Zod)
                                        feature service: check
                             <-------  201 { output, flags, cost }
review and edit   (EDITED)
approve           (APPROVED)
export (copy or download), save run in browser
```

## 4. Tool contract
Each feature's `index.ts` exports one object that matches the shared contract in `types/`: slug, name, input schema, output schema, a `run` function (extract then check) and its export formats. The API route looks the feature up in `features/registry.ts` and calls `run`.

## 5. AI provider chain
- Order: Groq, then Gemini, then Ollama. A provider without its env var is skipped.
- Falls back on rate limit, server error, timeout, or invalid output after one retry.
- `local-only` clients use Ollama only and never fall back to the cloud.
- The provider and model used are returned in the cost note.

## 6. Approval
`DRAFT` -> `EDITED` on any edit; `DRAFT` or `EDITED` -> `APPROVED` on approve; `APPROVED` -> `EDITED` on any later edit. Export only when `APPROVED`.

## 7. Storage
- Client configs: JSON in `clients/`, read-only, validated at load.
- Runs and run counter: browser storage in phase 1 (can be cleared by the user; known limit).

## 8. Security
- API keys only in route handlers and env vars; never sent to the browser.
- No client content in logs; uploads processed in memory, not stored.
- Source text passed to models as delimited data; prompts say to ignore instructions inside it.

## 9. Known limits (phase 1)
- No server-side history; run cap enforced in the browser.
- Ollama works only when the app runs on a machine with Ollama, not on Vercel.
- Free-tier limits can change without notice.

## 10. Research to call brief

The shared research layer owns URL validation, bounded Apify lifecycle, rendered HTML extraction, visual observations and signed preview retrieval. Tool 03 owns its versioned schemas, Leveric capability catalogue, composition, evidence checks, review and exports. No feature cross-imports.

`POST /api/tools/{slug}/runs` accepts the existing envelope. Tool 03 requires only companyUrl; legacy contact/objective values are optional context. New results have schemaVersion 2, dossier, brand, callSheet, callSheetStale and editedSections, plus compatible source/brief fields. Legacy browser records use the original renderer; malformed v2 records cannot silently fall back to v1.

`GET /api/research/preview?token=...` verifies a seven-day HMAC reference to an Actor key-value store and a fixed preview key. It fetches only the Apify API, limits image bytes to 3 MB and checks JPEG type/signature. Raw HTML and image binaries are not stored in browser history. History includes optional run cost; older entries may lack it.

Each browser run permits at most six pages, concurrency one, no retries, a 120-second Actor timeout and a four-minute overall deadline. Apify maxTotalChargeUsd does not enforce limits on pay-per-usage Actors; settings.maxRunUsd is retained for compatibility but represents the US$0.10 target for this mode. ResearchUsage.budgetPolicy distinguishes target from older allocations. Known charges, including partial work, remain visible; ambiguous starts are never automatically retried.

Browser scripts are fixed application code. Pre-navigation hooks block private/reserved DNS destinations, unsafe URL schemes, credentials, nonstandard ports, non-read request methods and WebSockets. Chromium bypasses service workers during collection. Public CDNs may load CSS/images/fonts. No prospect scripts or HTML are executed inside the app; visual observations are data, not trusted markup. App credentials are never placed in browser page context.

Source extracts are checked against captured text. Synthesis and suggested opportunities remain labelled interpretations; hypotheses must cite an observed extract and a documented capability. Dossier edits invalidate the call sheet; rebuilding explicitly replaces prior call-sheet edits. Approval gates exports, and long print content is blocked rather than truncated.

Local-only clients skip Apify and DNS entirely, using pasted material with Ollama. Monthly counters and history are browser-local; no authentication or durable server database was added. Deployments require a hosting plan supporting the 300-second route duration. Developer MCP remains separate from the application.
