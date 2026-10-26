import { defineConfig, devices } from "@playwright/test";
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "tests/e2e",
  outputDir: "test-results",
  use: { baseURL },
  webServer: {
    command: `pnpm dev --port ${new URL(baseURL).port || "3000"}`,
    url: baseURL,
    reuseExistingServer: true,
  },
  projects: [
    // Microsoft Edge is installed on this machine; Chrome is not.
    { name: "desktop", use: { ...devices["Desktop Edge"], channel: "msedge" } },
    { name: "mobile", use: { ...devices["Pixel 7"], channel: "msedge" } },
    { name: "tablet", testMatch: /url-dossier\.spec\.ts/, use: { ...devices["Desktop Edge"], channel: "msedge", viewport: { width: 768, height: 1024 } } },
  ],
});
