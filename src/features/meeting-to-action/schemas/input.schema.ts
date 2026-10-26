import { z } from "zod";
import { MAX_CHARS } from "@/features/meeting-to-action/constants";

export const inputSchema = z.object({
  transcript: z.string().trim().min(1, "Add a transcript first.").max(MAX_CHARS),
  meetingDate: z.iso.date().optional(),
  title: z.string().max(200).optional(),
});
