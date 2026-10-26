import type { RunProgress } from "@/types/tool";

/** A thin blue progress line with a mono status label (DESIGN.md loading pattern). */
export function BusyLine({ progress }: { progress: RunProgress }) {
  const percent = progress.total > 0 ? Math.min(100, Math.round((progress.done / progress.total) * 100)) : 0;
  return (
    <div role="progressbar" aria-label="Job progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-valuetext={progress.label} className="reveal">
      <div className="h-0.5 w-full bg-ink/10">
        <div className="progress-fill h-0.5 bg-blue transition-[width] duration-500 ease-brand" style={{ width: `${Math.max(percent, 4)}%` }} />
      </div>
      <p aria-live="polite" className="label mt-2 truncate text-ink-soft">
        {progress.label}
      </p>
    </div>
  );
}
