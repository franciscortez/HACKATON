import { cx } from "@/lib/utils";

const styles: Record<string, string> = {
  DRAFT: "border-ink text-ink",
  EDITED: "border-warn text-warn",
  APPROVED: "border-blue bg-blue text-white",
  UNASSIGNED: "border-warn text-warn",
  LIVE: "border-blue bg-blue text-white",
  NEXT: "border-ink text-ink",
  PLANNED: "border-rule-l text-ink-soft",
};

export function StatusChip({ value, label, dark }: { value: string; label?: string; dark?: boolean }) {
  return (
    <span
      className={cx(
        "label inline-block whitespace-nowrap border px-2 py-0.5 text-[11px]",
        dark && value === "PLANNED" ? "border-rule-d text-white/60" : dark && value === "NEXT" ? "border-white text-white" : styles[value],
      )}
    >
      {label ?? value}
    </span>
  );
}
