import { beforeEach, describe, expect, it, vi } from "vitest";
import { getUsage, incrementUsage } from "@/services/usage";

beforeEach(() => {
  const data = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  });
});

describe("monthly run usage", () => {
  const oct = new Date("2026-10-26T10:00:00+11:00");
  const nov = new Date("2026-11-02T10:00:00+11:00");

  it("starts at zero", () => {
    expect(getUsage("leveric", oct)).toBe(0);
  });

  it("counts runs per client per month", () => {
    incrementUsage("leveric", oct);
    incrementUsage("leveric", oct);
    incrementUsage("harbourside-accounting", oct);
    expect(getUsage("leveric", oct)).toBe(2);
    expect(getUsage("harbourside-accounting", oct)).toBe(1);
    expect(getUsage("leveric", nov)).toBe(0);
  });
});
