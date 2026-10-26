import { z } from "zod";
import { researchSourceSchema } from "@/services/research/types";

export const MAX_INPUT = 40_000;
export const inputSchema = z.object({
  aiMode: z.enum(["local", "auto"]).default("local"),
  recoveryToken: z.string().max(240000).optional(),
  companyUrl: z.string().trim().max(2048).transform(value => /^[\w+.-]+:/.test(value) ? value : `https://${value}`)
    .pipe(z.url({ protocol: /^https?$/ }))
    .refine(value => { const url = new URL(value); return !url.username && !url.password; }, "Remove credentials from the business URL.")
    .transform(value => new URL(value).href), contact: z.string().trim().max(120).default(""),
  objective: z.string().trim().max(500).default("Explore relevant Leveric services and prepare discovery questions."), notes: z.string().max(4000).default(""),
  pastedText: z.string().max(MAX_INPUT).default(""),
});
export const factSchema = z.object({ text: z.string().min(1).max(240).describe("VERBATIM source extract, never a paraphrase. Must occur exactly inside quote."), sourceId: z.string(), quote: z.string().min(1).max(500).describe("Exact contiguous source text, preserving wording. Do not summarise or add ellipses.") });
export const briefSchema = z.object({
  companyName: factSchema.nullable(), city: factSchema.nullable(), industry: factSchema.nullable(),
  companyFacts: z.array(factSchema).max(8), contactFacts: z.array(factSchema).max(3),
  likelyNeeds: z.array(z.object({ text: z.string().max(240), sourceIds: z.array(z.string()).min(1).max(3) })).max(3),
  competitors: z.array(factSchema.extend({ name: z.string().max(80), city: z.string().max(80), industry: z.string().max(80) })).max(3),
  talkingPoints: z.array(z.string().max(180)).max(4), gaps: z.array(z.string().max(180)).max(12),
});
export const outputSchema = briefSchema.extend({ sources: z.array(researchSourceSchema), objective: z.string(), contact: z.string(), generatedAt: z.string() });
export type Brief = z.infer<typeof briefSchema>;
export type BriefInput = z.infer<typeof inputSchema>;
export type BriefOutput = z.infer<typeof outputSchema>;
export type Fact = z.infer<typeof factSchema>;
