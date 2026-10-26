import { putStyleResponse } from "@/features/video-to-variations";

/** Body: the style guide as plain text. */
export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return putStyleResponse(req, id);
}
