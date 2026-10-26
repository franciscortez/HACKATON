import type { ZodType } from "zod";
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
}

export interface RunResult<O> {
  output: O;
  cost: CostNote;
}

export interface ToolModule<I, O> {
  slug: string;
  inputSchema: ZodType<I>;
  outputSchema: ZodType<O>;
  run(input: I, ctx: RunContext): Promise<RunResult<O>>;
}
