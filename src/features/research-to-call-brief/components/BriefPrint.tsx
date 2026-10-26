import type { BriefOutput, Fact } from "../schemas/brief.schema";
export function BriefPrint({ output, approved }: { output: BriefOutput; approved: boolean }) {
  const facts = (items: Fact[]) => items.map((item, i) => <li key={i}>{item.text} [{item.sourceId}]</li>);
  const ids = new Set([output.companyName, output.city, output.industry, ...output.companyFacts, ...output.contactFacts, ...output.competitors].flatMap(f => f ? [f.sourceId] : []).concat(output.likelyNeeds.flatMap(n => n.sourceIds)));
  return <article className="call-brief-print" aria-hidden="true">
    {!approved ? <p>Approve this brief before exporting.</p> : <>
      <p>LEVERIC · CALL BRIEF · {new Date(output.generatedAt).toLocaleDateString("en-AU")}</p>
      <h1>{output.companyName?.text ?? "Company details unknown"}</h1><p>{output.contact} · {output.city?.text ?? "Location unknown"} · {output.industry?.text ?? "Industry unknown"}</p>
      <p><strong>Objective:</strong> {output.objective}</p>
      <h2>Company facts</h2><ul>{facts(output.companyFacts)}</ul>
      <h2>Contact background</h2><ul>{facts(output.contactFacts)}</ul>
      <h2>Likely needs — Inference</h2><ul>{output.likelyNeeds.map((item, i) => <li key={i}>{item.text} [{item.sourceIds.join(", ")}]</li>)}</ul>
      <h2>Local competitors</h2><ul>{output.competitors.map((c, i) => <li key={i}><strong>{c.name}:</strong> {c.text} [{c.sourceId}]</li>)}</ul>
      <h2>Talking points</h2><ul>{output.talkingPoints.map((text, i) => <li key={i}>{text}</li>)}</ul>
      <h2>Gaps to confirm</h2><ul>{output.gaps.map((text, i) => <li key={i}>{text}</li>)}</ul>
      <footer>{output.sources.filter(s => ids.has(s.id)).map(s => <a key={s.id} href={s.url}>[{s.id}] {new URL(s.url).hostname} </a>)}</footer>
    </>}
  </article>;
}
