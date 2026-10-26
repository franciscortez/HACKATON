import { z } from "zod";

export const researchSourceSchema = z.object({
  id: z.string(), url: z.url(), title: z.string(), text: z.string(), fetchedAt: z.string(),
  origin: z.enum(["web", "pasted", "search"]),
});
export type ResearchSource = z.infer<typeof researchSourceSchema>;
export interface ResearchUsage {
  costUsd: number | null;
  reservedUsd: number;
  maxUsd: number;
  runIds: string[];
  budgetPolicy?: "cap" | "target";
}
export class ResearchError extends Error {
  constructor(public code: string, message: string, public usage?: ResearchUsage, public status: 400 | 429 | 502 = 502) {
    super(message);
    this.name = "ResearchError";
  }
}
