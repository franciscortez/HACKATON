import { z } from "zod";
export const costSchema = z.object({
  provider: z.enum(["groq", "gemini", "ollama"]), model: z.string(), inputTokens: z.number(), outputTokens: z.number(),
  costUsd: z.number(), estPaidUsd: z.number(), totalCostUsd: z.number().nullable().optional(),
  research: z.object({ costUsd: z.number().nullable(), reservedUsd: z.number(), maxUsd: z.number(), runIds: z.array(z.string()), budgetPolicy: z.enum(["cap", "target"]).optional() }).optional(),
  modelCalls: z.array(z.object({ stage: z.string(), provider: z.enum(["groq", "gemini", "ollama"]), model: z.string(), inputTokens: z.number(), outputTokens: z.number() })).optional(),
});
