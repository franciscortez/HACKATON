import { z, type ZodType } from "zod";
import { estimateCost } from "@/lib/ai/cost";
import { ResearchError } from "./types";
const model = () => process.env.OLLAMA_MODEL || "qwen2.5:7b-instruct";
const authHeaders = (): Record<string, string> => process.env.OLLAMA_AUTHORIZATION ? { Authorization: process.env.OLLAMA_AUTHORIZATION } : {};
const base = () => (process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434/v1").replace(/\/v1\/?$/, "").replace(/\/$/, "");
function failure(error: unknown): ResearchError {
 if(error instanceof ResearchError)return error;
 return new ResearchError(error instanceof Error && ["AbortError","TimeoutError"].includes(error.name)?"local_timeout":"local_unavailable", error instanceof Error && ["AbortError","TimeoutError"].includes(error.name)?"Local generation timed out. Retry generation using the saved research.":"Ollama is unavailable. Start Ollama on the app server, then retry generation.");
}
export async function preflightOllama(signal?: AbortSignal, fetcher = fetch) {
 try {
  const response=await fetcher(`${base()}/api/tags`,{headers:authHeaders(),redirect:"error",signal:AbortSignal.any([AbortSignal.timeout(5000),...(signal?[signal]:[])])});
  if(!response.ok)throw new Error("unavailable");
  const data=z.object({models:z.array(z.object({name:z.string()}))}).parse(await response.json());
  if(!data.models.some(m=>m.name===model()))throw new ResearchError("local_model_missing",`Install ${model()} in Ollama, then retry. No website scrape was started.`);
 }catch(error){throw failure(error);}
}
export async function generateLocal<T>(args:{schema:ZodType<T>;system:string;prompt:string;signal?:AbortSignal},fetcher=fetch) {
 try {
  const response=await fetcher(`${base()}/api/chat`,{method:"POST",headers:{"Content-Type":"application/json",...authHeaders()},redirect:"error",signal:AbortSignal.any([AbortSignal.timeout(180000),...(args.signal?[args.signal]:[])]),body:JSON.stringify({model:model(),keep_alive:"10m",stream:false,format:z.toJSONSchema(args.schema),messages:[{role:"system",content:args.system},{role:"user",content:args.prompt}],options:{num_ctx:8192,num_predict:2500,temperature:0}})});
  if(response.status===404)throw new ResearchError("local_model_missing",`Install ${model()} in Ollama, then retry generation.`);
  if(!response.ok)throw new Error("unavailable");
  const data=await response.json();
  let object:T;
  try { object=args.schema.parse(JSON.parse(data.message?.content)); }catch{throw new ResearchError("local_invalid_output","Ollama returned an incomplete or invalid report. Retry generation with the saved research.");}
  return {object,cost:estimateCost("ollama",model(),data.prompt_eval_count??0,data.eval_count??0)};
 }catch(error){throw failure(error);}
}
