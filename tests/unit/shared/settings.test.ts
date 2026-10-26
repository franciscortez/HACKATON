import { describe, expect, it } from "vitest";
import { settingsSchema } from "@/schemas/settings.schema";
import { getSettings } from "@/services/settings";

describe("workspace settings", () => {
  it("loads Leveric's voice, sign-off and data policy", () => {
    expect(getSettings()).toMatchObject({ name: "Leveric", brand: { signOff: "Cheers, Josh" }, dataPolicy: "cloud-ok" });
  });

  it("has no team roster and no run limit: tools work for any transcript", () => {
    const settings = getSettings() as Record<string, unknown>;
    expect(settings.team).toBeUndefined();
    expect(settings.usage).toBeUndefined();
  });

  it("rejects settings without a sign-off", () => {
    expect(settingsSchema.safeParse({ ...getSettings(), brand: { voice: "x" } }).success).toBe(false);
  });
});
