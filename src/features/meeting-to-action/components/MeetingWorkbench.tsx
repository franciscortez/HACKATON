"use client";

import { useEffect, useRef, useState } from "react";
import { useClient } from "@/components/layout/ClientContext";
import { ApprovalBar } from "@/components/workflow/ApprovalBar";
import { CostNote } from "@/components/workflow/CostNote";
import { ErrorPanel } from "@/components/workflow/ErrorPanel";
import { ExportMenu } from "@/components/workflow/ExportMenu";
import { SourcePanel } from "@/components/workflow/SourcePanel";
import { Stepper } from "@/components/workflow/Stepper";
import { ActionRegisterTable } from "@/features/meeting-to-action/components/ActionRegisterTable";
import { DecisionsList } from "@/features/meeting-to-action/components/DecisionsList";
import { EmailDraftEditor } from "@/features/meeting-to-action/components/EmailDraftEditor";
import { ACCEPTED_FILES, MAX_CHARS } from "@/features/meeting-to-action/constants";
import { toCsv, toEmailText, toMarkdown, toSlack } from "@/features/meeting-to-action/services/export";
import type { MeetingOutput } from "@/features/meeting-to-action/types";
import { canExport, nextStatus } from "@/lib/approval";
import { saveRun } from "@/services/runs";
import { applyRegisterEdit } from "@/features/meeting-to-action/services/review";
import { getUsage, incrementUsage } from "@/services/usage";
import type { ApprovalStatus, CostNote as Cost } from "@/types/run";

type Phase = "idle" | "running" | "done" | "error";
interface RunError {
  code: string;
  message: string;
  rawText?: string;
}

const today = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney" }).format(new Date());

