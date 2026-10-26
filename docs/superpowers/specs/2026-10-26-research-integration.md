# Research integration design

Approved: current main foundation, fix reliability before ready PR, Ollama by default.

Single workspace replaces per-client UI. Keep existing Leveric history and labelled legacy demo history without deleting originals. An edited legacy report becomes a workspace copy. Preserve main's NDJSON endpoint and meeting workflow. Add optional aiMode local/auto, default local. Local means no cloud AI fallback; Auto retains Groq/Gemini/Ollama. Workspace local-only policy overrides choices and requires pasted material.

Ollama uses installed qwen2.5:7b-instruct through native structured-output API with 8192 context, bounded generation and existing four-minute deadline. Extract numbered evidence units, model selects IDs, server reconstructs source quotations and validates metadata substrings. Unsupported facts stay unknown. Empty verified output is visibly incomplete.

Preflight local availability/model before Apify. Emit collected research and a server-signed recovery snapshot once collection completes, before AI. HMAC derived from Apify key with domain separation, expiry 24 hours, request maximum 256 KiB. Snapshot retains source bounds, measured branding, origin URL, timestamp and original usage. Browser persists it. Retry generation verifies it and never fetches sources or increments research count. Expired snapshots require explicit new collection. Pasted text can simply be retried; raw provider failures and credentials never reach the browser.

Acceptance: integrated Tool 01 unchanged, Tool 03 local browser flow returns correct Leveric name plus two offerings and one opportunity, approval/export work, provider failure followed by retry incurs zero extra scraping, histories survive, full deterministic tests green. One fresh reviewer before ready PR. Commit/push/open PR are authorised; merge/deploy excluded.
