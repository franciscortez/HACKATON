import { chromium, expect, test } from "@playwright/test";
import { runInNewContext } from "node:vm";
import { browserGuard, browserPage } from "../../src/services/research/browser-script";
test("extracts rendered HTML and does not mistake a partner logo for the business", async ({ page }) => {
  await page.route("https://example.com/**", route => route.fulfill({ contentType: "text/html", body: `<html><head><title>North Studio</title><style>body{opacity:0;font-family:Arial;background:rgb(250,250,250);color:rgb(20,20,20)}h1{font-family:Georgia}svg{width:140px;height:40px}</style></head><body><header><a href="/"><svg aria-label="North Studio"><title>North Studio</title><rect width="140" height="40" fill="black" /></svg></a></header><main><h1>Design for local businesses</h1><p id="rendered"></p><img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E" class="partner-logo" alt="Notion" width="80" height="40"><a href="/services">Our services</a><a href="https://other.example.com/about">External</a><script>setTimeout(()=>document.body.style.opacity='1',400);document.getElementById('rendered').textContent='We build useful websites.';</script></main></body></html>` }));
  await page.goto("https://example.com/");
  const execute = runInNewContext(`(${browserPage})`, { URL });
  const enqueued: string[] = [];
  const output = await execute({ page, request: { userData: { initial: true } }, customData: { startUrl: "https://example.com/" }, enqueueRequest: async (r: { url: string }) => enqueued.push(r.url), setValue: async () => { expect(await page.locator("body").evaluate(e => getComputedStyle(e).opacity)).toBe("1"); } });
  expect(output.text).toContain("We build useful websites.");
  expect(output.brand.logo.value).toBe("North Studio");
  expect(output.brand.fonts.some((f: { value: string }) => f.value.includes("Georgia"))).toBe(true);
  expect(enqueued).toEqual(["https://example.com/services"]);
  expect(output.previewKey).toBe("brand-home");
});


test("guards redirected documents and subresources before private requests reach the server", async ({}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop", "Chromium network boundary is viewport-independent");
  const { createServer } = await import("node:http");
  const net = await import("node:net");
  let privateHits = 0, publicHits = 0;
  const server = createServer((req, res) => {
    if (req.url?.startsWith("/private")) { privateHits++; res.end("private"); }
    else if (req.url === "/document" || req.url === "/asset") { publicHits++; res.writeHead(302, { Location: "http://127.0.0.1/private" }); res.end(); }
    else { res.setHeader("Content-Type", "text/html"); res.end('<h1>Public site</h1><img src="/asset">'); }
  });
  await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(80, "127.0.0.1", resolve); });
  const browser = await chromium.launch({ channel: "msedge", args: ["--host-resolver-rules=MAP public.example.com 127.0.0.1", "--no-proxy-server"] });
  try {
    const page = await browser.newPage();
    const hooks = runInNewContext(browserGuard, { URL, process: { getBuiltinModule: (name: string) => name === "node:net" ? net : { promises: { lookup: async () => [{ address: "93.184.216.34", family: 4 }] } } } });
    await hooks[0]({ page });
    await page.goto("http://public.example.com/document").catch(() => {});
    const assetPage = await browser.newPage();
    await hooks[0]({ page: assetPage });
    await assetPage.goto("http://public.example.com/", { waitUntil: "networkidle" });
    expect(publicHits).toBe(2);
    expect(privateHits).toBe(0);
  } finally { await browser.close(); await new Promise<void>(resolve => server.close(() => resolve())); }
});
