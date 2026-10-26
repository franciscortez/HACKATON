import type { ZodType } from "zod";
import type { ProviderEntry } from "@/lib/ai/provider";
import type { ClientConfig } from "@/schemas/client.schema";
import type { CostNote } from "@/types/run";

export type ToolStatus = "LIVE" | "NEXT" | "PLANNED";

export interface ToolMeta {
  slug: string;
  index: string;
  name: string;
  summary: string;
  status: ToolStatus;
}

export interface RunContext {
  client: ClientConfig;
  now: Date;
  /** AI providers in fallback order, already filtered by the client's data policy. */
  providers: ProviderEntry[];
  signal?: AbortSignal;
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
  getRunLimit?(client: ClientConfig): number;
  run(input: I, ctx: RunContext): Promise<RunResult<O>>;
}
