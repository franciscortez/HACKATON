"use client";
import { useRef, useState, type FormEvent, type ReactNode } from "react";
import { pairComputer } from "@/features/video-to-variations/components/connector-client";
import { connectorRepository, setupInstructions, type SetupOS } from "@/features/video-to-variations/components/setup-instructions";

function Command({ label, text }: { label: string; text: string }) {
  const [status, setStatus] = useState("");
  async function copy() {
    try { await navigator.clipboard.writeText(text); setStatus("Copied. Paste into your terminal."); }
    catch { setStatus("Copy unavailable. Select the command text and copy it manually."); }
  }
  return <div className="mt-3 min-w-0 border border-rule-l bg-field/40">
    <div className="flex items-center justify-between gap-3 border-b border-rule-l px-3"><span className="font-mono text-xs">{label}</span><button type="button" onClick={copy} aria-label={`Copy ${label}`} className="min-h-11 px-3 text-sm font-medium text-blue focus-visible:outline-2 focus-visible:outline-blue">Copy</button></div>
    <pre className="overflow-x-auto whitespace-pre-wrap break-all p-3 font-mono text-xs leading-6"><code>{text}</code></pre>
    <p role="status" className="px-3 text-sm text-ink-soft">{status}</p>
  </div>;
}
function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return <li className="min-w-0 border-t border-rule-l py-5"><h3 className="flex gap-3 text-lg font-semibold"><span className="font-mono text-blue">{String(n).padStart(2, "0")}</span>{title}</h3><div className="mt-2 text-sm leading-6">{children}</div></li>;
}
const link = "text-blue underline underline-offset-4";
export function ConnectComputer({ onConnected, instructionsOnly = false }: { onConnected: () => void; instructionsOnly?: boolean }) {
  const [os, setOS] = useState<SetupOS>("windows");
  const [port, setPort] = useState("43127");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pairing = useRef<HTMLInputElement>(null);
  const guide = setupInstructions[os];
  function selectOS(next: SetupOS) { setOS(next); document.getElementById(`setup-tab-${next}`)?.focus(); }
  async function connect(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError("");
    try { await pairComputer(Number(port), code); setCode(""); onConnected(); }
    catch (e) { setError(e instanceof TypeError ? "Cannot reach the connector. Keep its terminal open and allow local network access in this browser. Check the port, then try again." : e instanceof Error ? e.message : "Connection failed. Start the connector and try again."); }
    finally { setBusy(false); }
  }
  return <section className="mt-4 max-w-4xl min-w-0 border border-ink bg-white p-4 sm:p-6" aria-label="Connect your computer">
    <h2 className="text-xl font-semibold uppercase">Connect your computer</h2>
    <p className="mt-3 max-w-prose">Use your own Claude Code subscription to edit here. First, set up the connector on the same computer as this browser.</p>
    {!instructionsOnly && <button type="button" onClick={() => pairing.current?.focus()} className="mt-2 min-h-11 text-sm text-blue underline underline-offset-4">Already set up? Connect below</button>}
    <div role="tablist" aria-label="Computer operating system" className="my-4 flex gap-2">
      {(["windows", "macos"] as const).map((item) => <button key={item} id={`setup-tab-${item}`} role="tab" aria-selected={os === item} aria-controls="setup-instructions" tabIndex={os === item ? 0 : -1} onClick={() => setOS(item)} onKeyDown={(e) => { if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) { e.preventDefault(); selectOS(e.key === "Home" ? "windows" : e.key === "End" ? "macos" : os === "windows" ? "macos" : "windows"); } }} className={`min-h-11 min-w-28 border border-ink px-5 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue ${os === item ? "bg-ink text-white" : "bg-white text-ink hover:text-blue"}`}>{item === "windows" ? "Windows" : "macOS"}</button>)}
    </div>
    <div id="setup-instructions" role="tabpanel" aria-labelledby={`setup-tab-${os}`} tabIndex={0}>
      <ol className="min-w-0" key={os}>
        <Step n={1} title="Open your terminal"><p>{guide.terminal}</p><p className="mt-2 text-ink-soft">Use Chrome, Edge or Brave on a desktop computer. Windows x64 is tested. macOS instructions target Apple Silicon; macOS and Intel hardware still need full acceptance testing.</p></Step>
        <Step n={2} title="Install the tools">
          <p>Git downloads the connector. Node runs it. FFmpeg imports and exports video. Python prepares transcripts. Claude Code uses your own subscription.</p>
          {os === "windows" ? <p className="mt-2">First install <a className={link} href="https://nodejs.org/en/download/archive/v24.22.1" target="_blank" rel="noreferrer">Node.js 24 for Windows</a> using its installer. If winget is unavailable, install <a className={link} href="https://learn.microsoft.com/en-us/windows/package-manager/winget/" target="_blank" rel="noreferrer">Microsoft App Installer</a>. Then run:</p> : <p className="mt-2">Need Homebrew? Follow <a className={link} href="https://brew.sh" target="_blank" rel="noreferrer">the official installation steps</a>, including its printed PATH instructions. Then run:</p>}
          <Command label="Install prerequisites" text={guide.install}/>
          <p className="mt-2">If already installed, keep the existing installation. On Windows, close and reopen PowerShell after installation so commands are available. Do not continue past a failed command.</p>
        </Step>
        <Step n={3} title="Download the connector"><p>These commands create a Leveric folder inside your home folder and clone the <a className={link} href={connectorRepository} target="_blank" rel="noreferrer">public connector repository</a>. No GitHub sign-in is needed.</p><Command label="Download connector" text={guide.clone}/><p className="mt-2 break-all">Your folder: <code>{guide.folder}</code>. If it already exists, enter that folder instead of cloning again; do not delete your files.</p></Step>
        <Step n={4} title="Prepare transcription"><p>Run inside the connector folder. This creates an isolated Python environment and downloads the speech model once. Keep internet connected and wait for the terminal prompt to return.</p><Command label="Prepare speech model" text={guide.python}/></Step>
        <Step n={5} title="Sign in, build and check"><p>Check that Node reports v24. Sign into Claude with your subscription when prompted. Run each command in order; the final check lists anything missing. Claude Code must be 2.1.310 or later.</p><Command label="Build and check connector" text={guide.build}/></Step>
        <Step n={6} title="Start your connector"><Command label="Start connector" text={guide.start}/><p className="mt-2">Keep this terminal open. Find <strong>Pairing code (single use, expires in 10 minutes)</strong> and copy the code on the following line. This is not your Claude password or an API key.</p></Step>
      </ol>
      <details className="mb-5 border-t border-rule-l pt-4"><summary className="cursor-pointer py-2 font-medium">Next time: start without reinstalling</summary><Command label="Start next time" text={guide.start}/><p className="mt-2 text-sm">Keep the computer awake. Restart the connector for a new pairing code after disconnecting or when a code expires. Press Ctrl+C in the terminal to stop it.</p></details>
    </div>
    {!instructionsOnly && <div className="border-t border-ink pt-5"><h3 className="text-lg font-semibold"><span className="mr-3 font-mono text-blue">07</span>Paste your pairing code</h3>
      <form onSubmit={connect} className="mt-4 flex flex-wrap items-end gap-3">
        <label className="flex min-w-0 basis-full flex-col gap-1 text-sm sm:flex-1 sm:basis-auto">Pairing code<input ref={pairing} type="password" autoComplete="off" required value={code} onChange={(e) => setCode(e.target.value)} className="min-h-11 min-w-0 border border-rule-l px-3 py-2" /></label>
        <label className="flex w-24 flex-col gap-1 text-sm">Port<input type="number" min={1024} max={65535} required value={port} onChange={(e) => setPort(e.target.value)} className="min-h-11 w-full border border-rule-l px-2 py-2" /></label>
        <button disabled={busy} className="min-h-11 bg-ink px-5 py-2 text-white hover:bg-blue disabled:opacity-50">{busy ? "Connecting?" : "Connect"}</button>
      </form>
      <p className="mt-3 text-sm">Click Connect, allow this website to access your local network, then import a video. Use the port printed by your connector; the default is 43127.</p>
      {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
    </div>}
    <details className="mt-5 border-t border-rule-l pt-3"><summary className="cursor-pointer py-2 font-medium">Something not working?</summary><ul className="list-disc space-y-2 pl-5 text-sm leading-6">
      <li>Missing command: finish its installation, reopen the terminal and run the checks again. On macOS, repeat the PATH line from Start connector.</li>
      <li>Missing FFmpeg: install the full build from step 2 to import and export video. A build without subtitle support cannot render captions.</li>
      <li>Expired code: stop the connector with Ctrl+C and restart it, then paste the new code.</li>
      <li>Port occupied: stop your previous connector, or set VIDEO_CONNECTOR_PORT to a free port before starting and enter that number above.</li>
      <li>Browser permission denied: allow local network access in the browser settings for this site, reload and reconnect.</li>
      <li>Claude unavailable: run <code>claude auth login</code> and choose your subscription. Do not paste provider credentials here. Manual editing remains available when its tools are ready.</li>
    </ul></details>
    <p className="mt-5 border-t border-rule-l pt-4 text-sm text-ink-soft">Original videos and renders stay on this computer. Claude receives prompts, transcripts and selected still frames. Your subscription limits apply. Codex is not available yet.</p>
  </section>;
}
