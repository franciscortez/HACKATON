import { MAX_CHARS } from "@/features/meeting-to-action/constants";
import { inputSchema } from "@/features/meeting-to-action/schemas/input.schema";
import { outputSchema } from "@/features/meeting-to-action/schemas/output.schema";
import { checkActions } from "@/features/meeting-to-action/services/check-actions";
import { draftEmail } from "@/features/meeting-to-action/services/draft-email";
import { extractActions } from "@/features/meeting-to-action/services/extract-actions";
import { parseTranscript, toPromptText } from "@/features/meeting-to-action/services/parse-transcript";
import type { MeetingInput, MeetingOutput } from "@/features/meeting-to-action/types";
import { addCosts } from "@/lib/ai/cost";
import type { ToolModule } from "@/types/tool";

export type { MeetingInput, MeetingOutput } from "@/features/meeting-to-action/types";
export { MeetingWorkbench } from "@/features/meeting-to-action/components/MeetingWorkbench";

/** Today's date where the client is (all seeded clients are in Australia). */
function localDate(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" }).format(now);
}

export const meetingToAction: ToolModule<MeetingInput, MeetingOutput> = {
  slug: "meeting-to-action",
  inputSchema,
  outputSchema,

  isTooLarge(input) {
    const transcript = (input as { transcript?: unknown } | null)?.transcript;
    return typeof transcript === "string" && transcript.length > MAX_CHARS;
  },

  async run(input, { client, now, providers }) {
    const parsed = parseTranscript(input.transcript);
    const transcriptText = toPromptText(parsed.segments);
    const meetingDate = input.meetingDate ?? localDate(now);

    const { extraction, cost } = await extractActions({
      transcriptText,
      actionLines: parsed.actionLines,
      client,
      meetingDate,
      providers,
    });
    const checked = checkActions(extraction, transcriptText, client, meetingDate);
    const drafted = await draftEmail({ checked, client, title: input.title, providers });

    return {
      output: {
        ...checked,
        email: drafted.email,
        warnings: parsed.segments.every((s) => s.speaker === null) ? ["no-speakers"] : [],
      },
      cost: drafted.cost ? addCosts(cost, drafted.cost) : cost,
    };
  },
};
