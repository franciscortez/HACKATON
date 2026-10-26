import type { ApprovalStatus } from "@/types/run";

/** Any edit (re)opens review; approve always approves. See docs/ARCHITECTURE.md §6. */
export function nextStatus(_current: ApprovalStatus, event: "edit" | "approve"): ApprovalStatus {
  return event === "approve" ? "APPROVED" : "EDITED";
}

export function canExport(status: ApprovalStatus): boolean {
  return status === "APPROVED";
}
