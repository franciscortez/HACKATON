import { describe, expect, it } from "vitest";
import { canExport, nextStatus } from "@/lib/approval";

describe("approval state machine", () => {
  it("edit moves DRAFT to EDITED", () => expect(nextStatus("DRAFT", "edit")).toBe("EDITED"));
  it("approve moves DRAFT to APPROVED", () => expect(nextStatus("DRAFT", "approve")).toBe("APPROVED"));
  it("approve moves EDITED to APPROVED", () => expect(nextStatus("EDITED", "approve")).toBe("APPROVED"));
  it("any edit after approval resets to EDITED", () => expect(nextStatus("APPROVED", "edit")).toBe("EDITED"));
  it("only APPROVED can export", () => {
    expect(canExport("APPROVED")).toBe(true);
    expect(canExport("EDITED")).toBe(false);
    expect(canExport("DRAFT")).toBe(false);
  });
});
