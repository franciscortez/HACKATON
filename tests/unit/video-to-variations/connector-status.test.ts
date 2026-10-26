import { afterEach, describe, expect, it, vi } from "vitest";
import { join } from "node:path";
import { connectorStatus, supportedClaudeVersion } from "@/features/video-to-variations/services/connector-status";
import { pythonBin } from "@/features/video-to-variations/services/transcribe";
afterEach(() => vi.unstubAllEnvs());
describe("connector dependencies", () => {
  it("requires the Claude release that enforces read boundaries", () => {
    for (const v of ["1.99.999", "2.0.999", "2.1.309", "unknown"]) expect(supportedClaudeVersion(v)).toBe(false);
    for (const v of ["2.1.310 (Claude Code)", "2.2.0", "3.0.0"]) expect(supportedClaudeVersion(v)).toBe(true);
  });
  it("reports missing Claude independently of manual editing", async () => {
    vi.stubEnv("VIDEO_CLAUDE_BIN", "not-a-real-video-cli");
    const status = await connectorStatus();
    expect(status.providers.claude.ready).toBe(false);
    expect(status.providers.codex.ready).toBe(false);
    expect(status.manualEditing).toBe(true);
    expect(JSON.stringify(status)).not.toContain("VIDEO_CONNECTOR_SECRET");
  });
  it("honours an explicit Python installation", () => {
    vi.stubEnv("VIDEO_PYTHON", join("custom", "python"));
    expect(pythonBin()).toBe(join("custom", "python"));
  });
  it("reports unavailable video tools without blocking manual editing", async () => {
    vi.stubEnv("VIDEO_FFMPEG_BIN", "not-a-real-ffmpeg");
    vi.stubEnv("VIDEO_FFPROBE_BIN", "not-a-real-ffprobe");
    vi.stubEnv("VIDEO_CLAUDE_BIN", "not-a-real-video-cli");
    const status = await connectorStatus();
    expect(status.dependencies).toMatchObject({ ffmpeg: false, ffprobe: false, subtitles: false });
    expect(status.manualEditing).toBe(true);
  });
});
