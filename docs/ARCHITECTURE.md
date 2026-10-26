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
  services/                global services: settings, run history
  types/                   global types: tool contract, run, cost
  schemas/                 global Zod schemas: workspace settings
  data/settings.json       workspace settings (voice, sign-off, rules, data policy)
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
| `POST` | `/api/tools/{slug}/runs` | Run a tool. Bad requests get a JSON error; a valid run streams NDJSON events: `progress` (done, total, label), then `result` (output, cost) or `error` (code, plain message) |
| `POST` | `/api/transcriptions` | Audio to transcript (phase 2b) |

Responses:
- Success: `200` (read) or `201` (run created) with JSON body.
- Errors: one shape for every endpoint, `{ error: { code, message } }`, with `400` invalid input, `404` unknown tool, `413` input too large. Failures during a run arrive as an `error` event with a plain message; model output never reaches the browser.

Runs, edits and approvals are kept in the browser in phase 1. When server storage is added, runs get `GET /api/tools/{slug}/runs`, `GET /api/runs/{runId}` and `PATCH /api/runs/{runId}` (edit, approve).

## 3. Flow
```
Browser                                Server (app/api)                    AI providers
pick client, add source
POST /api/tools/{slug}/runs  ------->  validate input (Zod)
                                        load workspace settings
                                        feature service: extract  -------> Groq | Gemini | Ollama
                                        validate output (Zod)
                                        feature service: check
                             <-------  stream: progress ... result { output, cost }
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
- Workspace settings: `src/data/settings.json`, read-only, validated at load.
- Runs and run counter: browser storage in phase 1 (can be cleared by the user; known limit).

- Tool 06 (local only) keeps each edit in a local workspace folder (`VIDEO_WORKSPACE`): `project.json`, `timeline/vNNN.json` versions, `style.md`, `exports/`, and per imported video `media/<mN>/` (original, proxy, thumbnails, frames, waveform, transcript, pauses). Nothing is uploaded anywhere; Claude Code reads transcripts and frames from that folder.

## 7b. Tool 06 local routes
Tool 06 is a video editor, so it does not use the generic runs route. An edit holds several imported videos and a versioned `Timeline` JSON; imports, hand edits and Claude edits all save new versions. Routes in `app/api/video-projects/`: POST (new empty edit), GET/PUT `[id]` (edit + current timeline + words per video; rename), POST `[id]/media` (import a streamed file, NDJSON), GET `[id]/media/[mediaId]/[file]` (proxy with HTTP Range, thumbnails, waveform), PUT `[id]/timeline` (hand edit), POST `[id]/prompt` (Claude, NDJSON), POST `[id]/versions/[n]` (undo/redo target), POST `[id]/export` (NDJSON render; 409 `empty_timeline`), GET `[id]/exports/[file]`, PUT `[id]/style`. Every route first calls a local gate and answers 503 `local_only` on Vercel, or `claude_missing` / `ffmpeg_missing` / `python_missing`. One long job (import, prompt, export) per edit at a time (409 `job_running`).

## 8. Security
- API keys only in route handlers and env vars; never sent to the browser.
- No client content in logs; uploads processed in memory, not stored.
- Source text passed to models as delimited data; prompts say to ignore instructions inside it.

## 9. Known limits (phase 1)
- No server-side history.
- Ollama works only when the app runs on a machine with Ollama, not on Vercel.
- Free-tier limits can change without notice.

## 10. Website research

Tool 03 follows the single-workspace settings contract and shares the streamed run endpoint with Tool 01. RunContext retains progress and adds cancellation plus a research-collection callback. Research settings hold enabled/maxRunUsd/runsPerMonth; the browser count remains advisory.

Shared services own guarded Apify collection, preview signing, recovery signing and native Ollama structured generation. Feature services own evidence-unit selection and dossier composition. The optional local/auto AI choice defaults to local for research only. The native local adapter leaves Tool 01's existing provider chain unchanged.

The stream emits a signed research snapshot before generation. It includes collected sources, observed branding, original URL/time and usage. HMAC signing uses the Apify key with a recovery-specific domain separator and 24-hour expiry; the browser stores the opaque token. A verified retry goes straight to generation. No database or new storage infrastructure is introduced. Original browser history keys remain intact, with labelled legacy demo reports copied to workspace history on edit.
