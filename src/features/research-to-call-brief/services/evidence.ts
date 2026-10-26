import { z } from "zod";
import type { ResearchSource } from "@/services/research/types";
import type { DossierModel } from "../schemas/dossier.schema";
import { capabilities } from "./capabilities";
export type EvidenceUnit = { id: string; sourceId: string; text: string };
const ids = (n: number) => z.array(z.string().max(32)).max(n);
const metadata = z.object({ text: z.string().max(80), evidenceId: z.string().max(32) }).nullable();
export const evidenceModelSchema = z.object({
 companyName: metadata, city: metadata, industry: metadata,
 summary: z.string().max(1200), companyFacts: ids(8), services: ids(8), audience: ids(4), positioning: ids(4), tone: ids(3),
 opportunities: z.array(z.object({ capabilityId: z.string().max(60), evidenceId: z.string().max(32), hypothesis: z.string().max(300), question: z.string().max(180) })).max(3), gaps: z.array(z.string().max(180)).max(8),
});
export function schemaForEvidence(units: EvidenceUnit[]) {
 const reference=z.enum(units.map(u=>u.id) as [string,...string[]]);
 const item=z.object({text:z.string().max(80),evidenceId:z.enum(["unknown",...units.map(u=>u.id)])});
 return evidenceModelSchema.extend({companyName:item,city:item.nullable(),industry:item.nullable(),companyFacts:z.array(reference).max(8),services:z.array(reference).max(8),audience:z.array(reference).max(4),positioning:z.array(reference).max(4),tone:z.array(reference).max(3),opportunities:z.array(z.object({capabilityId:z.enum(capabilities.map(c=>c.id) as [string,...string[]]),evidenceId:reference,hypothesis:z.string().max(300),question:z.string().max(180)})).max(3)});
}
export function evidenceUnits(sources: ResearchSource[]): EvidenceUnit[] {
 const units: EvidenceUnit[] = [];
 for (const source of sources) for (const line of source.text.split(/\n+|(?<=[.!?])\s+/)) {
   let rest = line.trim();
   while (rest) {
     let end = Math.min(240, rest.length);
     if (end < rest.length) { const space = rest.lastIndexOf(" ", end); if (space > 120) end = space; }
     const text = rest.slice(0,end).trim(); rest = rest.slice(end).trim();
     if (text) units.push({ id: `e${units.length+1}`, sourceId: source.id, text });
   }
 }
 return units;
}
export function hydrateEvidence(model: z.infer<typeof evidenceModelSchema>, units: EvidenceUnit[]): DossierModel {
 const fact = (id: string) => { const u=units.find(u=>u.id===id); return u ? { text:u.text, quote:u.text, sourceId:u.sourceId } : null; };
 const facts = (values: string[]) => [...new Set(values)].flatMap(id=>{const f=fact(id);return f?[f]:[]});
 const meta = (value: z.infer<typeof metadata>) => { if(!value||!value.text.trim())return null; const f=fact(value.evidenceId); return f && f.quote.toLowerCase().includes(value.text.toLowerCase()) ? {...f,text:value.text}:null; };
 return { ...model, companyName:meta(model.companyName), city:meta(model.city), industry:meta(model.industry), companyFacts:facts(model.companyFacts), services:facts(model.services), audience:facts(model.audience), positioning:facts(model.positioning), tone:facts(model.tone), opportunities:model.opportunities.flatMap(o=>{const observation=fact(o.evidenceId);return observation && capabilities.some(c=>c.id===o.capabilityId)?[{capabilityId:o.capabilityId,observation,hypothesis:o.hypothesis,question:o.question}]:[]}) };
}
