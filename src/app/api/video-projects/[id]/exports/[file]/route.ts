import { exportFileResponse } from "@/features/video-to-variations";

/** An exported MP4, as a download. */
export async function GET(req: Request, ctx: { params: Promise<{ id: string; file: string }> }) {
  const { id, file } = await ctx.params;
  return exportFileResponse(req, id, file);
}
