import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { localGate, resetGateCache } from "@/features/video-to-variations/services/local-gate";

const fake = join(process.cwd(), "tests", "fixtures", "video-to-variations", "fake-claude.mjs");

beforeEach(() => resetGateCache());
afterEach(() => {
  for (const k of ["VERCEL", "VIDEO_CLAUDE_BIN", "VIDEO_FFMPEG_BIN"]) delete process.env[k];
  resetGateCache();
});

describe("localGate", () => {
  it("is closed on Vercel (no local tools there)", async () => {
    process.env.VERCEL = "1";
    expect(await localGate()).toEqual({ ok: false, code: "local_only" });
  });

  it("names Claude Code when it is not installed", async () => {
    process.env.VIDEO_CLAUDE_BIN = "definitely-not-claude-xyz";
    expect(await localGate()).toEqual({ ok: false, code: "claude_missing" });
  });

  it("names FFmpeg when it is not installed", async () => {
    process.env.VIDEO_CLAUDE_BIN = fake;
    process.env.VIDEO_FFMPEG_BIN = "definitely-not-ffmpeg-xyz";
    expect(await localGate()).toEqual({ ok: false, code: "ffmpeg_missing" });
  });
});
