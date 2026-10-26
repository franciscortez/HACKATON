import { ok } from "@/lib/api/respond";
import { listClients, toPublicClient } from "@/services/clients";

export async function GET(_req: Request) {
  return ok({ clients: listClients().map(toPublicClient) });
}
