import { test, expect } from "@playwright/test";
import { spawn, execFileSync, type ChildProcess } from "node:child_process";
import { mkdtempSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

test.skip(process.env.CONNECTOR_E2E !== "1", "Build with NEXT_PUBLIC_VIDEO_CONNECTOR_ENABLED=1 and set CONNECTOR_E2E=1.");
const origin = "https://leveric-workbench.vercel.app";
const port = 43129;
const endpoint = `http://127.0.0.1:${port}`;
let connector: ChildProcess;
let code = "";
let dir: string;
let first: string;
let second: string;
test.beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), "leveric-connector-e2e-"));
  first = join(dir, "first.mp4"); second = join(dir, "silent.mp4");
  for (const [file, shape, seconds] of [[first, "360x640", "22"], [second, "640x360", "12"]]) {
    execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-f", "lavfi", "-i", `testsrc2=size=${shape}:rate=30:duration=${seconds}`, "-c:v", "libx264", "-preset", "ultrafast", file]);
  }
  let output = "";
  connector = spawn(process.execPath, ["src/features/video-to-variations/scripts/connector.mjs", "start"], {
    cwd: process.cwd(), windowsHide: true, env: { ...process.env, VERCEL: "", VIDEO_CONNECTOR_PORT: String(port), VIDEO_WORKSPACE: join(dir, "workspace"), VIDEO_CLAUDE_BIN: join(process.cwd(), "tests/fixtures/video-to-variations/fake-claude.mjs") }, stdio: ["ignore", "pipe", "pipe"],
  });
  connector.stdout!.on("data", (chunk) => { output += chunk.toString(); code = /expires in 10 minutes\):\s*([a-f0-9]{64})/.exec(output)?.[1] ?? ""; });
  connector.stderr!.on("data", () => {});
  await expect.poll(async () => {
    if (connector.exitCode !== null) throw new Error(`Connector exited ${connector.exitCode}. ${output.replace(/[a-f0-9]{64}/g, "[redacted]")}`);
    return code && await fetch(`${endpoint}/api/video-connector/health`).then((r) => r.ok, () => false);
  }, { timeout: 90_000 }).toBeTruthy();
});
test.afterAll(async () => {
  if (connector?.pid && connector.exitCode === null) {
    if (process.platform === "win32") execFileSync("taskkill", ["/PID", String(connector.pid), "/T", "/F"], { stdio: "ignore" });
    else connector.kill("SIGTERM");
  }
});

test("hosted-origin pairing, editing, seeking, export and revocation", async ({ page, context }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  // Serve this branch's built UI at the production origin without changing the deployed site.
  await page.route(`${origin}/**`, async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.startsWith("/api/")) {
      await route.fulfill({ status: 503, json: { error: { code: "local_only", message: "Connect your computer to edit here." } } }); return;
    }
    const headers = { ...route.request().headers() }; delete headers.host; delete headers.origin; delete headers.cookie;
    const response = await route.fetch({ url: endpoint + new URL(route.request().url()).pathname + new URL(route.request().url()).search, headers });
    await route.fulfill({ response });
  });
  await page.goto(`${origin}/tools/video-to-variations`);
  await expect(page.getByRole("heading", { name: "Connect your computer" })).toBeVisible();
  await page.setViewportSize({ width: 375, height: 812 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.setViewportSize({ width: 1440, height: 1000 });
  const cdp = await context.newCDPSession(page);
  const { targetInfo } = await cdp.send("Target.getTargetInfo");
  try { await cdp.send("Browser.setPermission", { permission: { name: "loopback-network" }, setting: "granted", origin, browserContextId: targetInfo.browserContextId }); }
  catch { await context.grantPermissions(["local-network-access"], { origin }); }
  await page.getByLabel("Port", { exact: true }).fill(String(port));
  await page.getByLabel("Pairing code").fill(code);
  await page.getByRole("button", { name: "Connect", exact: true }).click();
  await expect(page.getByText("Media · 0")).toBeVisible({ timeout: 60_000 });
  await expect(page.getByText("Computer connected · Claude Code ready")).toBeVisible();
  await page.getByLabel("Import videos").setInputFiles([first, second]);
  await expect(page.getByTestId("media-item")).toHaveCount(2, { timeout: 180_000 });
  const video = page.getByRole("region", { name: "Preview" }).locator("video").first();
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.readyState)).toBeGreaterThanOrEqual(2);
  await video.evaluate((v: HTMLVideoElement) => { v.currentTime = 5; });
  await expect.poll(() => video.evaluate((v: HTMLVideoElement) => v.currentTime)).toBeGreaterThanOrEqual(4.9);
  await page.getByLabel("Ask Claude to change the edit").fill("Cut the pauses and add captions");
  await page.getByRole("button", { name: /Send/ }).click();
  await expect(page.getByText("Cut the pauses and turned captions on.")).toBeVisible({ timeout: 60_000 });
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await page.getByRole("button", { name: "Redo", exact: true }).click();
  const download = page.waitForEvent("download", { timeout: 180_000 });
  await page.getByRole("button", { name: /Export 9:16/ }).click();
  const output = join(dir, "export.mp4"); await (await download).saveAs(output);
  expect(execFileSync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0", output]).toString().trim()).toBe("1080,1920");
  const root = join(dir, "workspace");
  const projectId = readdirSync(root).find((n) => /^[a-f0-9-]{36}$/.test(n))!;
  const jobs = join(root, projectId, "jobs");
  const exported = readdirSync(jobs).filter((n) => n.endsWith(".json") && !n.includes(".timeline.")).map((n) => JSON.parse(readFileSync(join(jobs, n), "utf8"))).find((op) => op.kind === "export");
  // Simulate losing the final export response while its operation ID remains recoverable.
  await page.evaluate(({ projectId, operationId }) => {
    const session = JSON.parse(sessionStorage.getItem("vtv:connector")!);
    sessionStorage.setItem(`vtv:pending:${session.connectorId}:${projectId}`, operationId);
  }, { projectId, operationId: exported.id });
  await page.reload();
  await expect(page.getByTestId("media-item")).toHaveCount(2, { timeout: 60_000 });
  await expect(page.getByRole("link", { name: "Download again" })).toBeVisible({ timeout: 15_000 });
  mkdirSync("tests/artifacts", { recursive: true });
  await page.screenshot({ path: "tests/artifacts/connector-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 375, height: 812 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: "tests/artifacts/connector-mobile.png", fullPage: true });
  await page.getByRole("button", { name: "Disconnect", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Connect your computer" })).toBeVisible();
  expect(errors).toEqual([]);
});
