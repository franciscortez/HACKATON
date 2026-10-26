import { describe, expect, it } from "vitest";
import { cx } from "@/lib/utils";

describe("test runner and @ alias", () => {
  it("joins truthy class names", () => {
    expect(cx("a", false, undefined, "b")).toBe("a b");
  });
});
