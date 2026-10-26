"use client";
import { useState, type FormEvent } from "react";
import { pairComputer } from "@/features/video-to-variations/components/connector-client";

export function ConnectComputer({ onConnected }: { onConnected: () => void }) {
  const [port, setPort] = useState("43127");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function connect(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try { await pairComputer(Number(port), code); setCode(""); onConnected(); }
    catch (e) { setError(e instanceof Error ? e.message : "Connection failed. Start the connector and allow local network access in your browser."); }
    finally { setBusy(false); }
  }
  return <section className="mt-4 max-w-3xl border border-ink bg-white p-5" aria-label="Connect your computer">
    <h2 className="text-xl font-semibold uppercase">Connect your computer</h2>
    <p className="mt-3">Edit here using your own Claude Code subscription. Your computer handles video processing.</p>
    <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm">
      <li>Install Claude Code, FFmpeg and the faster-whisper Python environment. Run <code>claude auth login</code> and choose your subscription.</li>
      <li>In your Workbench checkout, run <code>pnpm install</code>, then <code>pnpm video:connector:build</code>.</li>
      <li>Run <code>pnpm video:connector</code> and keep its terminal open. Paste the pairing code below.</li>
    </ol>
    <form onSubmit={connect} className="mt-5 flex flex-wrap items-end gap-3">
      <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm">Pairing code<input type="password" autoComplete="off" required value={code} onChange={(e) => setCode(e.target.value)} className="min-w-0 border border-rule-l px-3 py-2" /></label>
      <label className="flex w-24 flex-col gap-1 text-sm">Port<input type="number" min={1024} max={65535} required value={port} onChange={(e) => setPort(e.target.value)} className="w-full border border-rule-l px-2 py-2" /></label>
      <button disabled={busy} className="bg-ink px-4 py-2 text-white hover:bg-blue disabled:opacity-50">{busy ? "Connecting…" : "Connect"}</button>
    </form>
    <p className="mt-3 text-sm text-ink-soft">Allow this website to connect to your computer when your browser asks. Windows or macOS with Chrome, Edge or Brave. Codex is not available yet.</p>
    <p className="mt-3 text-sm text-ink-soft">Original videos and renders stay on your computer. Claude receives prompts, transcripts and selected still frames. Your subscription limits apply.</p>
    {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
  </section>;
}
