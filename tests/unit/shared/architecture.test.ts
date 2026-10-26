import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : /\.tsx?$/.test(name) ? [path] : [];
  });
}

const deepFeatureImport = /from "@\/features\/([a-z0-9-]+)\/[^"]+"/g;

describe("feature import rules (docs/ARCHITECTURE.md)", () => {
  it("code outside a feature imports only the feature's index", () => {
    const outside = files("src").filter((f) => !f.replaceAll("\\", "/").startsWith("src/features/"));
    const offenders = outside.flatMap((f) => [...readFileSync(f, "utf8").matchAll(deepFeatureImport)].map((m) => `${f}: ${m[0]}`));
    expect(offenders).toEqual([]);
  });

  it("a feature never imports another feature", () => {
    const featureFiles = files("src/features").filter((f) => !f.endsWith("registry.ts"));
    const offenders = featureFiles.flatMap((f) => {
      const own = f.replaceAll("\\", "/").split("/")[2];
      return [...readFileSync(f, "utf8").matchAll(/from "@\/features\/([a-z0-9-]+)/g)].filter((m) => m[1] !== own).map((m) => `${f}: ${m[0]}`);
    });
    expect(offenders).toEqual([]);
  });
});
