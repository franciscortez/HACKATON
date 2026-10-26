import { readFileSync } from "node:fs";
import { MockLanguageModelV4 } from "ai/test";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProviderEntry } from "@/lib/ai/provider";

let replies: string[] = [];

function model() {
  return new MockLanguageModelV4({
    doGenerate: async () => ({
      content: [{ type: "text", text: replies.shift() ?? "not json" }],
      finishReason: { unified: "stop", raw: undefined },
      usage: {
        inputTokens: { total: 500, noCache: 500, cacheRead: undefined, cacheWrite: undefined },
        outputTokens: { total: 50, text: 50, reasoning: undefined },
      },
      warnings: [],
    }),
  });
}

vi.mock("@/lib/ai/provider", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/ai/provider")>();
  return {
    ...real,
    availableProviders: (): ProviderEntry[] => [{ name: "ollama", model: "mock", timeoutMs: 1000, maxOutputTokens: 2048, create: model }],
  };
});

const { POST } = await import("@/app/api/tools/[slug]/runs/route");

const post = (slug: string, body: unknown) =>
  POST(new Request(`http://localhost/api/tools/${slug}/runs`, { method: "POST", body: JSON.stringify(body) }), {
    params: Promise.resolve({ slug }),
  } as never);

/** The run streams newline-delimited JSON events. */
async function events(res: Response) {
  const text = await res.text();
  return text
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as { type: string; [k: string]: unknown });
}

const extraction = (owner: string | null) =>
  JSON.stringify({
    actions: [{ task: "Tidy the shared drive", owner, dueText: null, priority: "normal", quote: "the shared drive is a mess", timestamp: null }],
    decisions: [],
    openQuestions: [],
  });
const email = JSON.stringify({ subject: "Actions", body: "Hi team" });

beforeEach(() => {
  replies = [];
});

describe("POST /api/tools/{slug}/runs: validation (plain JSON errors)", () => {
  const transcript = "Jaz: I'll reply to Ruth.";

  it("404s an unknown tool", async () => {
    const res = await post("nope", { input: { transcript } });
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("tool_not_found");
  });

  it("404s a planned tool that has no module yet", async () => {
    expect((await post("recording-to-sop", { input: { transcript } })).status).toBe(404);
  });

  it("413s a transcript over the size limit", async () => {
    const res = await post("meeting-to-action", { input: { transcript: "x".repeat(120_001) } });
    expect(res.status).toBe(413);
    expect((await res.json()).error.code).toBe("input_too_large");
  });

  it("400s an empty transcript", async () => {
    const res = await post("meeting-to-action", { input: { transcript: "  " } });
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("invalid_input");
  });

  it("400s a body that is not JSON", async () => {
    const res = await POST(new Request("http://localhost/x", { method: "POST", body: "{" }), {
      params: Promise.resolve({ slug: "meeting-to-action" }),
    } as never);
    expect(res.status).toBe(400);
  });

  it("has no run limit", async () => {
    replies = [extraction("Jaz"), email];
    const res = await post("meeting-to-action", { input: { transcript }, usedThisMonth: 9999 });
    expect(res.status).toBe(200);
    expect((await events(res)).at(-1)?.type).toBe("result");
  });
});

describe("POST /api/tools/{slug}/runs: streamed run", () => {
  const transcript = readFileSync("tests/fixtures/meeting-to-action/no-speakers.txt", "utf8");

  it("streams progress from 0 to 100% and ends with the checked result", async () => {
    replies = [extraction(null), email];
    const res = await post("meeting-to-action", { input: { transcript, meetingDate: "2026-10-26" } });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/x-ndjson");

    const all = await events(res);
    const progress = all.filter((e) => e.type === "progress") as unknown as Array<{ done: number; total: number; label: string }>;
    expect(progress[0]).toMatchObject({ done: 0 });
    expect(progress.at(-1)!.done).toBe(progress.at(-1)!.total);
    expect(progress.map((p) => p.done)).toEqual([...progress.map((p) => p.done)].sort((a, b) => a - b));

    const result = all.at(-1) as { type: string; output: Record<string, unknown>; cost: Record<string, unknown> };
    expect(result.type).toBe("result");
    expect(result.output.warnings).toEqual(["no-speakers"]);
    expect((result.output.actions as Array<Record<string, unknown>>)[0]).toMatchObject({ owner: "Unassigned", due: "No date" });
    expect((result.output.email as { body: string }).body).toContain("Cheers, Josh");
    expect(result.cost).toMatchObject({ provider: "ollama", inputTokens: 1000, outputTokens: 100, costUsd: 0 });
  });

  it("ends with a plain error event, without model text, when every provider fails", async () => {
    replies = ["garbage", "garbage again"];
    const all = await events(await post("meeting-to-action", { input: { transcript } }));
    expect(all.at(-1)).toEqual({
      type: "error",
      code: "providers_failed",
      message: "We couldn't finish reading this transcript. Please try again in a minute.",
    });
  });
});
