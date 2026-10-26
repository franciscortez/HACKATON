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
test("legacy cited brief, edit, approval and export", async ({ page }) => {
  await page.goto(path);
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
  await page.getByText("Paste source text instead",{exact:true}).click();
  await expect(page.getByLabel("Pasted source text", { exact: true })).toBeVisible();
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
