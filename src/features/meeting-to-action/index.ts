import { MAX_CHARS } from "@/features/meeting-to-action/constants";
import { inputSchema } from "@/features/meeting-to-action/schemas/input.schema";
import { outputSchema } from "@/features/meeting-to-action/schemas/output.schema";
import { checkActions, meetingPeople } from "@/features/meeting-to-action/services/check-actions";
import { draftEmail } from "@/features/meeting-to-action/services/draft-email";
import { transcriptChunks } from "@/features/meeting-to-action/services/chunk";
import { extractActions } from "@/features/meeting-to-action/services/extract-actions";
import { parseTranscript, toPromptText } from "@/features/meeting-to-action/services/parse-transcript";
import type { MeetingInput, MeetingOutput } from "@/features/meeting-to-action/types";
import { addCosts } from "@/lib/ai/cost";
import type { ToolModule } from "@/types/tool";

export type { MeetingInput, MeetingOutput } from "@/features/meeting-to-action/types";
export { MeetingWorkbench } from "@/features/meeting-to-action/components/MeetingWorkbench";

/** Today's date in Australia, where Leveric works. */
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

  async run(input, { settings, now, providers, onProgress }) {
    const parsed = parseTranscript(input.transcript);
    const transcriptText = toPromptText(parsed.segments);
    const speakers = parsed.segments.map((s) => s.speaker);
    const meetingDate = input.meetingDate ?? localDate(now);

    // Steps: one per transcript part, then the email.
    const parts = transcriptChunks(transcriptText).length;
    const total = parts + 1;
    const reading = (done: number) => (parts === 1 ? "Reading the transcript" : `Reading part ${done + 1} of ${parts}`);
    onProgress?.({ done: 0, total, label: reading(0) });

    const { extraction, cost } = await extractActions({
      transcriptText,
      actionLines: parsed.actionLines,
      people: meetingPeople(speakers),
      settings,
      meetingDate,
      providers,
      onChunkDone: (done) => onProgress?.({ done, total, label: done < parts ? reading(done) : "Drafting the follow-up email" }),
    });
    const checked = checkActions(extraction, transcriptText, speakers, meetingDate);
    const drafted = await draftEmail({ checked, settings, title: input.title, providers });
    onProgress?.({ done: total, total, label: "Done" });

    return {
      output: {
        ...checked,
        email: drafted.email,
        warnings: speakers.every((s) => s === null) ? ["no-speakers"] : [],
      },
      cost: drafted.cost ? addCosts(cost, drafted.cost) : cost,
    };
  },
};
