import type { Brief, Fact } from "../schemas/brief.schema";
import type { ResearchSource } from "@/services/research/types";

const normalise = (text: string) => text.toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, " ").trim();
const containsTerm = (text: string, term: string) => new RegExp(`(?:^|[^\\p{L}\\p{N}])${normalise(term).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:$|[^\\p{L}\\p{N}])`, "u").test(normalise(text));
export function checkBrief(brief: Brief, sources: ResearchSource[]): Brief {
  const gaps = [...brief.gaps];
  const verify = (fact: Fact): Fact | null => {
    if (!normalise(fact.quote).includes(normalise(fact.text))) return null;
    const matches = sources.filter(s => normalise(s.text).includes(normalise(fact.quote)));
    const source = matches.find(s => s.id === fact.sourceId) ?? (matches.length === 1 ? matches[0] : undefined);
    return source ? { ...fact, sourceId: source.id } : null;
  };
  const metadata = (fact: Fact | null) => fact ? verify(fact) : null;
  const keep = (facts: Fact[]) => facts.flatMap(fact => {
    const checked = verify(fact);
    if (checked) return [checked];
    gaps.push(`Not verified: ${fact.text}`.slice(0, 180));
    return [];
  });
  const city = metadata(brief.city), industry = metadata(brief.industry);
  const competitors = brief.competitors.flatMap(c => {
    const checked = verify(c);
    return checked && city && industry && normalise(c.city) === normalise(city.text) && normalise(c.industry) === normalise(industry.text) &&
      containsTerm(c.quote, c.name) && containsTerm(c.quote, c.city) && containsTerm(c.quote, c.industry) ? [{ ...c, ...checked }] : [];
  });
  if (!city || !industry) gaps.push("Local competitors need a verified company city and industry.");
  if (competitors.length < brief.competitors.length) gaps.push("Some competitor details were not verified for the same city and industry.");
  const likelyNeeds = brief.likelyNeeds.filter(item => item.sourceIds.every(id => sources.some(s => s.id === id)));
  if (likelyNeeds.length < brief.likelyNeeds.length) gaps.push("Some suggested needs lacked supporting evidence.");
  return { ...brief, companyName: metadata(brief.companyName), city, industry, companyFacts: keep(brief.companyFacts),
    contactFacts: keep(brief.contactFacts), competitors, likelyNeeds, gaps: [...new Set(gaps)].slice(0, 12) };
}

export function checkContact(brief: Brief, sources: ResearchSource[], contact: string, companyUrl: string): Brief {
  const normalName = normalise(contact);
  // A partial name cannot safely distinguish people with the same first name.
  const fullName = normalName.split(/\s+/).length >= 2;
  const contactFacts = fullName ? brief.contactFacts.filter(fact => {
    const source = sources.find(s => s.id === fact.sourceId);
    return source && containsTerm(fact.quote, normalName) && normalise(source.text).includes(normalise(fact.quote)) &&
      normalise(fact.quote).includes(normalise(fact.text)) && (new URL(source.url).hostname === new URL(companyUrl).hostname ||
      (brief.companyName && containsTerm(fact.quote, brief.companyName.text)));
  }) : [];
  const gaps = contactFacts.length ? brief.gaps : [...new Set([...brief.gaps, fullName ? "Contact identity and employer could not be verified." : "Enter a full contact name to verify identity; partial names can match several people."])].slice(0, 12);
  return { ...brief, contactFacts, gaps };
}

export function coreText(brief: Brief, objective: string): string {
  return [brief.companyName?.text, brief.city?.text, brief.industry?.text, objective,
    ...brief.companyFacts.map(f => f.text), ...brief.contactFacts.map(f => f.text),
    ...brief.likelyNeeds.map(f => f.text), ...brief.competitors.map(c => `${c.name}: ${c.text}`),
    ...brief.talkingPoints, ...brief.gaps].filter(Boolean).join("\n");
}
export function coreWordCount(brief: Brief, objective: string) { return coreText(brief, objective).trim().split(/\s+/).filter(Boolean).length; }

const escapeMarkdown = (text: string) => text.replace(/[\\`*_{}\[\]<>#!|]/g, "\\$&");
export function toMarkdown(brief: Brief, sources: ResearchSource[], objective: string) {
  const fact = (f: Fact) => {
    const source = sources.find(s => s.id === f.sourceId);
    return `- ${escapeMarkdown(f.text)}${source ? ` [${escapeMarkdown(source.title || f.sourceId)}](<${source.url}>)` : " (Edited; verify source)"}`;
  };
  return [
    `# ${escapeMarkdown(brief.companyName?.text ?? "Company details unknown")} — Call brief`,
    `Objective: ${escapeMarkdown(objective)}`,
    "## Company facts", ...[brief.city, brief.industry].filter((f): f is Fact => f !== null).map(fact), ...brief.companyFacts.map(fact),
    "## Contact", ...brief.contactFacts.map(fact),
    "## Likely needs — Inference", ...brief.likelyNeeds.map(n => `- ${escapeMarkdown(n.text)} (${n.sourceIds.join(", ")})`),
    "## Local competitors", ...brief.competitors.map(c => fact({ ...c, text: `${c.name}: ${c.text}` })),
    "## Talking points", ...brief.talkingPoints.map(t => `- ${escapeMarkdown(t)}`),
    "## Gaps", ...brief.gaps.map(g => `- ${escapeMarkdown(g)}`),
    "## Sources", ...sources.map(s => `- [${escapeMarkdown(s.title || s.id)}](<${s.url}>) — ${s.origin}, retrieved ${s.fetchedAt}`),
  ].join("\n\n");
}
