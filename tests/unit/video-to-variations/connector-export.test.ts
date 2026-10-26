import { expect, it } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

it("exports an isolated connector without app UI, secrets or repository history", async () => {
  const target = await mkdtemp(join(tmpdir(), "connector-export-"));
  try {
    execFileSync(process.execPath, ["src/features/video-to-variations/scripts/export-connector.mjs", target]);
    const files = (await readdir(target, { recursive: true })).map((p) => p.replaceAll("\\", "/"));
    expect(files.some((p) => /(^|\/)(?:\.env|\.git\/|\.superpowers|components\/|docs\/)/.test(p))).toBe(false);
    expect(files).toContain("src/features/video-to-variations/services/timeline-ops.ts");
    const barrel = await readFile(join(target, "src/features/video-to-variations/index.ts"), "utf8");
    expect(barrel).not.toContain("VideoVariationsWorkbench");
    const pkg = JSON.parse(await readFile(join(target, "package.json"), "utf8"));
    expect(Object.keys(pkg.dependencies).sort()).toEqual(["next", "react", "react-dom", "zod"]);
    expect(() => execFileSync(process.execPath, ["src/features/video-to-variations/scripts/export-connector.mjs", target], { stdio: "pipe" })).toThrow();
  } finally { await rm(target, { recursive: true, force: true }); }
});
