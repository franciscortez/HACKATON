import { mediaFileResponse } from "@/features/video-to-variations";

/** A video's proxy (with HTTP Range), thumbnails and waveform. */
export async function GET(req: Request, ctx: { params: Promise<{ id: string; mediaId: string; file: string }> }) {
  const { id, mediaId, file } = await ctx.params;
  return mediaFileResponse(req, id, mediaId, file);
}
