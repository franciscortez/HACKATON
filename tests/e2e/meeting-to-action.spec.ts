import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

/** The runs API is replaced by a recorded response, so this test never calls a model. */
const recorded = readFileSync("tests/fixtures/meeting-to-action/api-run-harbourside.json", "utf8");
const transcript = readFileSync("tests/fixtures/meeting-to-action/harbourside-partners.md", "utf8");
const status = (page: import("@playwright/test").Page) => page.getByText(/^(DRAFT|EDITED|APPROVED)$/);

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.clear());
  await page.route("**/api/tools/meeting-to-action/runs", (route) =>
    route.fulfill({ status: 201, contentType: "application/json", body: recorded }),
  );
});

test("source to approved export for a synthetic client", async ({ page }) => {
  await page.goto("/tools/meeting-to-action");
  await page.getByLabel("Client").selectOption("harbourside-accounting");
  await expect(page.getByText(/Synthetic demo client/i)).toBeVisible();

  await page.getByLabel("Transcript text").fill(transcript);
  await page.getByRole("button", { name: /Extract actions/ }).click();

  await expect(page.getByLabel("Action register").getByRole("listitem").first()).toBeVisible();
  await expect(status(page)).toHaveText("DRAFT");
  await expect(page.getByRole("button", { name: "Download CSV" })).toBeDisabled();
  await expect(page.getByText(/Runs 1 \/ 20/i)).toBeVisible();

  await page.getByLabel("Owner for task 1", { exact: true }).selectOption("Unassigned");
  await expect(status(page)).toHaveText("EDITED");

  await page.getByRole("button", { name: /Approve/ }).click();
  await expect(status(page)).toHaveText("APPROVED");

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download CSV" }).click();
  expect((await download).suggestedFilename()).toMatch(/^actions-.*\.csv$/);

  await page.getByLabel("Email subject").fill("Partners meeting actions");
  await expect(status(page)).toHaveText("EDITED");
  await expect(page.getByRole("button", { name: "Download CSV" })).toBeDisabled();
});

test("shows the error panel when every model fails", async ({ page }) => {
  await page.route("**/api/tools/meeting-to-action/runs", (route) =>
    route.fulfill({
      status: 502,
      contentType: "application/json",
      body: JSON.stringify({ error: { code: "providers_failed", message: "No model is available right now. Try again in a minute." } }),
    }),
  );
  await page.goto("/tools/meeting-to-action");
  await page.getByLabel("Transcript text").fill("Josh: Jaz, reply to Ruth by tomorrow night.");
  await page.getByRole("button", { name: /Extract actions/ }).click();
  await expect(page.getByText("No model is available right now. Try again in a minute.")).toBeVisible();
  await expect(page.getByRole("button", { name: /Try again/ })).toBeVisible();
});
