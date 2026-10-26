const MISSING: Record<string, string> = {
  local_only: "This copy of the Workbench is hosted online. Run it on your own computer with pnpm dev.",
  claude_missing: "Claude Code was not found. Install it and sign in with your Claude subscription.",
  ffmpeg_missing: "FFmpeg was not found.",
  python_missing: "The faster-whisper Python environment was not found (set VIDEO_PYTHON).",
};

/** Shown when this computer cannot run tool 06. */
export function LocalOnlyNotice({ code }: { code: string }) {
  return (
    <div role="status" className="reveal mt-6 max-w-[72ch] border border-warn bg-white px-4 py-4">
      <p className="label text-warn">Runs locally</p>
      <p className="mt-2 font-medium">This tool runs on a computer with Claude Code, FFmpeg and Python. Video never leaves that computer.</p>
      <p className="mt-2 text-sm text-ink-soft">{MISSING[code] ?? "Something this tool needs is missing."}</p>
    </div>
  );
}
