import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";
const fixture = readFileSync("tests/fixtures/research-to-call-brief/dossier.json", "utf8");
const endpoint = "**/api/tools/research-to-call-brief/runs";
test.beforeEach(async ({ page }) => {
  await page.route(endpoint, route => route.fulfill({ status: 201, contentType: "application/json", body: fixture }));
  await page.goto("/tools/research-to-call-brief");
});
for (const client of ["leveric", "harbourside-accounting"]) test(`URL alone produces dossier and reviewed call sheet for ${client}`, async ({ page }) => {
  await page.getByLabel("Client", { exact: true }).selectOption(client);
  await page.getByLabel("Business URL", { exact: true }).fill("example.com");
  await page.getByRole("button", { name: "Research website", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Website brand", exact: true })).toBeVisible();
  await expect(page.getByText("Arial, sans-serif", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Edit dossier", exact: true }).click();
  await page.getByLabel("Business summary", { exact: true }).fill("Updated business summary");
  await expect(page.getByText("Call sheet needs rebuilding", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Rebuild call sheet", exact: true }).click();
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download dossier", exact: true }).click();
  expect((await download).suggestedFilename()).toBe("business-dossier.md");
  await page.getByRole("button", { name: "Edit call sheet", exact: true }).click();
  await page.getByLabel("Call opener", { exact: true }).fill("What matters most this month?");
  await expect(page.getByRole("button", { name: "Print / Save PDF", exact: true })).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
test("blocked research recovers completely with pasted text", async ({ page }) => {
  await page.route(endpoint, route => route.fulfill({ status: 502, contentType: "application/json", body: JSON.stringify({ error: { message: "Website blocked. Paste source text to continue." } }) }));
  await page.getByLabel("Business URL", { exact: true }).fill("example.com");
  await page.getByRole("button", { name: "Research website", exact: true }).click();
  await page.getByLabel("Pasted source text", { exact: true }).fill("Example Accounting is an accounting firm in Geelong.");
  await page.route(endpoint, route => route.fulfill({ status: 201, contentType: "application/json", body: fixture }));
  await page.getByRole("button", { name: "Research website", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Website brand", exact: true })).toBeVisible();
});
test("approved dossier call sheet fits one A4 page", async ({ page }) => {
  await page.getByLabel("Business URL", { exact: true }).fill("example.com");
  await page.getByRole("button", { name: "Research website", exact: true }).click();
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await page.emulateMedia({ media: "print" });
  const pdf = await page.pdf({ format: "A4", preferCSSPageSize: true });
  expect(pdf.toString("latin1").match(/\/Type\s*\/Page\b/g)).toHaveLength(1);
});
test("keyboard entry, persisted edits and client isolation survive reload", async ({ page }) => {
  const url = page.getByLabel("Business URL", { exact: true });
  await url.focus(); await url.fill("example.com"); await url.press("Enter");
  await expect(page.getByRole("heading", { name: "Website brand", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Edit dossier", exact: true }).click();
  await page.getByLabel("Business summary", { exact: true }).fill("Saved research notes");
  await page.getByLabel("Services and products 1", { exact: true }).fill("");
  await page.reload();
  await page.getByLabel("Previous research", { exact: true }).selectOption({ index: 1 });
  await expect(page.getByText("Saved research notes", { exact: true })).toBeVisible();
  await expect(page.getByText("Call sheet needs rebuilding", { exact: true })).toBeVisible();
  await page.getByLabel("Client", { exact: true }).selectOption("harbourside-accounting");
  await expect(page.getByText("Saved research notes", { exact: true })).toHaveCount(0);
});
test("cancelling a pending run ignores its eventual response", async ({ page }) => {
  let release = () => {}; const pending = new Promise<void>(resolve => { release = resolve; });
  await page.route(endpoint, async route => { await pending; await route.fulfill({ status: 201, contentType: "application/json", body: fixture }).catch(() => {}); });
  await page.getByLabel("Business URL", { exact: true }).fill("example.com");
  await page.getByRole("button", { name: "Research website", exact: true }).click();
  await page.getByRole("button", { name: "Cancel research", exact: true }).click();
  release();
  await expect(page.getByRole("alert").filter({ hasText: "Research cancelled" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Website brand", exact: true })).toHaveCount(0);
});
test("restores legacy saved reports without inventing branding", async ({ page }) => {
  const legacy = JSON.parse(readFileSync("tests/fixtures/research-to-call-brief/recorded.json", "utf8"));
  await page.evaluate(output => localStorage.setItem("workbench:runs:leveric", JSON.stringify([{ id: "old", toolSlug: "research-to-call-brief", createdAt: output.generatedAt, output, status: "DRAFT" }])), legacy.output);
  await page.reload(); await page.getByLabel("Previous research", { exact: true }).selectOption("old");
  await expect(page.getByLabel("Company fact 1", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Website brand", exact: true })).toHaveCount(0);
});
test("long call-sheet edits block printing rather than truncate", async ({ page }) => {
  await page.getByLabel("Business URL", { exact: true }).fill("example.com");
  await page.getByRole("button", { name: "Research website", exact: true }).click();
  await page.getByRole("button", { name: "Edit call sheet", exact: true }).click();
  await page.getByLabel("Call summary", { exact: true }).fill("a ".repeat(590));
  await page.getByRole("button", { name: "Approve", exact: true }).click();
  await expect(page.getByRole("button", { name: "Print / Save PDF", exact: true })).toBeDisabled();
  await expect(page.getByLabel("Call summary", { exact: true })).toHaveValue("a ".repeat(590));
});
