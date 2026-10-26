import { inputSchema, MAX_INPUT } from "./schemas/brief.schema";
import { dossierOutputSchema } from "./schemas/dossier.schema";
import type { DossierOutput } from "./schemas/dossier.schema";
import { runBrief } from "./services/run";
import type { BriefInput } from "./schemas/brief.schema";
import type { ToolModule } from "@/types/tool";

export const researchToCallBrief: ToolModule<BriefInput, DossierOutput> = {
  slug: "research-to-call-brief", inputSchema, outputSchema: dossierOutputSchema,
  isTooLarge(input) {
    return typeof input === "object" && input !== null && "pastedText" in input && typeof input.pastedText === "string" && input.pastedText.length > MAX_INPUT;
  },
  run: runBrief,
};
export type { BriefInput, BriefOutput } from "./schemas/brief.schema";
export { ResearchWorkbench } from "./components/ResearchWorkbench";
