import type { ResearchSource } from "@/services/research/types";
import type { Fact } from "../schemas/brief.schema";
import type { CallSheet, Dossier, DossierModel, DossierOutput } from "../schemas/dossier.schema";
import { capabilities } from "./capabilities";

const normal = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();
export function verifyFact(fact: Fact, sources: ResearchSource[]): Fact | null {
  if (!normal(fact.quote).includes(normal(fact.text))) return null;
  const matches = sources.filter(s => normal(s.text).includes(normal(fact.quote)));
  const source = matches.find(s => s.id === fact.sourceId) ?? (matches.length === 1 ? matches[0] : undefined);
  return source ? { ...fact, sourceId: source.id } : null;
}
export function validateDossier(model: DossierModel, sources: ResearchSource[]): DossierModel {
  const keep = (facts: Fact[]) => facts.flatMap(f => { const checked = verifyFact(f, sources); return checked ? [checked] : []; });
  return { ...model, companyName: model.companyName ? verifyFact(model.companyName, sources) : null,
    city: model.city ? verifyFact(model.city, sources) : null, industry: model.industry ? verifyFact(model.industry, sources) : null,
    companyFacts: keep(model.companyFacts),
    services: keep(model.services), audience: keep(model.audience), positioning: keep(model.positioning), tone: keep(model.tone),
    opportunities: model.opportunities.flatMap(o => {
      const observation = verifyFact(o.observation, sources);
      return observation && capabilities.some(c => c.id === o.capabilityId) ? [{ ...o, observation }] : [];
    }),
  };
}
export function buildCallSheet(company: string, dossier: Dossier, gaps: string[]): CallSheet {
  return { company, summary: dossier.summary,
    opener: "What would make this conversation useful for your business?",
    talkingPoints: dossier.opportunities.map(o => `${o.observation.text} — Possible opportunity: ${o.hypothesis}`).slice(0, 3),
    questions: [...dossier.opportunities.map(o => o.question), ...gaps.map(g => `Confirm: ${g}`)].slice(0, 5),
  };
}
export function editDossier<T extends { dossier: Dossier; callSheet: CallSheet; callSheetStale: boolean }>(state: T, dossier: Dossier): T {
  return { ...state, dossier, callSheetStale: true };
}
export function rebuildCallSheet<T extends { dossier: Dossier; callSheet: CallSheet; callSheetStale: boolean }>(state: T, company: string, gaps: string[]): T {
  return { ...state, callSheet: buildCallSheet(company, state.dossier, gaps), callSheetStale: false };
}
export function sheetWords(sheet: CallSheet) { return [sheet.company, sheet.summary, sheet.opener, ...sheet.talkingPoints, ...sheet.questions].join(" ").trim().split(/\s+/).filter(Boolean).length; }
const escape = (s: string) => s.replace(/[\\`*_{}\[\]<>#!|]/g, "\\$&");
export function sheetMarkdown(output: DossierOutput) {
  const s = output.callSheet;
  return [`# ${escape(s.company)} — Call sheet`, escape(s.summary), "## Open the call", escape(s.opener), "## Possible opportunities", ...s.talkingPoints.map(t => `- ${escape(t)}`), "## Questions", ...s.questions.map(t => `- ${escape(t)}`), "## Sources", ...output.sources.map(s => `- [${escape(s.title)}](<${s.url}>)`)].join("\n\n");
}
export function dossierMarkdown(output: DossierOutput) {
  const d = output.dossier;
  const facts = (items: Fact[]) => items.map(f => `- ${escape(f.text)} (${escape(f.sourceId)})\n  > ${escape(f.quote)}`);
  return [`# ${escape(output.companyName?.text ?? "Business")} — Dossier`, `Retrieved: ${output.generatedAt}`, "## Summary — synthesis", escape(d.summary),
    "## Company facts", ...facts(output.companyFacts), "## Services", ...facts(d.services), "## Audience", ...facts(d.audience), "## Positioning", ...facts(d.positioning), "## Messaging", ...facts(d.tone),
    "## Observed website brand", ...[...output.brand.colors, ...output.brand.fonts, ...output.brand.imagery, ...output.brand.actions, ...(output.brand.logo ? [output.brand.logo] : [])].map(o => `- ${escape(o.role)}: ${escape(o.value)} (${escape(o.sourceId)}, ${escape(o.selector)})`),
    "## Possible Leveric opportunities — inference", ...d.opportunities.map(o => `- ${escape(capabilities.find(c => c.id === o.capabilityId)?.name ?? o.capabilityId)}: ${escape(o.hypothesis)}\n  Evidence: ${escape(o.observation.quote)} (${escape(o.observation.sourceId)})\n  Ask: ${escape(o.question)}`),
    "## Gaps", ...output.gaps.map(g => `- ${escape(g)}`), "## Review notes", output.editedSections.length ? "Contains user edits; source extracts remain original evidence." : "Review source extracts and inferences before use.",
    "## Sources", ...output.sources.map(s => `- [${escape(s.title)}](<${s.url}>) — ${s.fetchedAt}`)].join("\n\n");
}
