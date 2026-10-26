# Live homepage and Vercel deployment

Approved scope: implement directly on current main, preserve the existing handoff update, use no new worktree, and deploy to a new leveric-workbench project under bamcortezzs-projects.

- Filter homepage tools to LIVE; preserve registry, numbering and routes.
- Add next typegen plus tsc typecheck and GitHub CI running only typecheck/lint on main pushes and PRs. Pin actions; install with frozen lockfile.
- Connect Vercel Git production to main. Run lint, typecheck and build before publishing. Configure existing server-only Groq, Gemini and Apify credentials, Node 24 and the existing route duration.
- Keep local Ollama selected by default, per user choice; document selecting Auto on Vercel.
- Add docs/SECURITY.md, README links and handoff. Verify reporting availability rather than inventing a contact endpoint.
- Verify local checks, fresh CI, deployment Ready state and HTTP page responses. No E2E, unit tests or paid research runs for this task.

Ruling: GitHub private vulnerability reporting is unavailable (404) for this private repository. Document private repository issues for collaborators and existing private contact channels for others instead of publishing a broken reporting link.

Ruling: direct main changes, commit, push and deployment are explicitly authorised by the approved plan. Existing tests remain untouched.

Completed: homepage filtered, CI configured, Vercel Git project created with Node 24 and server-only credentials. Review found no significant issues. Main e58d777 passed GitHub CI and Vercel build; production homepage and both live routes returned HTTP 200. Final documentation closeout follows through the same automatic pipeline.
