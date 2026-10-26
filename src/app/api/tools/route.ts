import { listTools } from "@/features/registry";
import { ok } from "@/lib/api/respond";

export async function GET() {
  return ok({ tools: listTools() });
}
