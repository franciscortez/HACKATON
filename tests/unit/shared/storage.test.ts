import { afterEach, describe, expect, it, vi } from "vitest";
import { safeGet, safeSet } from "@/lib/storage";

function fakeStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
}

afterEach(() => vi.unstubAllGlobals());

describe("safe browser storage", () => {
  it("round-trips JSON values", () => {
    vi.stubGlobal("localStorage", fakeStorage());
    expect(safeSet("k", { a: 1 })).toBe(true);
    expect(safeGet("k", null)).toEqual({ a: 1 });
  });

  it("returns the fallback when reading throws (private mode)", () => {
    vi.stubGlobal("localStorage", { getItem: () => { throw new Error("denied"); } });
    expect(safeGet("k", "fallback")).toBe("fallback");
  });

  it("returns false when writing throws", () => {
    vi.stubGlobal("localStorage", { setItem: () => { throw new Error("quota"); } });
    expect(safeSet("k", 1)).toBe(false);
  });

  it("returns the fallback when storage does not exist (server)", () => {
    vi.stubGlobal("localStorage", undefined);
    expect(safeGet("k", 7)).toBe(7);
  });

  it("returns the fallback for corrupt JSON", () => {
    const s = fakeStorage();
    s.setItem("k", "{not json");
    vi.stubGlobal("localStorage", s);
    expect(safeGet("k", 0)).toBe(0);
  });
});
