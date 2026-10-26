import { importMediaResponse } from "@/features/video-to-variations";

/** Body: the raw video file. Header: x-file-name (URI-encoded). Streams NDJSON. */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return importMediaResponse(req, id);
}
