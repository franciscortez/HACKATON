import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ClaudeUnavailableError, buildClaudeArgs, runClaude } from "@/features/video-to-variations/services/claude-cli";

const fake = join(process.cwd(), "tests", "fixtures", "video-to-variations", "fake-claude.mjs");

afterEach(() => {
  delete process.env.VIDEO_CLAUDE_BIN;
  delete process.env.FAKE_CLAUDE_SCRIPT;
});

describe("buildClaudeArgs", () => {
  const base = { prompt: "Edit it", model: "opus" as const, sessionId: "11111111-2222-4333-8444-555555555555", schema: "{}", systemPath: "system.md" };

  it("runs headless with structured output, read-only tools and no user settings", () => {
    const args = buildClaudeArgs({ ...base, resume: false });
    expect(args.slice(0, 2)).toEqual(["-p", "Edit it"]);
    expect(args.join(" ")).toContain("--output-format stream-json --verbose");
    expect(args.join(" ")).toContain("--json-schema {}");
    expect(args.join(" ")).toContain("--model opus");
    expect(args.join(" ")).toContain("--tools Read,Glob");
    expect(args.join(" ")).toContain("--setting-sources project");
    expect(args).toContain("--strict-mcp-config");
    expect(args).toContain("--disable-slash-commands");
    expect(args.join(" ")).toContain("--append-system-prompt-file system.md");
    expect(args.join(" ")).toContain(`--session-id ${base.sessionId}`);
    expect(args).not.toContain("--bare");
  });

  it("resumes the short's session for later edits", () => {
    const args = buildClaudeArgs({ ...base, resume: true });
    expect(args.join(" ")).toContain(`--resume ${base.sessionId}`);
    expect(args).not.toContain("--session-id");
  });
});

describe("runClaude", () => {
  it("returns the structured output and session id, and reports what Claude reads", async () => {
    process.env.VIDEO_CLAUDE_BIN = fake;
    process.env.FAKE_CLAUDE_SCRIPT = "ok";
    const events: string[] = [];
    const out = await runClaude(["-p", "x", "--session-id", "abc"], process.cwd(), (e) => events.push(e.label));
    expect(out.sessionId).toBe("abc");
    expect(out.structured).toMatchObject({ summary: "Cut the pauses and turned captions on." });
    expect(events).toContain("Reading v001.json");
  });

  it("raises ClaudeUnavailableError with the CLI's message when it fails", async () => {
    process.env.VIDEO_CLAUDE_BIN = fake;
    process.env.FAKE_CLAUDE_SCRIPT = "auth-error";
    await expect(runClaude(["-p", "x"], process.cwd(), () => {})).rejects.toThrow(ClaudeUnavailableError);
    await expect(runClaude(["-p", "x"], process.cwd(), () => {})).rejects.toThrow(/Please run \/login/);
  });

  it("raises ClaudeUnavailableError when the CLI is not installed", async () => {
    process.env.VIDEO_CLAUDE_BIN = "definitely-not-claude-xyz";
    await expect(runClaude(["-p", "x"], process.cwd(), () => {})).rejects.toThrow(ClaudeUnavailableError);
  });
});
