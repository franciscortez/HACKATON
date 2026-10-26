# Security

## Supported version and reporting

Only the current main branch is supported. This repository is private. GitHub's dedicated private vulnerability reporting endpoint is unavailable for this repository; do not assume a public security advisory form exists.

Repository collaborators should report vulnerabilities in a private repository issue and notify the repository owner, franciscortez. Include affected behaviour, reproduction steps, impact and a sanitised example. Do not include API keys, real client transcripts, signed recovery tokens or sensitive logs. If you do not have repository access, contact the owner through an existing private channel. Do not disclose exploit details in public comments. Revisit this process before making the repository public.

## Secrets and incident response

Keep provider and Apify keys in ignored local env files or server-only Vercel environment variables. Never use a NEXT_PUBLIC_ prefix for secrets, or include them in logs, screenshots, fixtures or exports. CI type-check and lint jobs require no application secrets.

If a secret is exposed, revoke or rotate it at its provider, update Vercel, redeploy and inspect provider usage. Removing it from the latest commit is insufficient. Rotate the Apify key to invalidate existing research recovery and preview signatures when necessary.

## Data and trust boundaries

- Cloud AI can send submitted transcripts and website extracts to Groq or Gemini. Do not submit confidential material without appropriate permission. Local-only workspace policy blocks cloud AI and new crawling.
- Local Ollama runs on the application server, not the visitor's computer. It is unavailable on Vercel unless a separately hosted endpoint is configured. Research retains its local default; select Auto explicitly on Vercel.
- URL research sends the requested URL to Apify and collects public website content and screenshots. Website content is untrusted input; source claims and generated hypotheses require human review.
- Saved reports and recovery snapshots live in browser storage. Anyone with access to that browser profile can read them; clear stored data on shared devices. Signed recovery payloads provide integrity, not encryption, and expire after 24 hours.
- URL and redirect checks restrict private destinations. These checks do not prove connection-level DNS rebinding protection inside Apify's proxy network. Preview access is restricted and signed; screenshots expire after seven days or earlier storage expiry.
- Approval gates exports in the UI. The app does not automatically send email or publish generated work; approval is not an authentication boundary.

## Current limitations

There is no application authentication or durable server-side quota. Publicly reachable run endpoints can consume provider quota and incur Apify charges. Browser counters are advisory and USD0.10 is a target, not a guaranteed cap. Monitor provider usage and disable credentials or revert the deployment if abuse occurs. This document records the current controls; it is not a claim that the app has passed a security audit.
