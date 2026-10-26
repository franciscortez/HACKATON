import { expect, test } from "vitest";
import { buildCallSheet, editDossier, rebuildCallSheet, validateDossier } from "@/features/research-to-call-brief/services/dossier";
import { dossierModelSchema, savedOutputSchema } from "@/features/research-to-call-brief/schemas/dossier.schema";
import { z } from "zod";
test("model JSON schema requires every top-level property for Groq strict output", () => {
  const json = z.toJSONSchema(dossierModelSchema, { io: "input" });
  expect(json.required?.sort()).toEqual(Object.keys(json.properties ?? {}).sort());
});
const source = { id: "s1", url: "https://example.com/", title: "Example", text: "Example provides accounting services in Geelong.", origin: "web" as const, fetchedAt: "2026-10-26T00:00:00Z" };
test("unrelated claims with real quotes cannot become dossier facts", () => {
  const draft = dossierModelSchema.parse({ summary: "", audience: [], positioning: [], tone: [], companyName: null, city: null, industry: null, companyFacts: [], contactFacts: [], likelyNeeds: [], competitors: [], talkingPoints: [], gaps: [], opportunities: [], services: [{ text: "100 employees", quote: source.text, sourceId: "s1" }] });
  expect(validateDossier(draft, [source]).services).toEqual([]);
});
test("unknown capabilities or references cannot become pitch opportunities", () => {
  const draft = dossierModelSchema.parse({ summary: "", audience: [], positioning: [], tone: [], companyName: null, city: null, industry: null, companyFacts: [], contactFacts: [], likelyNeeds: [], competitors: [], talkingPoints: [], gaps: [], services: [], opportunities: [{ capabilityId: "made-up", observation: { text: "accounting services", quote: source.text, sourceId: "s1" }, hypothesis: "Possible opportunity", question: "What would help?" }] });
  expect(validateDossier(draft, [source]).opportunities).toEqual([]);
});
test("dossier edits invalidate an approved call sheet until explicit rebuild", () => {
  const dossier = { summary: "Accounting firm", services: [], audience: [], positioning: [], tone: [], opportunities: [] };
  const state = { dossier, callSheet: buildCallSheet("Example", dossier, []), callSheetStale: false };
  const edited = editDossier(state, { ...dossier, summary: "Updated company summary" });
  expect(edited.callSheetStale).toBe(true);
  expect(edited.callSheet.summary).toBe("Accounting firm");
  const rebuilt = rebuildCallSheet(edited, "Example", []);
  expect(rebuilt.callSheetStale).toBe(false);
  expect(rebuilt.callSheet.summary).toBe("Updated company summary");
});

test("company name contract asks for a short name, not a company description", () => {
  const fact = { text: "Example provides accounting services in Geelong and helps small businesses organise financial records.", quote: "Example provides accounting services in Geelong and helps small businesses organise financial records.", sourceId: "s1" };
  expect(dossierModelSchema.shape.companyName.safeParse(fact).success).toBe(false);
  expect(dossierModelSchema.shape.companyName.safeParse({ ...fact, text: "Example" }).success).toBe(true);
});

test("cleared edited facts remain readable in v2 and legacy saved drafts", async () => {
  const { readFileSync } = await import("node:fs");
  const output = JSON.parse(readFileSync("tests/fixtures/research-to-call-brief/dossier.json", "utf8")).output;
  output.dossier.services[0].text = "";
  expect(savedOutputSchema.safeParse(output).success).toBe(true);
  const legacy = { ...output, schemaVersion: undefined, companyFacts: [{ text: "", quote: source.text, sourceId: "s1" }] };
  expect(savedOutputSchema.safeParse(legacy).success).toBe(true);
});

test("rebuilding keeps complete edited hypotheses instead of silently cutting them", () => {
  const hypothesis = "A".repeat(300), observation = { text: "B".repeat(240), sourceId: "s1", quote: "B".repeat(240) };
  const sheet = buildCallSheet("Example", { summary: "", services: [], audience: [], positioning: [], tone: [], opportunities: [{ capabilityId: "workflow-automation", observation, hypothesis, question: "Why?" }] }, []);
  expect(sheet.talkingPoints[0]).toContain(hypothesis);
});
