import { ok } from "@/lib/api/respond";
import { listClients, toPublicClient } from "@/services/clients";

export async function GET() {
  return ok({ clients: listClients().map(toPublicClient) });
}
