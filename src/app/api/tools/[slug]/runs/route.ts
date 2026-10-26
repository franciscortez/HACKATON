import { z } from "zod";
import { getToolModule } from "@/features/registry";
import { ProviderError, availableProviders } from "@/lib/ai/provider";
import { fail, ok } from "@/lib/api/respond";
import { getClient } from "@/services/clients";
import { ResearchError } from "@/services/research/types";

export const maxDuration = 300;

const bodySchema = z.object({
  clientId: z.string(),
  input: z.unknown(),
  /** Runs this client has used this month (counted in the browser in phase 1). */
  usedThisMonth: z.number().int().min(0).default(0),
});

export async function POST(req: Request, ctx: RouteContext<"/api/tools/[slug]/runs">) {
  const { slug } = await ctx.params;
  const tool = getToolModule(slug);
  if (!tool) return fail("tool_not_found", `No runnable tool called "${slug}".`, 404);

  const body = bodySchema.safeParse(await req.json().catch(() => null));
  if (!body.success) return fail("invalid_input", "The request body is not valid.", 400);

  const client = getClient(body.data.clientId);
  if (!client) return fail("client_not_found", `No client called "${body.data.clientId}".`, 404);

  if (tool.isTooLarge(body.data.input)) return fail("input_too_large", "This input is too long. Split it into smaller parts.", 413);

  const input = tool.inputSchema.safeParse(body.data.input);
  if (!input.success) return fail("invalid_input", input.error.issues[0]?.message ?? "The input is not valid.", 400);

  const cap = tool.getRunLimit?.(client) ?? client.usage.runsPerMonth;
  if (body.data.usedThisMonth >= cap) {
    return fail("run_cap_reached", `This client has used ${body.data.usedThisMonth} of ${cap} runs this month. Ask Leveric for more runs.`, 429);
  }

  try {
    const result = await tool.run(input.data, { client, now: new Date(), providers: availableProviders(client.dataPolicy), signal: req.signal });
    return ok(result, 201);
  } catch (error) {
    if (error instanceof ResearchError) return fail(error.code, error.message, error.status, { research: error.usage });
    if (error instanceof ProviderError) {
      return fail("providers_failed", "No model is available right now. Try again in a minute.", 502, { rawText: error.rawText });
    }
    throw error;
  }
}
