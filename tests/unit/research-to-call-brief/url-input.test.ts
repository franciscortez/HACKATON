import { expect, test } from "vitest";
import { inputSchema } from "@/features/research-to-call-brief/schemas/brief.schema";
test("a bare business domain alone starts research without contact or objective", () => {
  const result = inputSchema.safeParse({ companyUrl: "example.com" });
  expect(result.success).toBe(true);
  if (result.success) expect(result.data.companyUrl).toBe("https://example.com/");
});
test("normalisation does not permit unsafe schemes or credentials", () => {
  for (const companyUrl of ["javascript:alert(1)", "https://u:p@example.com", "file:///etc/passwd"]) {
    expect(inputSchema.safeParse({ companyUrl }).success).toBe(false);
  }
});
