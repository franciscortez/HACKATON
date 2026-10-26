import { expect, test } from "vitest";
import { browserInput, parseBrowserPages } from "@/services/research/browser";
import { runInNewContext } from "node:vm";
import * as net from "node:net";
import { vi } from "vitest";
test("guard runs in Apify's VM without dynamic imports and blocks private DNS and POST", async () => {
  let handler: (event: unknown) => Promise<void> = async () => {};
  const send = vi.fn(async () => {});
  const page = { context: () => ({ newCDPSession: async () => ({ send, on: (_: string, callback: typeof handler) => { handler = callback; } }) }), routeWebSocket: async () => {} };
  const hooks = runInNewContext(browserInput("https://example.com").preNavigationHooks, { URL, process: { getBuiltinModule: (name: string) => name === "node:net" ? net : { promises: { lookup: async () => [{ address: "127.0.0.1", family: 4 }] } } } });
  await hooks[0]({ page });
  await handler({ requestId: "r1", request: { url: "https://private.example.com", method: "GET" }, resourceType: "Document" });
  expect(send).toHaveBeenCalledWith("Fetch.failRequest", { requestId: "r1", errorReason: "BlockedByClient" });
  expect(send).not.toHaveBeenCalledWith("Fetch.continueRequest", expect.anything());
});
test("browser research is bounded and contains a pre-navigation guard", () => {
  const input = browserInput("https://example.com/");
  expect(input).toMatchObject({ maxPagesPerCrawl: 6, maxConcurrency: 1, maxRequestRetries: 0, launcher: "chromium" });
  expect(input.preNavigationHooks).toContain("route");
  expect(input.preNavigationHooks).toContain("setBypassServiceWorker");
  expect(input.pageFunction).toContain("getComputedStyle");
});
test("browser records retain provenance, clamp text and reject unsafe styling", async () => {
  const items = [{ url: "https://example.com/", title: "Example", text: "a".repeat(50000), brand: { colors: [{ value: "rgb(255, 255, 255)", selector: "body", role: "background" }, { value: "url(javascript:evil)", selector: "h1", role: "text" }], fonts: [{ value: "Arial", selector: "body", role: "body" }] } }];
  const result = await parseBrowserPages(items, new Date("2026-10-26"), async url => url);
  expect(result.sources[0].text.length).toBeLessThanOrEqual(12000);
  expect(result.brand.colors).toHaveLength(1);
  expect(result.brand.colors[0].sourceId).toBe("s1");
  expect(result.gaps.join(" ")).toMatch(/truncat|limit/i);
});
