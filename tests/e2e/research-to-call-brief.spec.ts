import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
const recorded = readFileSync("tests/fixtures/research-to-call-brief/recorded.json", "utf8");
const path = "/tools/research-to-call-brief";
async function fill(page: import("@playwright/test").Page) {
  await page.getByLabel("Business URL", { exact: true }).fill("https://example.com");
}
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.route("**/api/tools/research-to-call-brief/runs", route => route.fulfill({ status: 201, contentType: "application/json", body: recorded }));
});
for (const client of ["leveric", "harbourside-accounting"]) test(`cited brief, edit, approval and export for ${client}`, async ({ page }) => {
  await page.goto(path);
  await page.getByLabel("Client", { exact: true }).selectOption(client);
  await fill(page);
  await page.getByRole("button", { name: "Research website", exact: true }).click();
  await expect(page.getByLabel("Company fact 1", { exact: true })).toHaveValue("Founded in 2008");
  await expect(page.getByRole("button", { name: "Download Markdown", exact: true })).toBeDisabled();
  await page.getByLabel("Company fact 1", { exact: true }).fill("Established in 2008");
  await expect(page.getByText("EDITED", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: /^Approve/ }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download Markdown", exact: true }).click();
  expect((await download).suggestedFilename()).toBe("call-brief.md");
  await expect(page.getByRole("button", { name: "Print / Save PDF", exact: true })).toBeEnabled();
  await page.getByLabel("Talking point 1", { exact: true }).fill("What slows onboarding down?");
  await expect(page.getByRole("button", { name: "Print / Save PDF", exact: true })).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test("blocked website offers pasted-source recovery", async ({ page }) => {
  await page.route("**/api/tools/research-to-call-brief/runs", route => route.fulfill({ status: 502, contentType: "application/json", body: JSON.stringify({ error: { code: "source_empty", message: "No readable source text was found. Paste source text to continue." } }) }));
  await page.goto(path); await fill(page);
  await page.getByRole("button", { name: "Research website", exact: true }).click();
  await expect(page.getByText("No readable source text was found. Paste source text to continue.")).toBeVisible();
  await expect(page.getByLabel("Pasted source text", { exact: true })).toBeVisible();
});
test("switching clients hides the previous result", async ({ page }) => {
  await page.goto(path); await fill(page);
  await page.getByRole("button", { name: "Research website", exact: true }).click();
  await expect(page.getByLabel("Company fact 1", { exact: true })).toBeVisible();
  await page.getByLabel("Client", { exact: true }).selectOption("harbourside-accounting");
  await expect(page.getByLabel("Company fact 1", { exact: true })).toHaveCount(0);
});

test("client switch while a run is pending never displays the old result", async ({ page }) => {
  let release = () => {};
  const pending = new Promise<void>(resolve => { release = resolve; });
  await page.route("**/api/tools/research-to-call-brief/runs", async route => {
    await pending;
    await route.fulfill({ status: 201, contentType: "application/json", body: recorded }).catch(() => {});
  });
  await page.goto(path); await fill(page);
  const request = page.waitForRequest("**/api/tools/research-to-call-brief/runs");
  await page.getByRole("button", { name: "Research website", exact: true }).click(); await request;
  await page.getByLabel("Client", { exact: true }).selectOption("harbourside-accounting");
  release();
  await expect(page.getByLabel("Business URL", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Company fact 1", { exact: true })).toHaveCount(0);
});

test("approved brief prints on one A4 page without expanded evidence", async ({ page }) => {
  await page.goto(path); await fill(page);
  await page.getByRole("button", { name: "Research website", exact: true }).click();
  await page.getByRole("button", { name: /^Approve/ }).click();
  const print = page.locator(".call-brief-print");
  await page.emulateMedia({ media: "print" });
  await expect(print).toBeVisible();
  await expect(page.getByLabel("Business research source")).toBeHidden();
  const pdf = await page.pdf({ format: "A4", preferCSSPageSize: true, path: `tests/artifacts/call-brief-${test.info().project.name}.pdf` });
  expect(pdf.toString("latin1").match(/\/Type\s*\/Page\b/g)).toHaveLength(1);
});
