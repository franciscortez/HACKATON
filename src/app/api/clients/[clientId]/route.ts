import { fail, ok } from "@/lib/api/respond";
import { getClient, toPublicClient } from "@/services/clients";

export async function GET(_req: Request, ctx: RouteContext<"/api/clients/[clientId]">) {
  const { clientId } = await ctx.params;
  const client = getClient(clientId);
  if (!client) return fail("client_not_found", `No client called "${clientId}".`, 404);
  return ok({ client: toPublicClient(client) });
}
