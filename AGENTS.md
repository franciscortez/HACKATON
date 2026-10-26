# AGENTS.md

Instructions for any AI agent (Claude Code, Codex, others) working in this repository.

## 1. Start every session here
1. Read [`docs/HANDOFF.md`](docs/HANDOFF.md) first. It says where the work stopped, what is in progress and what to do next.
2. Read the docs your task needs, using the table in section 3. Do not load every doc; read the ones that match the task.
3. If the handoff and the docs disagree, the docs win for decisions and the handoff wins for current status. Note the conflict in the handoff.

## 2. Project in one paragraph
Leveric Workbench is one Next.js app that holds Leveric's client tools (meeting to action, discovery to proposal, and eight more). Every tool follows the same flow: add a source, extract with a free AI model, review and edit, approve, export. Tools are built **one at a time**. It started as the Leveric engineering hackathon on 26 October 2026 (`slides/TICKET-GOAL.md`, `docs/TRANSCRIPT.md`).

## 3. What to read, by task
| Before you... | Read |
|---|---|
| Do anything | `docs/HANDOFF.md` |
| Decide scope, rules or priorities | `docs/PRD.md` |
| Build or change any UI, styling or motion | `docs/DESIGN.md` |
| Add a dependency, AI provider or model | `docs/TECH-STACK.md` |
| Create folders, files, API routes or a new feature | `docs/ARCHITECTURE.md` |
| Write or run tests, or check in a browser | `docs/TESTING.md` |
| Pick the next piece of work | `docs/PHASES.md` |
| Work on a specific tool | `docs/tools/<NN>-<tool>.md` for that tool only |
| Follow an implementation plan | `docs/superpowers/plans/` (the plan named in the handoff) |
| Need the original brief or Josh's exact words | `slides/TICKET-GOAL.md`, then `docs/TRANSCRIPT.md` |

## 4. Rules that always apply
- **Docs before code.** Do not write code for a feature until its tool spec and an implementation plan exist.
- **One tool at a time.** Finish the current tool (all acceptance criteria in its spec) before starting the next.
- **Feature folders.** Everything one tool owns lives in `features/<feature-name>/`. Shared code lives in the global folders. A feature never imports from another feature. See `ARCHITECTURE.md`.
- **REST only.** All server work goes through route handlers in `app/api/`. No Server Actions for data.
- **Brand.** Match leveric.ai using the tokens in `DESIGN.md`. Minimal, no AI-slop look.
- **Free models.** Groq, then Gemini, then local Ollama. No paid AI calls without a documented budget.
- **Never invent data.** Unknown owners, dates, prices or facts stay unknown and flagged.
- **Tests.** Tests live in `tests/`, never call real AI providers, and every feature passes the playwright-cli browser check in `TESTING.md`.
- **Secrets.** Keys only in `.env.local` and Vercel env vars. Never in code, docs, fixtures or the handoff.
- **Git.** Do not commit, push or open a PR unless the user asks in that message. Never work directly on `main`; branch first. No AI attribution in commits or PRs.
- **Spelling.** AU/NZ English in UI copy ("organise", "enquiry").
- **Tooling.** Use `pnpm` (`pnpm dev`, `pnpm test`, `pnpm test:e2e`, `pnpm build`). Source lives in `src/` with the `@/*` alias. Read the bundled docs before using an API: Next.js in `node_modules/next/dist/docs/`, AI SDK in `node_modules/ai/docs/`.

## 5. End every session here
Before you stop, update [`docs/HANDOFF.md`](docs/HANDOFF.md):
1. Change the "Last updated" line (date, agent, branch).
2. Move finished items to "Done", with PR numbers or commit hashes.
3. Write what is in progress, exactly where it stopped, and any uncommitted files.
4. Write the next step as one concrete action.
5. Add new decisions, blockers and open questions.
6. Keep it short: replace old detail instead of appending a diary. History belongs in git.

If a doc became wrong because of your work, fix the doc in the same change.

## 6. Next.js version note
<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
