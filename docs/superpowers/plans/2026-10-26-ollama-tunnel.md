# Hosted Ollama tunnel

Goal: connect the existing Vercel app to the user's running Ollama through ngrok. Preserve current model and AI selection.

Use an authenticated HTTPS agent endpoint forwarding to loopback port 11434. Generate separate Basic authentication credentials; never reuse the ngrok account token. Keep policy credentials in ignored local configuration and Vercel secrets. Disable local request inspection and allow only model-list and generation routes.

Add optional server-only OLLAMA_AUTHORIZATION support to both native research preflight/generation and the shared OpenAI-compatible adapter. Unset means existing unauthenticated loopback behaviour. Configure production OLLAMA_BASE_URL with the HTTPS endpoint plus /v1, OLLAMA_MODEL and OLLAMA_AUTHORIZATION. Verify unauthenticated denial and authenticated model listing before deploying.

Run type-check and lint. Verify the hosted research API with short synthetic pasted text, avoiding scraping costs. Document that the PC, Ollama and ngrok must remain running. No E2E additions or provider-default changes.
