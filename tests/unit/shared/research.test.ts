import { describe, expect, it, vi } from "vitest";
import { clientSchema } from "@/schemas/client.schema";
import leveric from "@/data/clients/leveric.json";
import { publicUrl } from "@/services/research/url";
import { ApifySession } from "@/services/research/apify";

describe("research configuration and URL boundary", () => {
  it("keeps explicit budget settings and rejects budgets above the approved ceiling", () => {
    const config = { ...leveric, tools: { "research-to-call-brief": { enabled: true, maxRunUsd: 0.1, runsPerMonth: 20 } } };
    expect(clientSchema.parse(config).tools?.["research-to-call-brief"]?.maxRunUsd).toBe(0.1);
    expect(clientSchema.safeParse({ ...config, tools: { "research-to-call-brief": { enabled: true, maxRunUsd: 10, runsPerMonth: 20 } } }).success).toBe(false);
  });
  it.each(["http://localhost", "http://127.0.0.1", "http://10.0.0.1", "http://169.254.169.254", "http://[::1]", "file:///etc/passwd", "https://user:pass@example.com", "https://example.local", "http://2130706433"])("rejects unsafe URL %s", async url => {
    await expect(publicUrl(url)).rejects.toThrow();
  });
  it("rejects domains resolving to private addresses", async () => {
    await expect(publicUrl("https://example.com", async () => [{ address: "192.168.1.2", family: 4 }])).rejects.toThrow();
  });
  it("accepts a public URL and removes fragments", async () => {
    expect(await publicUrl("https://example.com/about#team", async () => [{ address: "93.184.216.34", family: 4 }])).toBe("https://example.com/about");
  });
});

describe("Apify run lifecycle", () => {
  const run = { id: "run-1", status: "SUCCEEDED", defaultDatasetId: "dataset-1", usageTotalUsd: 0.01 };
  it("applies a platform cap, retrieves the existing dataset and reports cost", async () => {
    const fetcher = vi.fn<typeof fetch>();
    fetcher.mockResolvedValueOnce(Response.json({ data: run })).mockResolvedValueOnce(Response.json([{ markdown: "Evidence" }]));
    const session = new ApifySession({ token: "test", maxUsd: 0.1, fetcher });
    expect(await session.execute("apify/website-content-crawler", {}, 0.05)).toEqual([{ markdown: "Evidence" }]);
    expect(String(fetcher.mock.calls[0][0])).toContain("maxTotalChargeUsd=0.05");
    expect(session.usage()).toMatchObject({ costUsd: 0.01, runIds: ["run-1"] });
  });
  it("includes pay-per-event search charges rather than only platform usage", async () => {
    const fetcher = vi.fn<typeof fetch>();
    fetcher.mockResolvedValueOnce(Response.json({ data: { ...run, usageTotalUsd: 0.0018, chargedEventCounts: { search: 1, "apify-actor-start": 8 }, pricingInfo: { pricingModel: "PAY_PER_EVENT", pricingPerEvent: { actorChargeEvents: { search: { eventPriceUsd: 0.00348 }, "apify-actor-start": { eventPriceUsd: 0.000225 } } } } } })).mockResolvedValueOnce(Response.json([]));
    const session = new ApifySession({ token: "test", maxUsd: 0.1, fetcher });
    await session.execute("apify/rag-web-browser", {}, 0.02);
    expect(session.usage().costUsd).toBe(0.00528);
  });
  it("rejects cumulative reservations over the cap before starting another Actor", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(Response.json({ data: run }));
    const session = new ApifySession({ token: "test", maxUsd: 0.1, fetcher });
    await expect(session.execute("apify/website-content-crawler", {}, 0.11)).rejects.toThrow(/budget/i);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("sends monetary allocations without floating-point artifacts", async () => {
    const fetcher = vi.fn<typeof fetch>();
    fetcher.mockResolvedValueOnce(Response.json({ data: run })).mockResolvedValueOnce(Response.json([]));
    const session = new ApifySession({ token: "test", maxUsd: 0.1, fetcher });
    await session.execute("apify/rag-web-browser", {}, 0.1 * 0.2);
    expect(new URL(String(fetcher.mock.calls[0][0])).searchParams.get("maxTotalChargeUsd")).toBe("0.02");
  });
  it("never retries an ambiguous failed start and reports the reserved amount", async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new Error("network"));
    const session = new ApifySession({ token: "test", maxUsd: 0.1, fetcher });
    await expect(session.execute("apify/website-content-crawler", {}, 0.05)).rejects.toThrow();
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(session.usage()).toMatchObject({ costUsd: null, reservedUsd: 0.05 });
  });
  it("does not start an Actor when already cancelled", async () => {
    const fetcher = vi.fn<typeof fetch>();
    fetcher.mockResolvedValueOnce(Response.json({ data: { ...run, status: "RUNNING" } }));
    fetcher.mockResolvedValueOnce(Response.json({ data: { ...run, status: "ABORTED" } }));
    const signal = AbortSignal.abort();
    const session = new ApifySession({ token: "test", maxUsd: 0.1, fetcher, signal });
    await expect(session.execute("apify/website-content-crawler", {}, 0.05)).rejects.toThrow();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("aborts an already-started Actor without restarting billable work", async () => {
    const cancel = new AbortController();
    const fetcher = vi.fn<typeof fetch>();
    fetcher.mockImplementationOnce(async () => { cancel.abort(); return Response.json({ data: { ...run, status: "RUNNING" } }); });
    fetcher.mockResolvedValueOnce(Response.json({ data: { ...run, status: "ABORTED" } }));
    const session = new ApifySession({ token: "test", maxUsd: 0.1, fetcher, signal: cancel.signal });
    await expect(session.execute("apify/website-content-crawler", {}, 0.05)).rejects.toThrow();
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(String(fetcher.mock.calls[1][0])).toContain("actor-runs/run-1/abort");
    expect(session.usage().costUsd).toBe(0.01);
  });
});

