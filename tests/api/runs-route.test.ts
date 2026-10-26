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

const extraction = (owner: string | null) =>
  JSON.stringify({
    actions: [{ task: "Chase the documents", owner, dueText: null, priority: "normal", quote: "the shared drive is a mess", timestamp: null }],
    decisions: [],
    openQuestions: [],
  });
const email = JSON.stringify({ subject: "Actions", body: "Hi team" });

beforeEach(() => {
  replies = [];
});

describe("POST /api/tools/{slug}/runs", () => {
  const transcript = readFileSync("tests/fixtures/meeting-to-action/no-speakers.txt", "utf8");

  it("404s an unknown tool", async () => {
    const res = await post("nope", { clientId: "leveric", input: { transcript }, usedThisMonth: 0 });
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("tool_not_found");
  });

  it("404s a planned tool that has no module yet", async () => {
    const res = await post("recording-to-sop", { clientId: "leveric", input: { transcript }, usedThisMonth: 0 });
    expect(res.status).toBe(404);
  });

  it("404s an unknown client", async () => {
    const res = await post("meeting-to-action", { clientId: "nobody", input: { transcript }, usedThisMonth: 0 });
    expect((await res.json()).error.code).toBe("client_not_found");
  });

  it("413s a transcript over the size limit", async () => {
    const res = await post("meeting-to-action", { clientId: "leveric", input: { transcript: "x".repeat(120_001) }, usedThisMonth: 0 });
    expect(res.status).toBe(413);
    expect((await res.json()).error.code).toBe("input_too_large");
  });

  it("400s an empty transcript", async () => {
    const res = await post("meeting-to-action", { clientId: "leveric", input: { transcript: "  " }, usedThisMonth: 0 });
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("invalid_input");
  });

  it("400s a body that is not JSON", async () => {
    const res = await POST(new Request("http://localhost/x", { method: "POST", body: "{" }), {
      params: Promise.resolve({ slug: "meeting-to-action" }),
    } as never);
    expect(res.status).toBe(400);
  });

  it("429s when the client has used its monthly runs", async () => {
    const res = await post("meeting-to-action", { clientId: "harbourside-accounting", input: { transcript }, usedThisMonth: 20 });
    expect(res.status).toBe(429);
    expect((await res.json()).error.message).toBe("This client has used 20 of 20 runs this month. Ask Leveric for more runs.");
  });

  it("502s with the raw model text when every provider gives invalid output", async () => {
    replies = ["garbage", "garbage again"];
    const res = await post("meeting-to-action", { clientId: "leveric", input: { transcript }, usedThisMonth: 0 });
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error.code).toBe("providers_failed");
    expect(body.error.rawText).toBe("garbage again");
  });

  it("201s a checked run, warns when no speakers are named and keeps unknown owners unassigned", async () => {
    replies = [extraction(null), email];
    const res = await post("meeting-to-action", { clientId: "leveric", input: { transcript, meetingDate: "2026-10-26" }, usedThisMonth: 3 });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.output.warnings).toEqual(["no-speakers"]);
    expect(body.output.actions[0]).toMatchObject({ owner: "Unassigned", due: "No date", confidence: "medium" });
    expect(body.output.email.body).toContain("Cheers, Josh");
    expect(body.cost).toMatchObject({ provider: "ollama", inputTokens: 1000, outputTokens: 100, costUsd: 0 });
  });
});
