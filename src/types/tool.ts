import type { ZodType } from "zod";
import type { ProviderEntry } from "@/lib/ai/provider";
import type { Settings } from "@/schemas/settings.schema";
import type { CostNote } from "@/types/run";

export type ToolStatus = "LIVE" | "NEXT" | "PLANNED";

export interface ToolMeta {
  slug: string;
  index: string;
  name: string;
  summary: string;
  status: ToolStatus;
}

/** How far a run is: `done` of `total` steps, with a label for the person waiting. */
export interface RunProgress {
  done: number;
  total: number;
  label: string;
}

export interface RunContext {
  settings: Settings;
  now: Date;
  /** AI providers in fallback order, already filtered by the data policy. */
  providers: ProviderEntry[];
  onProgress?: (progress: RunProgress) => void;
}

export interface RunResult<O> {
  output: O;
  cost: CostNote;
}

export interface ToolModule<I, O> {
  slug: string;
  inputSchema: ZodType<I>;
  outputSchema: ZodType<O>;
  /** True when the raw input is over the tool's size limit (checked before validation, for a 413). */
  isTooLarge(input: unknown): boolean;
  run(input: I, ctx: RunContext): Promise<RunResult<O>>;
}
