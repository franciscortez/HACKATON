import { beforeEach, expect, test, vi } from "vitest";
import { runBrief } from "@/features/research-to-call-brief/services/run";
import { inputSchema } from "@/features/research-to-call-brief/schemas/brief.schema";
const researchToCallBrief={run:runBrief,inputSchema};
import { getSettings } from "@/services/settings";
import { generateLocal, preflightOllama } from "@/services/research/ollama";
import { sealResearch } from "@/services/research/recovery";
import { generateStructured, ProviderError } from "@/lib/ai/provider";
vi.mock("@/lib/ai/provider",async original=>({...await original<typeof import("@/lib/ai/provider")>(),generateStructured:vi.fn()}));
import { emptyBrand } from "@/services/research/brand.schema";
vi.mock("@/services/research/ollama",()=>({generateLocal:vi.fn(),preflightOllama:vi.fn()}));
const cost={provider:"ollama" as const,model:"qwen2.5:7b-instruct",inputTokens:100,outputTokens:100,costUsd:0,estPaidUsd:0};
const model={companyName:{text:"Example",evidenceId:"e1"},city:null,industry:null,summary:"Example makes websites.",companyFacts:[],services:["e1"],audience:[],positioning:[],tone:[],opportunities:[{capabilityId:"custom-apps",evidenceId:"e1",hypothesis:"Could explore useful apps.",question:"What would help?"}],gaps:[]};
beforeEach(()=>{vi.clearAllMocks();vi.mocked(generateLocal).mockResolvedValue({object:model,cost});vi.mocked(preflightOllama).mockResolvedValue(undefined);});
const context=()=>({settings:getSettings(),now:new Date(),providers:[]});
const input=(extra={})=>researchToCallBrief.inputSchema.parse({companyUrl:"https://example.com/",pastedText:"Example makes websites.",...extra});
test("defaults to Ollama and pasted material makes no external calls",async()=>{
 const fetcher=vi.spyOn(globalThis,"fetch").mockRejectedValue(new Error("unexpected network"));
 const result=await researchToCallBrief.run(input(),context());
 expect(result.output.companyName?.text).toBe("Example");expect(result.output.dossier.services).toHaveLength(1);expect(fetcher).not.toHaveBeenCalled();fetcher.mockRestore();
});
test("local-only blocks scraping before model preflight",async()=>{
 await expect(researchToCallBrief.run(input({pastedText:""}),{...context(),settings:{...getSettings(),dataPolicy:"local-only"}})).rejects.toMatchObject({code:"local_sources_required"});expect(preflightOllama).not.toHaveBeenCalled();
});
test("preflight failure happens before any paid collection",async()=>{
 vi.mocked(preflightOllama).mockRejectedValue(new Error("missing"));const fetcher=vi.spyOn(globalThis,"fetch").mockRejectedValue(new Error("unexpected network"));
 await expect(researchToCallBrief.run(input({pastedText:""}),context())).rejects.toThrow();expect(fetcher).not.toHaveBeenCalled();fetcher.mockRestore();
});
test("signed retry retains original charge without scraping or DNS",async()=>{
 vi.stubEnv("APIFY_API_KEY","test-secret");const source={id:"s1",url:"https://example.com/",title:"Example",text:"Example makes websites.",fetchedAt:new Date().toISOString(),origin:"web" as const};
 const recoveryToken=sealResearch({companyUrl:source.url,sources:[source],brand:emptyBrand(),gaps:[],collectedAt:source.fetchedAt,usage:{costUsd:.01,reservedUsd:.1,maxUsd:.1,runIds:["original"]}},"test-secret");
 const fetcher=vi.spyOn(globalThis,"fetch").mockRejectedValue(new Error("unexpected network"));
 const result=await researchToCallBrief.run(input({pastedText:"",recoveryToken}),context());expect(result.cost.research?.costUsd).toBe(.01);expect(fetcher).not.toHaveBeenCalled();fetcher.mockRestore();vi.unstubAllEnvs();
});
test("empty evidence is an explicit incomplete result, not silent success",async()=>{
 vi.mocked(generateLocal).mockResolvedValue({object:{...model,companyName:null,services:[],opportunities:[]},cost});
 await expect(researchToCallBrief.run(input(),context())).rejects.toMatchObject({code:"insufficient_evidence"});
});

test("Auto cloud failure uses the same native Ollama transport",async()=>{
 vi.mocked(generateStructured).mockRejectedValue(new ProviderError("cloud failed"));
 const result=await researchToCallBrief.run(input({aiMode:"auto"}),context());
 expect(result.cost.provider).toBe("ollama");expect(generateLocal).toHaveBeenCalled();
});
