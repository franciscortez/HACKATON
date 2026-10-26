import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "tests/e2e", testMatch: "video-connector.spec.ts", workers: 1,
  timeout: 8 * 60_000, outputDir: "test-results/connector",
  use: { ...devices["Desktop Edge"], channel: "msedge", trace: "retain-on-failure" },
});
