import { CHUNK_CHARS } from "@/features/meeting-to-action/constants";
import { extractSystemPrompt, extractUserPrompt } from "@/features/meeting-to-action/prompts/extract.prompt";
import { extractionSchema } from "@/features/meeting-to-action/schemas/output.schema";
import { chunkText, mergeExtractions } from "@/features/meeting-to-action/services/chunk";
import type { Extraction } from "@/features/meeting-to-action/types";
import { addCosts } from "@/lib/ai/cost";
import { generateStructured, type ProviderEntry } from "@/lib/ai/provider";
import type { ClientConfig } from "@/schemas/client.schema";
import type { CostNote } from "@/types/run";

/**
 * Extracts actions chunk by chunk. Short prompts keep local models fast (prompt processing
 * slows sharply past a few thousand tokens) and stay inside free-tier per-minute token limits.
 */
export async function extractActions(args: {
  transcriptText: string;
  actionLines: string[];
  client: ClientConfig;
  meetingDate: string;
  providers?: ProviderEntry[];
}): Promise<{ extraction: Extraction; cost: CostNote }> {
  const parts: Extraction[] = [];
  let cost: CostNote | null = null;

  for (const chunk of chunkText(args.transcriptText, CHUNK_CHARS)) {
    const lines = args.actionLines.filter((line) => chunk.includes(line));
    const result = await generateStructured({
      schema: extractionSchema,
      system: extractSystemPrompt(args.client, args.meetingDate, lines),
      prompt: extractUserPrompt(chunk),
      policy: args.client.dataPolicy,
      providers: args.providers,
    });
    parts.push(result.object);
    cost = cost ? addCosts(cost, result.cost) : result.cost;
  }
  return { extraction: mergeExtractions(parts), cost: cost! };
}
