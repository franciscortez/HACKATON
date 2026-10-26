import { extractSystemPrompt, extractUserPrompt } from "@/features/meeting-to-action/prompts/extract.prompt";
import { extractionSchema } from "@/features/meeting-to-action/schemas/output.schema";
import { mergeExtractions, transcriptChunks } from "@/features/meeting-to-action/services/chunk";
import type { Extraction } from "@/features/meeting-to-action/types";
import { addCosts } from "@/lib/ai/cost";
import { generateStructured, type ProviderEntry } from "@/lib/ai/provider";
import type { Settings } from "@/schemas/settings.schema";
import type { CostNote } from "@/types/run";

/**
 * Extracts actions chunk by chunk. Short prompts keep local models fast (prompt processing
 * slows sharply past a few thousand tokens) and stay inside free-tier per-minute token limits.
 */
export async function extractActions(args: {
  transcriptText: string;
  actionLines: string[];
  people: string[];
  settings: Settings;
  meetingDate: string;
  providers?: ProviderEntry[];
  /** Called after each chunk with how many of the chunks are done. */
  onChunkDone?: (done: number, total: number) => void;
}): Promise<{ extraction: Extraction; cost: CostNote }> {
  const chunks = transcriptChunks(args.transcriptText);
  const parts: Extraction[] = [];
  let cost: CostNote | null = null;

  for (const [i, chunk] of chunks.entries()) {
    const lines = args.actionLines.filter((line) => chunk.includes(line));
    const result = await generateStructured({
      schema: extractionSchema,
      system: extractSystemPrompt(args.settings, args.meetingDate, args.people, lines),
      prompt: extractUserPrompt(chunk),
      policy: args.settings.dataPolicy,
      providers: args.providers,
    });
    parts.push(result.object);
    cost = cost ? addCosts(cost, result.cost) : result.cost;
    args.onChunkDone?.(i + 1, chunks.length);
  }
  return { extraction: mergeExtractions(parts), cost: cost! };
}
