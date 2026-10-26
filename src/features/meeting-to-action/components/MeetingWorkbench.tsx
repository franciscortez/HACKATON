"use client";

import { useEffect, useRef, useState } from "react";
import { ApprovalBar } from "@/components/workflow/ApprovalBar";
import { CostNote } from "@/components/workflow/CostNote";
import { ErrorPanel } from "@/components/workflow/ErrorPanel";
import { ExportMenu } from "@/components/workflow/ExportMenu";
import { ProgressBar } from "@/components/workflow/ProgressBar";
import { SourcePanel } from "@/components/workflow/SourcePanel";
import { Stepper } from "@/components/workflow/Stepper";
import { Tabs } from "@/components/workflow/Tabs";
import { ActionRegisterTable } from "@/features/meeting-to-action/components/ActionRegisterTable";
import { DecisionsList } from "@/features/meeting-to-action/components/DecisionsList";
import { EmailDraftEditor } from "@/features/meeting-to-action/components/EmailDraftEditor";
import { TranscriptCheck } from "@/features/meeting-to-action/components/TranscriptCheck";
import { ACCEPTED_FILES, MAX_CHARS } from "@/features/meeting-to-action/constants";
import { toCsv, toEmailText, toMarkdown, toSlack } from "@/features/meeting-to-action/services/export";
import { applyRegisterEdit } from "@/features/meeting-to-action/services/review";
import type { MeetingOutput } from "@/features/meeting-to-action/types";
import { canExport, nextStatus } from "@/lib/approval";
import { saveRun } from "@/services/runs";
import { getSettings } from "@/services/settings";
import type { ApprovalStatus, CostNote as Cost } from "@/types/run";
import type { RunProgress } from "@/types/tool";

type Phase = "source" | "running" | "review";
type ReviewTab = "actions" | "decisions" | "questions" | "email";
interface RunError {
  code: string;
  message: string;
}
type RunEvent =
  | ({ type: "progress" } & RunProgress)
  | { type: "result"; output: MeetingOutput; cost: Cost }
  | ({ type: "error" } & RunError);

const settings = getSettings();
const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" }).format(new Date());

/** Reads the run's newline-delimited JSON stream, calling `onEvent` for each event. */
async function readEvents(res: Response, onEvent: (event: RunEvent) => void) {
  const reader = res.body!.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) if (line.trim()) onEvent(JSON.parse(line) as RunEvent);
  }
  if (buffer.trim()) onEvent(JSON.parse(buffer) as RunEvent);
}

