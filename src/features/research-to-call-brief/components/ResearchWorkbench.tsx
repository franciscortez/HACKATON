"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { z } from "zod";
import { useClient } from "@/components/layout/ClientContext";
import { CostNote } from "@/components/workflow/CostNote";
import { ExportMenu } from "@/components/workflow/ExportMenu";
import { StatusChip } from "@/components/workflow/StatusChip";
import { costSchema } from "@/schemas/run.schema";
import { listRuns, saveRun } from "@/services/runs";
import { incrementUsage } from "@/services/usage";
import type { PublicClient } from "@/services/clients";
import { safeGet, safeSet } from "@/lib/storage";
import type { ApprovalStatus, CostNote as Cost } from "@/types/run";
import { inputSchema } from "../schemas/brief.schema";
import { isDossier, savedOutputSchema, type SavedOutput } from "../schemas/dossier.schema";
import { coreWordCount, toMarkdown } from "../services/brief";
import { dossierMarkdown, sheetMarkdown, sheetWords } from "../services/dossier";
import { BriefReview } from "./BriefReview";
import { BriefPrint } from "./BriefPrint";
import { DossierReview } from "./DossierReview";
import { CallSheetPrint } from "./CallSheetPrint";
import "./print.css";
import "./dossier.css";

const resultSchema = z.object({ output: savedOutputSchema, cost: costSchema });
const errorSchema = z.object({ error: z.object({ message: z.string(), research: costSchema.shape.research }) });
const countKey = (client: string) => `workbench:research-usage:${client}:${new Date().toISOString().slice(0, 7)}`;
type Result = { id: string; output: SavedOutput; cost?: Cost; status: ApprovalStatus };
export function ResearchWorkbench() {
  const { client } = useClient();
  return client ? <ResearchWorkspace key={client.id} client={client} /> : <p>Loading clients…</p>;
}
function ResearchWorkspace({ client }: { client: PublicClient }) {
  const [companyUrl, setUrl] = useState(""), [pastedText, setPasted] = useState("");
  const [showPaste, setShowPaste] = useState(client.dataPolicy === "local-only");
  const [result, setResult] = useState<Result | null>(null);
  const [running, setRunning] = useState(false), [error, setError] = useState("");
  const [elapsed, setElapsed] = useState(0), [used, setUsed] = useState(() => safeGet<number>(countKey(client.id), 0));
  const [history, setHistory] = useState(() => listRuns(client.id).filter(r => r.toolSlug === "research-to-call-brief"));
  const [failedCost, setFailedCost] = useState<Cost["research"]>();
  const controller = useRef<AbortController | null>(null), report = useRef<HTMLDivElement>(null);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (!running) return;
    const start = Date.now(), timer = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [running]);
  const cap = client.tools?.["research-to-call-brief"]?.runsPerMonth ?? 20;
  const v2 = result && isDossier(result.output) ? result.output : null;
  const words = result ? v2 ? sheetWords(v2.callSheet) : coreWordCount(result.output, result.output.objective) : 0;
  const approved = result?.status === "APPROVED" && !v2?.callSheetStale;
  function persist(next: Result) {
    setResult(next);
    if (!saveRun(client.id, { id: next.id, toolSlug: "research-to-call-brief", createdAt: next.output.generatedAt, output: next.output, status: next.status, cost: next.cost })) setError("Browser storage is unavailable. Keep this page open until you export.");
    setHistory(listRuns(client.id).filter(r => r.toolSlug === "research-to-call-brief"));
  }
  function update(output: SavedOutput) {
    if (result) persist({ ...result, output, status: "EDITED" });
  }
  function restore(id: string) {
    if (running) return;
    const saved = history.find(r => r.id === id), parsed = savedOutputSchema.safeParse(saved?.output);
    if (!saved || !parsed.success) { setError("This saved report cannot be read. Create a new research run."); return; }
    const savedCost = costSchema.safeParse(saved.cost);
    setResult({ id: saved.id, output: parsed.data, status: saved.status, cost: savedCost.success ? savedCost.data : undefined });
    setError("");
  }
  async function run(event: React.FormEvent) {
    event.preventDefault(); if (running) return;
    const parsed = inputSchema.safeParse({ companyUrl, pastedText });
    if (!parsed.success) { setError("Enter a public business website, such as example.com."); return; }
    if (used >= cap) { setError(`This client has used ${used} of ${cap} research runs this month.`); return; }
    const abort = new AbortController(); controller.current = abort;
    setRunning(true); setElapsed(0); setError(""); setFailedCost(undefined); setResult(null);
    try {
      const response = await fetch("/api/tools/research-to-call-brief/runs", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clientId: client.id, input: parsed.data, usedThisMonth: used }), signal: abort.signal });
      const body: unknown = await response.json();
      if (abort.signal.aborted) return;
      if (!response.ok) {
        const failure = errorSchema.safeParse(body);
        setError(failure.success ? failure.data.error.message : "Research could not finish. Paste source text to continue.");
        if (failure.success) setFailedCost(failure.data.error.research);
        setShowPaste(true); return;
      }
      const parsedResult = resultSchema.safeParse(body);
      if (!parsedResult.success) { setError("The response could not be read safely. Paste source text to continue."); setShowPaste(true); return; }
      persist({ ...parsedResult.data, id: crypto.randomUUID(), status: "DRAFT" });
      safeSet(countKey(client.id), used + 1); setUsed(used + 1); incrementUsage(client.id, new Date());
      requestAnimationFrame(() => report.current?.focus());
    } catch { if (!abort.signal.aborted) { setError("Could not reach the server. Check your connection or paste source text."); setShowPaste(true); } }
    finally { if (controller.current === abort) setRunning(false); }
  }
  function print() {
    if (!approved || words > 550) return;
    const paper = document.querySelector<HTMLElement>(".call-brief-print");
    if (paper) {
      paper.classList.add("measure-print"); const height = paper.scrollHeight; paper.classList.remove("measure-print");
      if (height > 1000) { setError("This call sheet exceeds one A4 page. Shorten it before printing; no text has been removed."); return; }
    }
    window.print();
  }
  return <div className="research-workbench">
    <form onSubmit={run} className="dossier-start" aria-label="Business research source" aria-busy={running}>
      <label htmlFor="research-url">Business URL</label><div className="dossier-url-row"><input id="research-url" required type="text" inputMode="url" autoComplete="url" maxLength={2048} value={companyUrl} onChange={e => setUrl(e.target.value)} placeholder="Paste a website, e.g. business.com.au" disabled={running} /><button type="submit" disabled={running || used >= cap} className="dossier-primary">{running ? `Researching · ${elapsed}s` : "Research website"}</button></div>
      <div className="dossier-meta"><p className="dossier-note">{client.dataPolicy === "local-only" ? "Local-only: paste source text. No website or cloud access." : `Public pages only · US$${(client.tools?.["research-to-call-brief"]?.maxRunUsd ?? 0).toFixed(2)} target, not a guaranteed ceiling.`}</p><p className="dossier-note">{used} / {cap} research runs · browser counter</p></div>
      {client.synthetic && <p className="dossier-note">Synthetic demo client · research uses the website you enter.</p>}
      <details className="dossier-paste" open={showPaste} onToggle={e => setShowPaste(e.currentTarget.open)}><summary>Paste source text instead</summary><label>Pasted source text<textarea aria-label="Pasted source text" rows={6} maxLength={40000} value={pastedText} onChange={e => setPasted(e.target.value)} disabled={running} /></label><p>{pastedText.length.toLocaleString("en-AU")} / 40,000 characters. Pasted text skips Apify; visual branding is unavailable.</p></details>
    </form>
    {running && <div className="dossier-busy"><p role="status">Reading public pages and preparing your dossier · {elapsed}s. Allow up to four minutes.</p><button type="button" className="dossier-secondary mt-3" onClick={() => { controller.current?.abort(); setRunning(false); setError("Research cancelled. A started Apify run may have incurred charges. Check usage before retrying."); }}>Cancel research</button></div>}
    {error && <div role="alert" className="dossier-alert"><p>{error}</p>{failedCost && <p>Apify usage: {failedCost.costUsd === null ? "charge pending" : `US$${failedCost.costUsd.toFixed(4)}`}.</p>}</div>}
    {history.length > 0 && <label className="dossier-history">Previous research<select aria-label="Previous research" disabled={running} value={result?.id ?? ""} onChange={e => restore(e.target.value)}><option value="" disabled>Select a saved report</option>{history.map(r => <option value={r.id} key={r.id}>{new Date(r.createdAt).toLocaleString("en-AU")} · {r.status}</option>)}</select></label>}
    <div ref={report} tabIndex={-1} aria-label="Research result">
      {result ? v2 ? <DossierReview key={result.id} output={v2} onChange={update} /> : <><p className="dossier-note">Legacy call brief · visual brand research was not captured.</p><BriefReview output={result.output} onChange={update} /></> : !running && <div className="dossier-empty"><div><h2>Know the business before the call.</h2><p className="dossier-muted">One website. A clear picture of what they do, how they present themselves and where Leveric could help.</p></div><ol><li><strong>Understand the business.</strong> Offerings, audience and positioning.</li><li><strong>See their brand.</strong> Website colours, type and messaging.</li><li><strong>Prepare your pitch.</strong> Evidence, opportunities and questions.</li></ol></div>}
    </div>
    {result && <div className="dossier-footer"><div className="dossier-approval"><div><StatusChip value={result.status} /><p className="dossier-note">{words} / 550 words in call sheet{words > 550 ? " · shorten before printing" : ""}</p></div><button type="button" className="dossier-primary" disabled={approved || !!v2?.callSheetStale} onClick={() => persist({ ...result, status: "APPROVED" })}>{approved ? "Approved" : "Approve"}</button></div>
      {result.cost && <CostNote cost={result.cost} />}
      <ExportMenu enabled={!!approved} options={v2 ? [
        { label: "Download dossier", fileName: "business-dossier.md", mime: "text/markdown", build: () => dossierMarkdown(v2) },
        { label: "Copy call sheet", build: () => sheetMarkdown(v2) },
        { label: "Download call sheet", fileName: "call-sheet.md", mime: "text/markdown", build: () => sheetMarkdown(v2) },
      ] : [{ label: "Copy Markdown", build: () => toMarkdown(result.output, result.output.sources, result.output.objective) }, { label: "Download Markdown", fileName: "call-brief.md", mime: "text/markdown", build: () => toMarkdown(result.output, result.output.sources, result.output.objective) }]} />
      <button type="button" onClick={print} disabled={!approved || words > 550} className="dossier-secondary mt-3">Print / Save PDF</button>
      {createPortal(v2 ? <CallSheetPrint output={v2} approved={!!approved && words <= 550} /> : <BriefPrint output={result.output} approved={!!approved && words <= 550} />, document.body)}
    </div>}
  </div>;
}
