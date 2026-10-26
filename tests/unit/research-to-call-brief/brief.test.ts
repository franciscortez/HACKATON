import { describe, expect, it } from "vitest";
import { briefSchema, inputSchema, outputSchema } from "@/features/research-to-call-brief/schemas/brief.schema";
import recorded from "../../fixtures/research-to-call-brief/recorded.json";
import { checkBrief, checkContact, coreWordCount, toMarkdown } from "@/features/research-to-call-brief/services/brief";
import type { ResearchSource } from "@/services/research/types";

const sources: ResearchSource[] = [{ id: "s1", url: "https://example.com/", title: "Example", text: "Example is an accounting firm in Geelong. Founded in 2008. Priya is our director.", fetchedAt: "2026-10-26", origin: "web" }];
const fact = { text: "Founded in 2008", sourceId: "s1", quote: "Founded in 2008." };
const output = () => briefSchema.parse({ companyName: { ...fact, text: "Example", quote: "Example" }, city: { ...fact, text: "Geelong", quote: "Geelong" }, industry: { ...fact, text: "accounting", quote: "accounting" }, companyFacts: [fact], contactFacts: [], likelyNeeds: [{ text: "Discuss workflow automation", sourceIds: ["s1"] }], competitors: [], talkingPoints: ["How do you organise client onboarding?"], gaps: [] });

describe("call brief", () => {
  it("keeps the synthetic golden brief grounded and within one page", () => {
    const golden = outputSchema.parse(recorded.output);
    const checked = checkContact(checkBrief(golden, golden.sources), golden.sources, "Priya Shah", "https://example.com");
    expect(checked.companyName?.text).toBe("Example Accounting");
    expect(checked.companyFacts[0].text).toBe("Founded in 2008");
    expect(checked.contactFacts[0].text).toBe("Priya Shah leads the team");
    expect(checked.competitors[0].name).toBe("Bay Accounting");
    expect(coreWordCount(checked, golden.objective)).toBeLessThanOrEqual(550);
  });
  it("requires only a URL; bounds optional context and pasted sources", () => {
    expect(inputSchema.safeParse({ companyUrl: "https://example.com", contact: "Priya", objective: "Explore automation" }).success).toBe(true);
    expect(inputSchema.safeParse({ companyUrl: "https://example.com", contact: "", objective: "" }).success).toBe(true);
    expect(inputSchema.safeParse({ companyUrl: "javascript:alert(1)", contact: "Priya", objective: "Explore" }).success).toBe(false);
    expect(inputSchema.safeParse({ companyUrl: "https://user:password@example.com", contact: "Priya", objective: "Explore" }).success).toBe(false);
    expect(inputSchema.safeParse({ companyUrl: "https://example.com", contact: "Priya", objective: "Explore automation", pastedText: "x".repeat(40_001) }).success).toBe(false);
  });
  it("preserves supported facts and emits cited Markdown", () => {
    const checked = checkBrief(output(), sources);
    expect(checked.companyFacts).toHaveLength(1);
    expect(toMarkdown(checked, sources, "Explore automation")).toContain("https://example.com/");
    expect(toMarkdown(checked, sources, "Explore automation")).toContain("Inference");
  });
  it("removes invented quotes and unsupported facts into gaps", () => {
    const result = output();
    result.companyFacts.push({ text: "100 staff", sourceId: "s1", quote: "100 staff" });
    const checked = checkBrief(result, sources);
    expect(checked.companyFacts).toHaveLength(1);
    expect(checked.gaps.join(" ")).toMatch(/not verified/i);
  });
  it("rejects a contradictory claim attached to a genuine quote", () => {
    const result = output();
    result.companyFacts = [{ text: "Founded in 2020 with 100 staff", sourceId: "s1", quote: "Founded in 2008." }];
    expect(checkBrief(result, sources).companyFacts).toEqual([]);
  });
  it("repairs an incorrect source ID only when the exact extract has one unique source", () => {
    const result = output();
    result.companyFacts = [{ ...fact, sourceId: "source-1" }];
    expect(checkBrief(result, sources).companyFacts[0].sourceId).toBe("s1");
  });
  it("rejects another industry despite the model assigning the requested industry label", () => {
    const result = output();
    result.competitors = [{ name: "Bay Plumbing", text: "Bay Plumbing is a plumbing business in Geelong.", city: "Geelong", industry: "accounting", sourceId: "s2", quote: "Bay Plumbing is a plumbing business in Geelong." }];
    expect(checkBrief(result, [...sources, { ...sources[0], id: "s2", text: "Bay Plumbing is a plumbing business in Geelong." }]).competitors).toEqual([]);
  });
  it("does not choose between two people sharing a partial name", () => {
    const result = output();
    result.contactFacts = [{ text: "Priya Shah is a director", sourceId: "s1", quote: "Priya Shah is a director" }];
    const checked = checkContact(result, [{ ...sources[0], text: "Priya Shah is a director. Priya Sharma is an assistant." }], "Priya", "https://example.com");
    expect(checked.contactFacts).toEqual([]);
    expect(checked.gaps.join(" ")).toMatch(/full name|identity/i);
  });
  it("does not accept a name embedded in another name or an external source at another employer", () => {
    const result = output();
    result.contactFacts = [{ text: "Anita Shah leads the team", sourceId: "s1", quote: "Anita Shah leads the team" }];
    expect(checkContact(result, sources, "Nita Shah", "https://example.com").contactFacts).toEqual([]);
    result.contactFacts = [{ text: "Priya Shah works for Elsewhere", sourceId: "s2", quote: "Priya Shah works for Elsewhere" }];
    expect(checkContact(result, [{ ...sources[0], id: "s2", url: "https://example.org", text: "Priya Shah works for Elsewhere" }], "Priya Shah", "https://example.com").contactFacts).toEqual([]);
  });
  it("requires metadata text to occur in the quote before competitor research", () => {
    const result = output();
    result.city = { text: "Melbourne", sourceId: "s1", quote: "Geelong" };
    expect(checkBrief(result, sources).city).toBeNull();
  });
  it("removes competitors with different city or industry and unsupported inference references", () => {
    const result = output();
    result.competitors.push({ name: "Other", city: "Melbourne", industry: "accounting", text: "Other in Melbourne", sourceId: "s1", quote: "Founded in 2008." });
    result.likelyNeeds.push({ text: "Invented needs", sourceIds: ["unknown"] });
    const checked = checkBrief(result, sources);
    expect(checked.competitors).toEqual([]);
    expect(checked.likelyNeeds).toHaveLength(1);
  });
  it("keeps the source record unchanged and counts all core sections", () => {
    const checked = checkBrief(output(), sources);
    expect(sources[0].text).toContain("Founded in 2008.");
    expect(coreWordCount(checked, "Explore automation")).toBeGreaterThan(10);
  });
});
