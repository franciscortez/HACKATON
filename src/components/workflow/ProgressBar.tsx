import { cx } from "@/lib/utils";

/** Real run progress in a compact panel: one bar segment per step, the current one animated. */
export function ProgressBar({ done, total, label }: { done: number; total: number; label: string }) {
  const percent = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      aria-valuetext={`${percent}%, ${label}`}
      aria-label="Run progress"
      className="reveal select-none border border-blue/40 bg-white/70 p-4"
    >
      <div className="flex items-baseline justify-between gap-4">
        <div className="min-w-0">
          <p className="label text-ink-soft">02 · Extracting</p>
          <p aria-live="polite" className="mt-1 truncate font-medium">
            {label}
          </p>
        </div>
        <p className="shrink-0 text-right font-mono tabular-nums">
          <span className="text-2xl font-medium tracking-[-0.04em]">{percent}%</span>
        </p>
      </div>
      <div className="mt-3 flex gap-0.5" aria-hidden="true">
        {Array.from({ length: Math.max(total, 1) }, (_, i) => (
          <span
            key={i}
            className={cx(
              "relative h-1 flex-1 overflow-hidden transition-colors duration-500 ease-brand",
              i < done ? "bg-blue" : i === done ? "progress-fill bg-blue/25" : "bg-ink/10",
            )}
          />
        ))}
      </div>
    </div>
  );
}
