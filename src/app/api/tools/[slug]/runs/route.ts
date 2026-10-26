import { z } from "zod";
import { getToolModule } from "@/features/registry";
import { ProviderError, availableProviders } from "@/lib/ai/provider";
import { fail } from "@/lib/api/respond";
import { getSettings } from "@/services/settings";

const bodySchema = z.object({ input: z.unknown() });

/**
 * Runs a tool. Bad requests get a plain JSON error with a 4xx status. A valid run streams
 * newline-delimited JSON events: `progress` (done/total/label), then `result` or `error`.
 */
export async function POST(req: Request, ctx: RouteContext<"/api/tools/[slug]/runs">) {
  const { slug } = await ctx.params;
  const tool = getToolModule(slug);
  if (!tool) return fail("tool_not_found", `No runnable tool called "${slug}".`, 404);

  const body = bodySchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return fail("invalid_input", "The request body is not valid.", 400);

  if (tool.isTooLarge(body.data.input)) return fail("input_too_large", "This input is too long. Split it into smaller parts.", 413);

  const input = tool.inputSchema.safeParse(body.data.input);
  if (!input.success) return fail("invalid_input", input.error.issues[0]?.message ?? "The input is not valid.", 400);

  const settings = getSettings();
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: Record<string, unknown>) => controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      try {
        const result = await tool.run(input.data, {
          settings,
          now: new Date(),
          providers: availableProviders(settings.dataPolicy),
          onProgress: (p) => send({ type: "progress", ...p }),
        });
        send({ type: "result", ...result });
      } catch (error) {
        if (error instanceof ProviderError) {
          // Model output never reaches the browser: it can be long, confusing or contain transcript text.
          send({ type: "error", code: "providers_failed", message: "We couldn't finish reading this transcript. Please try again in a minute." });
        } else {
          send({ type: "error", code: "run_failed", message: "Something went wrong while running the tool. Try again." });
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" } });
}
