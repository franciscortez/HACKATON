import { z } from "zod";
import { factSchema, outputSchema } from "./brief.schema";
import { brandSchema } from "@/services/research/brand.schema";

const opportunitySchema = z.object({ capabilityId: z.string().max(60), observation: factSchema, hypothesis: z.string().max(300), question: z.string().max(180) });
export const dossierSchema = z.object({
  summary: z.string().max(1200), services: z.array(factSchema).max(8), audience: z.array(factSchema).max(4),
  positioning: z.array(factSchema).max(4), tone: z.array(factSchema).max(3), opportunities: z.array(opportunitySchema).max(3),
});
export const dossierModelSchema = z.object({
  companyName: factSchema.extend({ text: z.string().min(1).max(80).describe("Only the business name, e.g. Leveric. Never a description, slogan or sentence. Copy the name from the source; quote may be a longer sentence.") }).nullable().describe("One fact OBJECT or null, never an array."),
  city: factSchema.nullable(), industry: factSchema.nullable(), companyFacts: z.array(factSchema).max(8),
  ...dossierSchema.shape, gaps: z.array(z.string().max(180)).max(8),
});
export const callSheetSchema = z.object({
  company: z.string().max(240), summary: z.string().max(1200), opener: z.string().max(300),
  talkingPoints: z.array(z.string().max(600)).max(3), questions: z.array(z.string().max(200)).max(5),
});
export const dossierOutputSchema = outputSchema.extend({
  schemaVersion: z.literal(2), dossier: dossierSchema, brand: brandSchema, callSheet: callSheetSchema,
  callSheetStale: z.boolean(), editedSections: z.array(z.string()).default([]),
});
const editableFactSchema = factSchema.extend({ text: z.string().max(240) });
const editableFacts = {
  companyFacts: z.array(editableFactSchema).max(8), contactFacts: z.array(editableFactSchema).max(3),
  competitors: z.array(outputSchema.shape.competitors.element.extend({ text: z.string().max(240) })).max(3),
};
export const savedOutputSchema = z.union([
  dossierOutputSchema.extend({ ...editableFacts, dossier: dossierSchema.extend({
    services: z.array(editableFactSchema).max(8), audience: z.array(editableFactSchema).max(4),
    positioning: z.array(editableFactSchema).max(4), tone: z.array(editableFactSchema).max(3),
  }) }),
  outputSchema.extend({ ...editableFacts, schemaVersion: z.never().optional() }),
]);
export type Dossier = z.infer<typeof dossierSchema>;
export type DossierModel = z.infer<typeof dossierModelSchema>;
export type DossierOutput = z.infer<typeof dossierOutputSchema>;
export type CallSheet = z.infer<typeof callSheetSchema>;
export type SavedOutput = z.infer<typeof savedOutputSchema>;
export const isDossier = (output: SavedOutput): output is DossierOutput => "schemaVersion" in output && output.schemaVersion === 2;
