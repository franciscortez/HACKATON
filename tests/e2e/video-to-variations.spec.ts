import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";

/**
 * The editor flow needs ffmpeg, faster-whisper and the fake Claude CLI, so it runs only with VIDEO_E2E=1 and a dev
 * server started with VIDEO_CLAUDE_BIN pointing at tests/fixtures/video-to-variations/fake-claude.mjs. No model is called.
 */
const full = process.env.VIDEO_E2E === "1";

const SPEECH =
  "Most people edit their videos by hand and lose hours every week. " +
  "There is a faster way. Record yourself once, talk naturally, and do not worry about mistakes. " +
  "The editor cuts the pauses, adds captions that match your voice, and turns your recordings into a short video. " +
  "When you are happy, export a vertical video that is ready to post.";

function makeClips(): { talk: string; silent: string } {
  const dir = mkdtempSync(join(tmpdir(), "vtv-e2e-"));
  const wav = join(dir, "speech.wav");
  const ps = join(dir, "speak.ps1");
  writeFileSync(ps, `Add-Type -AssemblyName System.Speech; $s = New-Object System.Speech.Synthesis.SpeechSynthesizer; $s.Rate = -1; $s.SetOutputToWaveFile('${wav}'); $s.Speak('${SPEECH}'); $s.Dispose()`);
  execFileSync("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", ps]);
  const talk = join(dir, "talk.mp4");
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i", "testsrc2=size=1080x1920:rate=30:duration=30", "-i", wav, "-af", "apad", "-t", "30", "-c:v", "libx264", "-preset", "ultrafast", "-c:a", "aac", talk]);
  const silent = join(dir, "outfit.mp4");
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i", "testsrc2=size=1920x1080:rate=25:duration=12", "-c:v", "libx264", "-preset", "ultrafast", silent]);
  return { talk, silent };
}

const clips = (page: Page) => page.getByTestId("clip");

async function edit(page: Page): Promise<{ clips: { mediaId: string }[]; captions: { enabled: boolean; cards: { mediaId: string; text: string }[] } }> {
  const id = await page.evaluate(() => localStorage.getItem("vtv:lastProject"));
  return (await (await page.request.get(`/api/video-projects/${id}`)).json()).timeline;
}

async function download(page: Page, trigger: () => Promise<void>, dir: string, name: string): Promise<string> {
  const pending = page.waitForEvent("download", { timeout: 4 * 60_000 });
  await trigger();
  const file = join(dir, name);
  await (await pending).saveAs(file);
  return execFileSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", file]).toString().trim();
}

test("shows the local-only notice when this computer cannot run the tool", async ({ page }) => {
  await page.route("**/api/video-projects/health", (route) => route.fulfill({ status: 503, json: { error: { code: "local_only", message: "Local only" } } }));
  await page.goto("/tools/video-to-variations");
  await expect(page.getByText("This tool runs on a computer with Claude Code, FFmpeg and Python.")).toBeVisible();
});

