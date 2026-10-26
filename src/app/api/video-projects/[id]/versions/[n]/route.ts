import { restoreResponse } from "@/features/video-to-variations";

/** Makes version n current (undo and redo). */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string; n: string }> }) {
  const { id, n } = await ctx.params;
  return restoreResponse(id, n);
}
