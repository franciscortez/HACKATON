import { test, expect, vi } from "vitest";
import { evidenceUnits, hydrateEvidence, evidenceModelSchema, schemaForEvidence } from "@/features/research-to-call-brief/services/evidence";
import { sealResearch, openResearch } from "@/services/research/recovery";
import { preflightOllama, generateLocal } from "@/services/research/ollama";
import { emptyBrand } from "@/services/research/brand.schema";
const source = { id: "s1", url: "https://example.com/", title: "Example", text: "Example designs websites. We automate bookkeeping.", fetchedAt: new Date().toISOString(), origin: "web" as const };
test("hydrates exact source evidence and rejects invented references and names", () => {
 const units = evidenceUnits([source]);
 const model = evidenceModelSchema.parse({ companyName: { text: "Invented", evidenceId: units[0].id }, city: null, industry: null, summary: "A business", services: [units[0].id, "invented"], audience: [], positioning: [], tone: [], companyFacts: [], opportunities: [], gaps: [] });
 const result = hydrateEvidence(model, units);
 expect(result.companyName).toBeNull(); expect(result.services).toHaveLength(1); expect(result.services[0].text).toBe(units[0].text);
});
test("research snapshots reject tampering, expiry and URL substitution", () => {
 const snapshot = { companyUrl: source.url, sources: [source], brand: emptyBrand(), gaps: [], collectedAt: source.fetchedAt, usage: {costUsd:0.01,reservedUsd:0.1,maxUsd:0.1,runIds:["r1"]} };
 const token=sealResearch(snapshot,"test-secret",1000);
 expect(openResearch(token,"test-secret",source.url,1001).sources).toHaveLength(1);
 expect(()=>openResearch(token+"x","test-secret",source.url,1001)).toThrow();
 expect(()=>openResearch(token,"test-secret","https://other.com/",1001)).toThrow();
 expect(()=>openResearch(token,"test-secret",source.url,86401001)).toThrow();
});
test("local preflight identifies missing model and native generation sets context", async () => {
 const fetcher=vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({models:[]})));
 await expect(preflightOllama(undefined,fetcher)).rejects.toMatchObject({code:"local_model_missing"});
 fetcher.mockResolvedValueOnce(new Response(JSON.stringify({message:{content:'{"value":"ok"}'},done:true,prompt_eval_count:2,eval_count:3})));
 const {z}=await import("zod"); const result=await generateLocal({schema:z.object({value:z.string()}),system:"test",prompt:"test"},fetcher);
 expect(result.object).toEqual({value:"ok"}); expect(JSON.parse(fetcher.mock.calls[1][1].body).options.num_ctx).toBe(8192);
});

test("generation schema restricts fact references to the actual batch IDs",()=>{
 const units=evidenceUnits([source]);const schema=schemaForEvidence(units);
 const draft={companyName:{text:"Example",evidenceId:units[0].id},city:null,industry:null,summary:"",services:["Workflow automation"],companyFacts:[],audience:[],positioning:[],tone:[],opportunities:[],gaps:[]};
 expect(schema.safeParse(draft).success).toBe(false);
 expect(schema.safeParse({...draft,services:[units[0].id]}).success).toBe(true);
});
