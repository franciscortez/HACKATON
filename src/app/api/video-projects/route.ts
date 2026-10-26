import { createEditResponse } from "@/features/video-to-variations";

/** Creates a new, empty edit. Body (optional): { name }. */
export async function POST(req: Request) {
  return createEditResponse(req);
}
