import type { ReactNode } from "react";
import { StatusChip } from "@/components/workflow/StatusChip";
import type { ApprovalStatus } from "@/types/run";

/** Sticky review footer: status and cost on the left; extra actions (export) and Approve on the right. */
export function ApprovalBar({
  status,
  onApprove,
  children,
  actions,
}: {
  status: ApprovalStatus;
  onApprove: () => void;
  children?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="px-pad sticky bottom-0 z-10 -mx-[var(--pad)] mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-ink bg-field/95 py-3 backdrop-blur">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <StatusChip value={status} />
        {children}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {actions}
        <button
          type="button"
          onClick={onApprove}
          disabled={status === "APPROVED"}
          className="arrow-link bg-ink px-5 py-2.5 font-medium text-white transition-colors duration-300 hover:bg-blue disabled:bg-blue"
        >
          {status === "APPROVED" ? (
            "Approved"
          ) : (
            <>
              Approve <span className="arrow">→</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
