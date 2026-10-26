import { exportResponse } from "@/features/video-to-variations";

/** Renders the current version at full quality and approves it. Streams NDJSON. */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  return exportResponse(id);
}
