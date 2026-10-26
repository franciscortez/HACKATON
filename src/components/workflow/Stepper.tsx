import { cx } from "@/lib/utils";

const STEPS = ["Source", "Extract", "Review", "Export"] as const;

/** The four shared workflow steps. `active` is 0-3. */
export function Stepper({ active }: { active: number }) {
  return (
    <ol className="flex flex-wrap gap-x-6 gap-y-2 border-b border-rule-l pb-3" aria-label="Progress">
      {STEPS.map((step, i) => (
        <li
          key={step}
          aria-current={i === active ? "step" : undefined}
          className={cx(
            "label border-b-2 pb-1",
            i === active ? "border-blue text-ink" : i < active ? "border-transparent text-ink" : "border-transparent text-ink-soft/60",
          )}
        >
          {String(i + 1).padStart(2, "0")} · {step}
        </li>
      ))}
    </ol>
  );
}
