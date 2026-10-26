import { describe, expect, it, vi } from "vitest";
import { ApifySession } from "@/services/research/apify";
import { ResearchCollection } from "@/services/research/collect";
describe("bounded regional research", () => {
  it("extracts RAG browser pages using their search-result URL", async () => {
    const collection = new ResearchCollection(new ApifySession({ token: "test", maxUsd: 0.1 }), new Date(), async url => url);
    await collection.addPages([{ searchResult: { url: "https://example.com", title: "Company" }, markdown: "Company facts" }], 1);
    expect(collection.sources[0].url).toBe("https://example.com");
  });
  it("uses explicit country/city queries and fetches at most three supplementary pages", async () => {
    const session = new ApifySession({ token: "test", maxUsd: 0.1 });
    const execute = vi.spyOn(session, "execute").mockResolvedValue([]);
    const collection = new ResearchCollection(session, new Date(), async url => url);
    await collection.additional({ company: "Example", companyUrl: "https://example.com", contact: "Priya Shah", city: "Geelong", industry: "accounting", country: "au" }, { search: 0.02, pages: 0.03 });
    expect(execute.mock.calls.map(call => call[0])).toEqual(["apify/rag-web-browser", "apify/rag-web-browser"]);
    expect(execute.mock.calls[0][1]).toMatchObject({ maxResults: 1 });
    expect(execute.mock.calls[1][1]).toMatchObject({ maxResults: 2, query: expect.stringContaining("Geelong") });
    expect(execute.mock.calls[1][1]).toMatchObject({ query: expect.stringContaining("Australia") });
  });
  it("does not search for competitors when the city is unknown", async () => {
    const session = new ApifySession({ token: "test", maxUsd: 0.1 });
    const execute = vi.spyOn(session, "execute").mockResolvedValue([]);
    const collection = new ResearchCollection(session, new Date(), async url => url);
    await collection.additional({ company: "Example", companyUrl: "https://example.com", contact: "Priya Shah", city: null, industry: "accounting", country: "nz" }, { search: 0.02, pages: 0.03 });
    expect(execute).toHaveBeenCalledTimes(1);
    expect(collection.gaps.join(" ")).toMatch(/skipped/i);
  });
});
