import { getEditResponse, renameEditResponse } from "@/features/video-to-variations";

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return getEditResponse(id);
}

/** Body: { name }. */
export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return renameEditResponse(req, id);
}