export function MeetingWorkbench() {
  const { client } = useClient();
  const [transcript, setTranscript] = useState("");
  const [title, setTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [elapsed, setElapsed] = useState(0);
  const [result, setOutput] = useState<MeetingOutput | null>(null);
  const [cost, setCost] = useState<Cost | null>(null);
  const [status, setStatus] = useState<ApprovalStatus>("DRAFT");
  const [emailEdited, setEmailEdited] = useState(false);
  const [error, setError] = useState<RunError | null>(null);
  const runId = useRef("");

  useEffect(() => {
    if (phase !== "running") return;
    const started = Date.now();
    const timer = setInterval(() => setElapsed(Math.round((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(timer);
  }, [phase]);

  // Results belong to the client they were made for; switching client hides them.
  const [resultClient, setResultClient] = useState("");

  if (!client) return <p className="label py-10 text-ink-soft">Loading clients…</p>;
  const output = resultClient === client.id ? result : null;

  const roster = client.team.map((m) => m.name);

  function persist(next: MeetingOutput, nextStatusValue: ApprovalStatus) {
    saveRun(client!.id, { id: runId.current, toolSlug: "meeting-to-action", createdAt: new Date().toISOString(), status: nextStatusValue, output: next });
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

  async function run() {
    setPhase("running");
    setElapsed(0);
    setError(null);
    setOutput(null);
    try {
      const res = await fetch("/api/tools/meeting-to-action/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: client!.id,
          input: { transcript, meetingDate: meetingDate || today(), title: title || undefined },
          usedThisMonth: getUsage(client!.id, new Date()),
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error);
        setPhase("error");
        return;
      }
      runId.current = `run-${Date.now()}`;
      setResultClient(client!.id);
      incrementUsage(client!.id, new Date());
      setOutput(body.output);
      setCost(body.cost);
      setStatus("DRAFT");
      setEmailEdited(false);
      persist(body.output, "DRAFT");
      setPhase("done");
    } catch {
      setError({ code: "network", message: "Could not reach the server. Check your connection and try again." });
      setPhase("error");
    }
  }

  const step = phase === "running" ? 1 : output ? (status === "APPROVED" ? 3 : 2) : 0;
  const tooLong = transcript.length > MAX_CHARS;

  return (
    <div className="pb-4">
      <Stepper active={step} />

      {client.synthetic && (
        <p className="label mt-4 inline-block border border-ink px-2 py-1">Synthetic demo client · made-up people and data</p>
      )}

      <section aria-label="Source" className="mt-6 grid gap-6 lg:grid-cols-[1fr_18rem]">
        <div>
          <p className="label mb-3 text-ink-soft">01 · Source</p>
          <SourcePanel
            value={transcript}
            onChange={(text) => setTranscript(text)}
            accept={ACCEPTED_FILES}
            maxChars={MAX_CHARS}
            placeholder={"Paste a transcript. Speaker names help, for example:\n[0:13] Josh: Jaz, can you reply to Ruth by tomorrow night?"}
          />
        </div>
        <div className="flex flex-col gap-4 lg:pt-8">
          <label className="flex flex-col gap-1">
            <span className="label text-ink-soft">Meeting title</span>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Weekly L10" className="border border-rule-l bg-white px-2 py-1.5" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="label text-ink-soft">Meeting date · blank means today</span>
            <input type="date" value={meetingDate} onChange={(e) => setMeetingDate(e.target.value)} className="border border-rule-l bg-white px-2 py-1.5" />
          </label>
          <p className="text-sm text-ink-soft">
            Roster: {roster.join(", ")}. Owners and dates are only filled in when the meeting says them.
          </p>
          <button
            type="button"
            onClick={run}
            disabled={!transcript.trim() || tooLong || phase === "running"}
            className="arrow-link bg-ink px-5 py-3 text-left font-medium text-white transition-colors duration-300 hover:bg-blue disabled:cursor-not-allowed disabled:bg-ink-soft/50"
          >
            {phase === "running" ? "Extracting…" : <>Extract actions <span className="arrow">→</span></>}
          </button>
        </div>
      </section>

      {phase === "running" && (
        <div className="mt-8" role="status">
          <div className="h-0.5 w-full overflow-hidden bg-rule-l/30">
            <div className="h-full w-1/3 animate-pulse bg-blue" />
          </div>
          <p className="label mt-2 text-ink-soft">02 · Extracting actions · {elapsed}s</p>
        </div>
      )}

      {phase === "error" && error && (
        error.code === "run_cap_reached" ? (
          <div role="alert" className="mt-6 border border-warn bg-white p-4">
            <p className="label text-warn">Run limit reached</p>
            <p className="mt-2 font-medium">{error.message}</p>
          </div>
        ) : (
          <ErrorPanel message={error.message} rawText={error.rawText} onRetry={run} />
        )
      )}

      {output && (
        <div className="mt-10">
          {output.warnings.includes("no-speakers") && (
            <div role="alert" className="mb-6 border border-warn bg-white p-4">
              <p className="label text-warn">No speaker names found</p>
              <p className="mt-1">Add names to the roster or paste a transcript with names. Owners are left unassigned.</p>
            </div>
          )}
          <ActionRegisterTable actions={output.actions} roster={roster} onChange={(actions) => edit(applyRegisterEdit(output, actions, { emailEdited, client, title: title || undefined }))} />
          <DecisionsList title="Decisions" items={output.decisions} />
          <DecisionsList title="Open questions" items={output.openQuestions} />
          <EmailDraftEditor
            email={output.email}
            onChange={(email) => {
              setEmailEdited(true);
              edit({ ...output, email });
            }}
          />
          <ExportMenu
            enabled={canExport(status)}
            options={[
              { label: "Copy Markdown", build: () => toMarkdown(output, client) },
              { label: "Download CSV", build: () => toCsv(output), fileName: `actions-${meetingDate || "meeting"}.csv`, mime: "text/csv" },
              { label: "Copy for Slack", build: () => toSlack(output, client) },
              { label: "Copy email", build: () => toEmailText(output) },
            ]}
          />
          <ApprovalBar status={status} onApprove={approve}>
            {cost && <CostNote cost={cost} />}
          </ApprovalBar>
        </div>
      )}
    </div>
  );
}
