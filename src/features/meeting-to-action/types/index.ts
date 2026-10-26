import type { z } from "zod";
import type { inputSchema } from "@/features/meeting-to-action/schemas/input.schema";
import type {
  actionSchema,
  emailSchema,
  extractionSchema,
  flagSchema,
  outputSchema,
} from "@/features/meeting-to-action/schemas/output.schema";

export type MeetingInput = z.infer<typeof inputSchema>;
export type Extraction = z.infer<typeof extractionSchema>;
export type Action = z.infer<typeof actionSchema>;
export type ActionFlag = z.infer<typeof flagSchema>;
export type EmailDraft = z.infer<typeof emailSchema>;
export type MeetingOutput = z.infer<typeof outputSchema>;
/** Output before the email is drafted. */
export type CheckedOutput = Omit<MeetingOutput, "email" | "warnings">;
