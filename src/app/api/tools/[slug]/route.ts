import { getTool } from "@/features/registry";
import { fail, ok } from "@/lib/api/respond";

export async function GET(_req: Request, ctx: RouteContext<"/api/tools/[slug]">) {
  const { slug } = await ctx.params;
  const tool = getTool(slug);
  if (!tool) return fail("tool_not_found", `No tool called "${slug}".`, 404);
  return ok({ tool });
}
