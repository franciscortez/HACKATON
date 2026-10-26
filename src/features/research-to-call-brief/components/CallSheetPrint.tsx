import type { DossierOutput } from "../schemas/dossier.schema";
export function CallSheetPrint({ output, approved }: { output: DossierOutput; approved: boolean }) {
  const s = output.callSheet;
  return <article className="call-brief-print" aria-hidden="true">{!approved ? <p>Approve a current call sheet before exporting.</p> : <>
    <p>LEVERIC · CALL SHEET · {new Date(output.generatedAt).toLocaleDateString("en-AU")}</p><h1>{s.company}</h1><p>{s.summary}</p>
    <h2>Open the call</h2><p>{s.opener}</p><h2>Possible opportunities — validate first</h2><ul>{s.talkingPoints.map((t, i) => <li key={i}>{t}</li>)}</ul>
    <h2>Ask and confirm</h2><ul>{s.questions.map((q, i) => <li key={i}>{q}</li>)}</ul>
    <footer>Based on public source material and reviewed notes. {output.sources.map(source => <a href={source.url} key={source.id}>[{source.id}] {new URL(source.url).hostname}{new URL(source.url).pathname}</a>)}</footer>
  </>}</article>;
}
