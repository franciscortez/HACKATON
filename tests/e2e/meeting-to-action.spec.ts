import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

/** The runs API is replaced by a recorded, streamed response, so this test never calls a model. */
const recorded = JSON.parse(readFileSync("tests/fixtures/meeting-to-action/api-run-harbourside.json", "utf8"));
const transcript = readFileSync("tests/fixtures/meeting-to-action/harbourside-partners.md", "utf8");
const ndjson = (...events: object[]) => events.map((e) => JSON.stringify(e)).join("\n") + "\n";
const status = (page: Page) => page.getByText(/^(DRAFT|EDITED|APPROVED)$/);

test.beforeEach(async ({ page }) => {
  await page.route("**/api/tools/meeting-to-action/runs", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/x-ndjson",
      body: ndjson(
        { type: "progress", done: 0, total: 2, label: "Reading the transcript" },
        { type: "progress", done: 1, total: 2, label: "Drafting the follow-up email" },
        { type: "result", ...recorded },
      ),
    }),
  );
});

test("any transcript to an approved export", async ({ page }) => {
  await page.goto("/tools/meeting-to-action");
  await expect(page.getByText("How it works")).toBeVisible();

  await page.getByLabel("Transcript text").fill(transcript);
  await expect(page.getByText("Transcript check")).toBeVisible();
  await page.getByRole("button", { name: /Extract actions/ }).click();

  // The result replaces the source form.
  await expect(page.getByLabel("Action register").getByRole("listitem").first()).toBeVisible();
  await expect(page.getByLabel("Transcript text")).toBeHidden();
  await expect(status(page)).toHaveText("DRAFT");
  await expect(page.getByRole("button", { name: "Download CSV" })).toBeDisabled();

  await page.getByLabel("Owner for task 1", { exact: true }).selectOption("Unassigned");
  await expect(status(page)).toHaveText("EDITED");

  await page.getByRole("button", { name: /Approve/ }).click();
  await expect(status(page)).toHaveText("APPROVED");

  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download CSV" }).click();
  expect((await download).suggestedFilename()).toMatch(/^actions-.*\.csv$/);

  await page.getByLabel("Email subject").fill("Partners meeting actions");
  await expect(status(page)).toHaveText("EDITED");

  // Start again brings back an empty source form.
  await page.getByRole("button", { name: /New transcript/ }).click();
  await expect(page.getByLabel("Transcript text")).toHaveValue("");
});

test("a failed run shows a plain message, never model output", async ({ page }) => {
  await page.route("**/api/tools/meeting-to-action/runs", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/x-ndjson",
      body: ndjson({ type: "error", code: "providers_failed", message: "We couldn't finish reading this transcript. Please try again in a minute." }),
    }),
  );
  await page.goto("/tools/meeting-to-action");
  await page.getByLabel("Transcript text").fill("Sam: Alex, send the proposal by Friday.");
  await page.getByRole("button", { name: /Extract actions/ }).click();
  await expect(page.getByText("We couldn't finish reading this transcript. Please try again in a minute.")).toBeVisible();
  await expect(page.getByText(/raw model text/i)).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Try again/ })).toBeVisible();
  await expect(page.getByLabel("Transcript text")).toHaveValue("Sam: Alex, send the proposal by Friday.");
});
