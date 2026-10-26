import { describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/tools/[slug]/runs/route";
import { generateStructured } from "@/lib/ai/provider";
vi.mock("@/lib/ai/provider", () => ({ generateStructured: vi.fn(), availableProviders: () => [], ProviderError: class extends Error {} }));
const ctx = { params: Promise.resolve({ slug: "research-to-call-brief" }) };
const input = { companyUrl: "https://example.com", contact: "Priya", objective: "Explore automation", pastedText: "Example accounting in Geelong." };
const req = (body: object) => new Request("http://localhost/api/tools/research-to-call-brief/runs", { method: "POST", body: JSON.stringify(body) });
describe("call brief REST endpoint", () => {
  it("validates the input", async () => {
    const result = await POST(req({ clientId: "leveric", input: {} }), ctx);
    expect(result.status).toBe(400);
  });
  it("enforces the research-specific advisory run limit", async () => {
    const result = await POST(req({ clientId: "leveric", input, usedThisMonth: 20 }), ctx);
    expect(result.status).toBe(429);
  });
  it("returns a safe provider failure and research charges", async () => {
    vi.mocked(generateStructured).mockRejectedValueOnce(new Error("PRIVATE PROVIDER DATA"));
    const result = await POST(req({ clientId: "leveric", input }), ctx);
    const body = await result.json();
    expect(result.status).toBe(502);
    expect(body.error.research.costUsd).toBe(0);
    expect(JSON.stringify(body)).not.toContain("PRIVATE PROVIDER DATA");
  });
  it("accepts pasted source evidence without scraping and returns the existing response envelope", async () => {
    vi.mocked(generateStructured).mockResolvedValue({ object: { summary: "", services: [], audience: [], positioning: [], tone: [], opportunities: [], companyName: { text: "Example", sourceId: "s1", quote: "Example" }, city: null, industry: null, companyFacts: [], contactFacts: [], likelyNeeds: [], competitors: [], talkingPoints: ["How can we help?"], gaps: [] }, cost: { provider: "groq", model: "test", inputTokens: 10, outputTokens: 10, costUsd: 0, estPaidUsd: 0 } });
    const result = await POST(req({ clientId: "harbourside-accounting", input }), ctx);
    const body = await result.json();
    expect(result.status).toBe(201);
    expect(body.output.sources[0].origin).toBe("pasted");
    expect(body.cost.research.costUsd).toBe(0);
  });
});