test.describe("editor", () => {
  test.skip(!full, "Set VIDEO_E2E=1 with the fake Claude CLI to run the editor flow.");
  test.setTimeout(12 * 60_000);

  test("import two videos, hand edit, Claude edit, undo/redo and export both formats", async ({ page }, info) => {
    test.skip(info.project.name !== "desktop", "Renders are slow; one browser is enough.");
    const { talk, silent } = makeClips();
    const out = mkdtempSync(join(tmpdir(), "vtv-out-"));

    // Opens straight into an empty editor: no upload page.
    await page.goto("/tools/video-to-variations");
    await page.evaluate(() => localStorage.removeItem("vtv:lastProject"));
    await page.reload();
    await expect(page.getByText("Media · 0")).toBeVisible();
    await expect(page.getByText(/Import videos to start/)).toBeVisible();
    await expect(page.getByRole("button", { name: /Export 9:16/ })).toBeDisabled();
    await page.screenshot({ path: "tests/artifacts/video-editor-empty.png", fullPage: true });

    // Import two videos at once: both land on the timeline in order.
    await page.getByLabel("Import videos").setInputFiles([talk, silent]);
    await expect(page.getByTestId("media-item")).toHaveCount(2, { timeout: 5 * 60_000 });
    await expect(clips(page)).toHaveCount(2);
    expect((await edit(page)).clips.map((c) => c.mediaId)).toEqual(["m1", "m2"]);
    await expect(page.getByText(/no sound/).first()).toBeVisible();

    // Captions come from the talking video only.
    await page.getByRole("button", { name: "Captions off" }).click();
    await expect(page.getByTestId("caption-chip").first()).toBeVisible();
    await expect.poll(async () => (await edit(page)).captions.enabled).toBe(true);
    expect(new Set((await edit(page)).captions.cards.map((c) => c.mediaId))).toEqual(new Set(["m1"]));
    await page.getByTestId("caption-chip").first().click();
    await page.getByLabel("Caption", { exact: true }).fill("hello world");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByTestId("caption-chip").filter({ hasText: "hello world" })).toHaveCount(1);

    // Drag the second video in front of the first.
    const first = await clips(page).nth(0).boundingBox();
    const second = await clips(page).nth(1).boundingBox();
    await page.mouse.move(second!.x + second!.width / 2, second!.y + 20);
    await page.mouse.down();
    await page.mouse.move(first!.x + 5, first!.y + 20, { steps: 8 });
    await page.mouse.up();
    await expect.poll(async () => (await edit(page)).clips.map((c) => c.mediaId)).toEqual(["m2", "m1"]);

    // Split, delete, and add a video again from Media.
    for (let i = 0; i < 4; i++) await page.keyboard.press("Shift+ArrowRight");
    await page.getByRole("button", { name: "Split", exact: true }).click();
    await expect(clips(page)).toHaveCount(3);
    await clips(page).nth(0).click({ position: { x: 20, y: 20 } });
    await page.getByRole("button", { name: "Delete clip" }).click();
    await expect(clips(page)).toHaveCount(2);
    await page.getByRole("button", { name: "Add outfit.mp4 to the timeline" }).click();
    await expect(clips(page)).toHaveCount(3);
    await expect(page.getByText("EDITED")).toBeVisible();
    await expect.poll(async () => (await edit(page)).clips.length).toBe(3);
    await page.reload();
    await expect(clips(page)).toHaveCount(3);

    // Mark a range and ask Claude.
    await page.getByRole("button", { name: "Mark in" }).click();
    for (let i = 0; i < 3; i++) await page.keyboard.press("Shift+ArrowRight");
    await page.getByRole("button", { name: "Mark out" }).click();
    await page.getByLabel("Ask Claude to change the edit").fill("Cut the pauses and add captions");
    await page.getByRole("button", { name: /^Change 0:/ }).click();
    await expect(page.getByText("Cut the pauses and turned captions on.")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole("button", { name: "Changed 0:00.0–0:12.0" })).toBeVisible();
    await expect(page.getByTestId("caption-chip").filter({ hasText: "summer outfit" })).toHaveCount(1);
    await page.screenshot({ path: "tests/artifacts/video-editor-claude.png", fullPage: true });

    // Undo walks back to the hand edit; redo returns to Claude's version.
    await page.getByRole("button", { name: "Undo" }).click();
    await expect(page.getByText("Current")).toHaveCount(0);
    await page.getByRole("button", { name: "Redo" }).click();
    await expect(page.getByText("Current")).toBeVisible();

    // Export 9:16, then 16:9.
    expect(await download(page, () => page.getByRole("button", { name: /Export 9:16/ }).click(), out, "a.mp4")).toBe("1080,1920");
    await expect(page.getByText("APPROVED")).toBeVisible();
    await page.getByRole("radio", { name: "16:9 YouTube" }).click();
    expect(await download(page, () => page.getByRole("button", { name: /Export 16:9/ }).click(), out, "b.mp4")).toBe("1920,1080");

    // A new edit starts empty.
    await page.getByRole("button", { name: /New edit/ }).click();
    await expect(page.getByText("Media · 0")).toBeVisible();
    await expect(clips(page)).toHaveCount(0);
  });

  test("the editor fits a phone screen", async ({ page }, info) => {
    test.skip(info.project.name !== "mobile", "Phone layout check.");
    await page.goto("/tools/video-to-variations");
    await expect(page.getByText(/Media ·/)).toBeVisible({ timeout: 60_000 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    await page.screenshot({ path: "tests/artifacts/video-editor-375.png", fullPage: true });
  });
});
