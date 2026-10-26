import { z } from "zod";
import { getToolModule } from "@/features/registry";
import { ProviderError, availableProviders } from "@/lib/ai/provider";
import { fail } from "@/lib/api/respond";
import { ResearchError } from "@/services/research/types";
import { getSettings } from "@/services/settings";

export const maxDuration = 300;
const bodySchema = z.object({ input: z.unknown(), usedThisMonth: z.number().int().min(0).default(0) });
async function readBody(req: Request, bounded: boolean) {
 if (!bounded) return req.json().catch(() => null);
 const reader=req.body?.getReader(); if(!reader)return null;
 let bytes=0,text="";const decoder=new TextDecoder();
 try {while(true){const {value,done}=await reader.read();if(done)break;bytes+=value.length;if(bytes>256*1024){await reader.cancel();throw new RangeError("body_limit");}text+=decoder.decode(value,{stream:true});}return JSON.parse(text+decoder.decode());} catch(error){if(error instanceof RangeError)throw error;return null;} finally{reader.releaseLock();}
}

/**
 * Runs a tool. Bad requests get a plain JSON error with a 4xx status. A valid run streams
 * newline-delimited JSON events: `progress` (done/total/label), then `result` or `error`.
 */
export async function POST(req: Request, ctx: RouteContext<"/api/tools/[slug]/runs">) {
  const { slug } = await ctx.params;
  const tool = getToolModule(slug);
  if (!tool) return fail("tool_not_found", `No runnable tool called "${slug}".`, 404);

  let raw:unknown;
  try { raw=await readBody(req,slug==="research-to-call-brief"); } catch { return fail("input_too_large","Research requests must be smaller than 256 KiB.",413); }
  const body = bodySchema.safeParse(raw);
  if (!body.success) return fail("invalid_input", "The request body is not valid.", 400);

  if (tool.isTooLarge(body.data.input)) return fail("input_too_large", "This input is too long. Split it into smaller parts.", 413);

  const input = tool.inputSchema.safeParse(body.data.input);
  if (!input.success) return fail("invalid_input", input.error.issues[0]?.message ?? "The input is not valid.", 400);

  const settings = getSettings();
  if(slug==="research-to-call-brief" && body.data.usedThisMonth>=settings.research.runsPerMonth && !(input.data as {recoveryToken?:string;pastedText?:string}).recoveryToken && !(input.data as {pastedText?:string}).pastedText?.trim()) return fail("run_cap_reached","Workspace research limit reached this month. Saved research can still be retried.",429);
  const abort=new AbortController(); const signal=AbortSignal.any([req.signal,abort.signal]); let closed=false;
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: Record<string, unknown>) => { if(!closed&&!signal.aborted)controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`)); };
      try {
        const result = await tool.run(input.data, {
          settings, signal,
          onResearch: (research) => send({ type: "research", ...research }),
          now: new Date(),
          providers: availableProviders(settings.dataPolicy),
          onProgress: (p) => send({ type: "progress", ...p }),
        });
        send({ type: "result", ...result });
      } catch (error) {
        if (error instanceof ResearchError) {
          send({type:"error",code:error.code,message:error.message,research:error.usage});
        } else if (error instanceof ProviderError) {
          // Model output never reaches the browser: it can be long, confusing or contain transcript text.
          send({ type: "error", code: "providers_failed", message: "We couldn't finish reading this transcript. Please try again in a minute." });
        } else {
          send({ type: "error", code: "run_failed", message: "Something went wrong while running the tool. Try again." });
        }
      } finally {
        if(!closed){closed=true;controller.close();}
      }
    },
    cancel(){closed=true;abort.abort();},
  });

  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" } });
}
