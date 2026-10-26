// Stands in for the `claude` CLI in tests. Never calls a model.
// FAKE_CLAUDE_SCRIPT: comma-separated fixture names (ok, bad-plan, auth-error), one per call, in order.
// FAKE_CLAUDE_STATE: file holding how many calls have been made so far.
// FAKE_CLAUDE_LOG: file each call's arguments are appended to, one JSON line per call.
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const here = dirname(fileURLToPath(import.meta.url));
const state = process.env.FAKE_CLAUDE_STATE;
const call = state && existsSync(state) ? Number(readFileSync(state, "utf8")) : 0;
if (state) writeFileSync(state, String(call + 1));
if (process.env.FAKE_CLAUDE_LOG) appendFileSync(process.env.FAKE_CLAUDE_LOG, `${JSON.stringify({ args, cwd: process.cwd() })}\n`);

if (args.includes("--version")) {
  process.stdout.write("2.1.310 (Claude Code)\n");
  process.exit(0);
}

const script = (process.env.FAKE_CLAUDE_SCRIPT || "ok").split(",");
const name = script[Math.min(call, script.length - 1)];
const flag = (f) => (args.includes(f) ? args[args.indexOf(f) + 1] : null);
const session = flag("--session-id") ?? flag("--resume") ?? "00000000-0000-4000-8000-000000000000";





const text = readFileSync(join(here, `stream-${name}.jsonl`), "utf8").replaceAll("SESSION", session);
process.stdout.write(text);
if (name === "auth-error") {
  process.stderr.write("Invalid API key · Please run /login\n");
  process.exit(1);
}
