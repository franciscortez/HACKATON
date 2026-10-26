import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, it } from "vitest";
import { extractActions } from "@/features/meeting-to-action/services/extract-actions";
import type { ProviderEntry } from "@/lib/ai/provider";
import { getClient } from "@/services/clients";

function countingModel(prompts: string[]) {
  return new MockLanguageModelV4({
    doGenerate: async (options) => {
      prompts.push(JSON.stringify(options.prompt));
      const n = prompts.length;
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              actions: [{ task: `Task ${n}`, owner: null, dueText: null, priority: "normal", quote: `q${n}`, timestamp: null }],
              decisions: [],
              openQuestions: [],
            }),
          },
        ],
        finishReason: { unified: "stop", raw: undefined },
        usage: {
          inputTokens: { total: 1000, noCache: 1000, cacheRead: undefined, cacheWrite: undefined },
          outputTokens: { total: 100, text: 100, reasoning: undefined },
        },
        warnings: [],
      };
    },
  });
}

describe("extractActions", () => {
  it("extracts long transcripts chunk by chunk, merges results and sums tokens", async () => {
    const prompts: string[] = [];
    const model = countingModel(prompts);
    const providers: ProviderEntry[] = [{ name: "ollama", model: "m", timeoutMs: 1000, maxOutputTokens: 2048, create: () => model }];
    const transcriptText = Array.from({ length: 300 }, (_, i) => `[${i}:00] Jaz: line ${i} ${"words ".repeat(10)}`).join("\n");

    const { extraction, cost } = await extractActions({
      transcriptText,
      actionLines: ["Reply to Ruth"],
      client: getClient("leveric")!,
      meetingDate: "2026-10-26",
      providers,
    });

    expect(prompts.length).toBeGreaterThan(1);
    expect(extraction.actions).toHaveLength(prompts.length);
    expect(cost.inputTokens).toBe(1000 * prompts.length);
  });

  it("sends a short transcript in one call", async () => {
    const prompts: string[] = [];
    const model = countingModel(prompts);
    await extractActions({
      transcriptText: "Jaz: I'll reply to Ruth.",
      actionLines: [],
      client: getClient("leveric")!,
      meetingDate: "2026-10-26",
      providers: [{ name: "ollama", model: "m", timeoutMs: 1000, maxOutputTokens: 2048, create: () => model }],
    });
    expect(prompts).toHaveLength(1);
  });
});
