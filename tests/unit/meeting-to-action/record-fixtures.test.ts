import { readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { extractActions } from "@/features/meeting-to-action/services/extract-actions";
import { parseTranscript, toPromptText } from "@/features/meeting-to-action/services/parse-transcript";
import { getClient } from "@/services/clients";

/**
 * Records real model responses for the golden tests. Skipped unless RECORD=1, so the normal
 * suite never calls a model. Run: RECORD=1 pnpm vitest run tests/unit/meeting-to-action/record-fixtures.test.ts
 */
const dir = "tests/fixtures/meeting-to-action";
const cases = [
  { file: "leveric-l10.md", client: "leveric", date: "2026-10-26", out: "l10-model-response.json" },
  { file: "harbourside-partners.md", client: "harbourside-accounting", date: "2026-10-27", out: "harbourside-model-response.json" },
];

describe.runIf(process.env.RECORD === "1")("record model fixtures", () => {
  for (const c of cases) {
    it(`records ${c.out}`, { timeout: 300_000 }, async () => {
      const parsed = parseTranscript(readFileSync(`${dir}/${c.file}`, "utf8"));
      const started = Date.now();
      const { extraction, cost } = await extractActions({
        transcriptText: toPromptText(parsed.segments),
        actionLines: parsed.actionLines,
        client: getClient(c.client)!,
        meetingDate: c.date,
      });
      writeFileSync(`${dir}/${c.out}`, `${JSON.stringify({ extraction, cost, seconds: (Date.now() - started) / 1000 }, null, 2)}\n`);
      expect(extraction.actions.length).toBeGreaterThan(0);
    });
  }
});
