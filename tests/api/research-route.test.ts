import { expect, test, vi } from "vitest";
import { POST } from "@/app/api/tools/[slug]/runs/route";
import { generateLocal } from "@/services/research/ollama";
vi.mock("@/services/research/ollama",()=>({generateLocal:vi.fn(),preflightOllama:vi.fn()}));
const ctx={params:Promise.resolve({slug:"research-to-call-brief"})};
const input={companyUrl:"https://example.com",pastedText:"Example builds websites."};
const request=(body:unknown)=>new Request("http://localhost/api/tools/research-to-call-brief/runs",{method:"POST",body:JSON.stringify(body)});
const events=async(r:Response)=>(await r.text()).trim().split("\n").map(line=>JSON.parse(line));
test("rejects invalid and oversized research inputs before streaming",async()=>{
 expect((await POST(request({input:{}}),ctx)).status).toBe(400);
 expect((await POST(request({input:{...input,pastedText:"x".repeat(270000)}}),ctx)).status).toBe(413);
});
test("advisory cap blocks new collection, not pasted generation",async()=>{
 expect((await POST(request({input:{...input,pastedText:""},usedThisMonth:20}),ctx)).status).toBe(429);
 vi.mocked(generateLocal).mockRejectedValue(new Error("private"));
 expect((await POST(request({input,usedThisMonth:20}),ctx)).status).toBe(200);
});
test("streams safe failures with incurred usage",async()=>{
 vi.mocked(generateLocal).mockRejectedValue(new Error("PRIVATE PROVIDER DATA"));
 const response=await POST(request({input}),ctx);const data=await events(response);
 expect(response.headers.get("content-type")).toContain("ndjson");
 expect(data.at(-1)).toMatchObject({type:"error",research:{costUsd:0}});expect(JSON.stringify(data)).not.toContain("PRIVATE PROVIDER DATA");
});
test("streams progress and a dossier result from local evidence",async()=>{
 vi.mocked(generateLocal).mockResolvedValue({object:{companyName:{text:"Example",evidenceId:"e1"},city:null,industry:null,summary:"Website business",services:["e1"],companyFacts:[],audience:[],positioning:[],tone:[],opportunities:[],gaps:[]},cost:{provider:"ollama",model:"test",inputTokens:1,outputTokens:1,costUsd:0,estPaidUsd:0}});
 const data=await events(await POST(request({input}),ctx));expect(data[0].type).toBe("progress");expect(data.at(-1)).toMatchObject({type:"result",output:{schemaVersion:2,companyName:{text:"Example"}}});
});