export function MeetingWorkbench() {
  const [transcript, setTranscript] = useState("");
  const [sourceName, setSourceName] = useState<string>();
  const [title, setTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [phase, setPhase] = useState<Phase>("source");
  const [progress, setProgress] = useState<RunProgress>({ done: 0, total: 1, label: "Starting" });
  const [output, setOutput] = useState<MeetingOutput | null>(null);
  const [cost, setCost] = useState<Cost | null>(null);
  const [status, setStatus] = useState<ApprovalStatus>("DRAFT");
  const [emailEdited, setEmailEdited] = useState(false);
  const [error, setError] = useState<RunError | null>(null);
  const [tab, setTab] = useState<ReviewTab>("actions");
  const runId = useRef("");
  const top = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (phase === "running") progressRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [phase]);

  const scrollTop = () => top.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  function persist(next: MeetingOutput, nextStatusValue: ApprovalStatus) {
    saveRun("leveric", { id: runId.current, toolSlug: "meeting-to-action", createdAt: new Date().toISOString(), status: nextStatusValue, output: next });
  }

  function edit(next: MeetingOutput) {
    const s = nextStatus(status, "edit");
    setOutput(next);
    setStatus(s);
    persist(next, s);
  }

  function approve() {
    if (!output) return;
    const s = nextStatus(status, "approve");
    setStatus(s);
    persist(output, s);
  }

  function startAgain() {
    setTranscript("");
    setSourceName(undefined);
    setTitle("");
    setMeetingDate("");
    setOutput(null);
    setError(null);
    setPhase("source");
    scrollTop();
  }

  async function run() {
    setPhase("running");
    setProgress({ done: 0, total: 1, label: "Starting" });
    setError(null);
    let failed: RunError | null = null;
    try {
      const res = await fetch("/api/tools/meeting-to-action/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: { transcript, meetingDate: meetingDate || today(), title: title || undefined } }),
      });
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => null);
        failed = body?.error ?? { code: "http_error", message: "The server could not run this. Try again." };
      } else {
        await readEvents(res, (event) => {
          if (event.type === "progress") setProgress(event);
          else if (event.type === "error") failed = event;
          else {
            runId.current = `run-${Date.now()}`;
            setOutput(event.output);
            setCost(event.cost);
            setStatus("DRAFT");
            setEmailEdited(false);
            setTab("actions");
            persist(event.output, "DRAFT");
          }
        });
      }
    } catch {
      failed = { code: "network", message: "Could not reach the server. Check your connection and try again." };
    }
    if (failed) {
      setError(failed);
      setPhase("source");
    } else {
      setPhase("review");
    }
    scrollTop();
  }

  const step = phase === "source" ? 0 : phase === "running" ? 1 : status === "APPROVED" ? 3 : 2;
  const tooLong = transcript.length > MAX_CHARS;
  const running = phase === "running";

  return (
    <div ref={top} className="scroll-mt-20 pb-4">
      <Stepper active={step} onBack={phase === "review" ? () => setPhase("source") : undefined} />

      {phase !== "review" && (
        <section aria-label="Source" aria-busy={running} className="reveal mt-6">
          {error && <ErrorPanel message={error.message} onRetry={run} />}
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_20rem]">
            <fieldset disabled={running} className="min-w-0 transition-opacity duration-500 disabled:opacity-60">
              <SourcePanel
              value={transcript}
              fileName={sourceName}
              onChange={(text, fileName) => {
                setTranscript(text);
                setSourceName(fileName);
              }}
              accept={ACCEPTED_FILES}
              maxChars={MAX_CHARS}
              placeholder={"Paste any meeting transcript. Speaker names help, for example:\n[0:13] Sam: Alex, can you send the proposal by Friday?"}
              />
            </fieldset>
            <div className="flex flex-col gap-4">
              <fieldset disabled={running} className="flex flex-col gap-4 transition-opacity duration-500 disabled:opacity-60">
                <label className="flex flex-col gap-1">
                  <span className="label text-ink-soft">Meeting title · optional</span>
                  <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Weekly L10" className="border border-rule-l bg-white px-2 py-1.5" />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="label text-ink-soft">Meeting date · blank means today</span>
                  <input type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} className="border border-rule-l bg-white px-2 py-1.5" />
                </label>
              </fieldset>
              <div ref={progressRef} className="flex-1">
                {running ? (
                  <ProgressBar done={progress.done} total={progress.total} label={progress.label} />
                ) : (
                  <TranscriptCheck transcript={transcript} />
                )}
              </div>
              <button
                type="button"
                onClick={run}
                disabled={!transcript.trim() || tooLong || running}
                className="arrow-link bg-ink px-5 py-3 text-left font-medium text-white transition-colors duration-300 hover:bg-blue disabled:cursor-not-allowed disabled:bg-ink-soft/50"
              >
                {running ? "Extracting…" : <>Extract actions <span className="arrow">→</span></>}
              </button>
              {output && !running && (
                <button type="button" onClick={() => setPhase("review")} className="label arrow-link text-left text-ink-soft hover:text-ink">
                  Back to the last result <span className="arrow">→</span>
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      {phase === "review" && output && (
        <div className="reveal mt-6">
          <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
            <p className="font-mono text-xs text-ink-soft">
              {title ? `${title} · ` : ""}
              {sourceName ?? "Pasted text"} · {transcript.length.toLocaleString("en-AU")} characters
            </p>
            <button type="button" onClick={startAgain} className="label arrow-link text-ink hover:text-blue">
              New transcript <span className="arrow">→</span>
            </button>
          </div>
          {output.warnings.includes("no-speakers") && (
            <p role="alert" className="mb-4 border-l-2 border-warn pl-3 text-sm">
              No speaker names found. Only people named in the text can own tasks; the rest are left unassigned.
            </p>
          )}
          <Tabs
            active={tab}
            onChange={(id) => setTab(id as ReviewTab)}
            tabs={[
              { id: "actions", label: "Actions", count: output.actions.length },
              { id: "decisions", label: "Decisions", count: output.decisions.length },
              { id: "questions", label: "Questions", count: output.openQuestions.length },
              { id: "email", label: "Email" },
            ]}
          >
            {tab === "actions" && (
              <ActionRegisterTable
                actions={output.actions}
                people={output.people}
                onChange={(actions) => edit(applyRegisterEdit(output, actions, { emailEdited, settings, title: title || undefined }))}
              />
            )}
            {tab === "decisions" && <DecisionsList items={output.decisions} empty="No decisions were recorded in this meeting." />}
            {tab === "questions" && <DecisionsList items={output.openQuestions} empty="No open questions were left in this meeting." />}
            {tab === "email" && (
              <EmailDraftEditor
                email={output.email}
                onChange={(email) => {
                  setEmailEdited(true);
                  edit({ ...output, email });
                }}
              />
            )}
          </Tabs>
          <ApprovalBar
            status={status}
            onApprove={approve}
            actions={
              <ExportMenu
                enabled={canExport(status)}
                options={[
                  { label: "Markdown", build: () => toMarkdown(output) },
                  { label: "CSV", build: () => toCsv(output), fileName: `actions-${meetingDate || today()}.csv`, mime: "text/csv" },
                  { label: "Slack", build: () => toSlack(output) },
                  { label: "Email", build: () => toEmailText(output) },
                ]}
              />
            }
          >
            {cost && <CostNote cost={cost} />}
          </ApprovalBar>
        </div>
      )}
    </div>
  );
}
