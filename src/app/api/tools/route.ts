import { listTools } from "@/features/registry";
import { ok } from "@/lib/api/respond";

export async function GET(_req: Request) {
  return ok({ tools: listTools() });
}
