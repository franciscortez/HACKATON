"use client";
import type { BriefOutput, Fact } from "../schemas/brief.schema";

export function BriefReview({ output, onChange }: { output: BriefOutput; onChange: (output: BriefOutput) => void }) {
  const field = "w-full resize-y border-b border-rule-l bg-transparent py-2 text-sm leading-relaxed focus:border-blue";
  const editFact = (items: Fact[], index: number, text: string) => items.map((fact, i) => i === index ? { ...fact, text } : fact);
  const evidence = (fact: Fact) => {
    const source = output.sources.find(s => s.id === fact.sourceId);
    return <details className="mb-3 text-xs text-ink-soft"><summary className="cursor-pointer py-1">Evidence · {fact.sourceId}</summary><blockquote className="my-2 border-l-2 border-blue pl-3">{fact.quote}</blockquote>{source && <a className="break-all underline" href={source.url} target="_blank" rel="noopener noreferrer">{source.title} ({source.origin})</a>}</details>;
  };
  const facts = (title: string, items: Fact[], key: "companyFacts" | "contactFacts", label: string) => <section className="mt-6"><h3 className="label">{title}</h3>{items.length ? items.map((fact, index) => <div key={`${key}-${index}`}><textarea aria-label={`${label} ${index + 1}`} value={fact.text} maxLength={240} rows={2} className={field} onChange={event => onChange({ ...output, [key]: editFact(items, index, event.target.value) })} />{evidence(fact)}</div>) : <p className="mt-2 text-sm text-ink-soft">Not verified. Confirm during the call.</p>}</section>;
  return <article className="min-w-0 bg-white p-5 sm:p-8" aria-label="Call brief review">
    <p className="label text-blue">03 · Review</p><h2 className="mt-3 break-words text-3xl font-semibold tracking-tight">{output.companyName?.text ?? "Company details unknown"}</h2>
    <p className="mt-2 text-sm text-ink-soft">{output.contact} · {output.city?.text ?? "Location unknown"} · {output.industry?.text ?? "Industry unknown"}</p>
    <p className="mt-4 border-y border-rule-l py-3 text-sm"><strong>Call objective:</strong> {output.objective}</p>
    <p className="mt-3 text-xs text-ink-soft">Check the evidence before approving. Your edits are reviewed notes, not newly verified research.</p>
    {facts("Company facts", output.companyFacts, "companyFacts", "Company fact")}
    {facts("Contact background", output.contactFacts, "contactFacts", "Contact fact")}
    <section className="mt-6"><h3 className="label">Likely needs · Inference</h3>{output.likelyNeeds.map((item, index) => <div key={index}><textarea aria-label={`Likely need ${index + 1}`} rows={2} maxLength={240} className={field} value={item.text} onChange={event => onChange({ ...output, likelyNeeds: output.likelyNeeds.map((n, i) => i === index ? { ...n, text: event.target.value } : n) })} /><p className="text-xs text-ink-soft">Based on {item.sourceIds.join(", ")}; confirm on the call.</p></div>)}</section>
    <section className="mt-6"><h3 className="label">Local competitors</h3>{output.competitors.length ? output.competitors.map((competitor, index) => <div key={index} className="mt-3"><p className="font-medium">{competitor.name}</p><textarea aria-label={`Competitor note ${index + 1}`} className={field} maxLength={240} rows={2} value={competitor.text} onChange={event => onChange({ ...output, competitors: output.competitors.map((c, i) => i === index ? { ...c, text: event.target.value } : c) })} />{evidence(competitor)}</div>) : <p className="mt-2 text-sm text-ink-soft">No same-city competitor was verified.</p>}</section>
    <section className="mt-6"><h3 className="label">Talking points</h3>{output.talkingPoints.map((text, index) => <textarea key={index} aria-label={`Talking point ${index + 1}`} className={field} maxLength={180} rows={2} value={text} onChange={event => onChange({ ...output, talkingPoints: output.talkingPoints.map((t, i) => i === index ? event.target.value : t) })} />)}</section>
    <section className="mt-6 border-t border-warn pt-3"><h3 className="label text-warn">Gaps to confirm</h3>{output.gaps.map((text, index) => <textarea key={index} aria-label={`Gap ${index + 1}`} className={field} maxLength={180} rows={2} value={text} onChange={event => onChange({ ...output, gaps: output.gaps.map((g, i) => i === index ? event.target.value : g) })} />)}</section>
    <details className="mt-6 border-t border-rule-l pt-3"><summary className="label cursor-pointer">All sources ({output.sources.length})</summary>{output.sources.map(source => <div key={source.id} className="mt-3 text-xs"><a href={source.url} target="_blank" rel="noopener noreferrer" className="break-all underline">{source.id} · {source.title}</a><p>{source.origin} · retrieved {new Date(source.fetchedAt).toLocaleDateString("en-AU")}</p></div>)}</details>
  </article>;
}
