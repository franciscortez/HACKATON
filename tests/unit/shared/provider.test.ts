import { APICallError } from "ai";
import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ProviderError, availableProviders, generateStructured, type ProviderEntry } from "@/lib/ai/provider";

const schema = z.object({ answer: z.string() });

function reply(text: string) {
  return new MockLanguageModelV4({
    doGenerate: async () => ({
      content: [{ type: "text", text }],
      finishReason: { unified: "stop", raw: undefined },
      usage: {
        inputTokens: { total: 100, noCache: 100, cacheRead: undefined, cacheWrite: undefined },
        outputTokens: { total: 20, text: 20, reasoning: undefined },
      },
      warnings: [],
    }),
  });
}

function rateLimited(retryAfter?: string) {
  return new MockLanguageModelV4({
    doGenerate: async () => {
      throw new APICallError({
        message: "Rate limit reached",
        url: "https://api.groq.com",
        requestBodyValues: {},
        statusCode: 429,
        responseHeaders: retryAfter ? {"retry-after": retryAfter} : undefined,
        isRetryable: true,
      });
    },
  });
}

const entry = (name: ProviderEntry["name"], model: ProviderEntry["create"] extends () => infer M ? M : never): ProviderEntry => ({
  name,
  model: `${name}-model`,
  timeoutMs: 1000,
  maxOutputTokens: 2048,
  create: () => model,
});

describe("availableProviders", () => {
  it("uses only Ollama when no cloud keys are set", () => {
    expect(availableProviders("cloud-ok", {}).map((p) => p.name)).toEqual(["ollama"]);
  });

  it("orders Groq, Gemini, Ollama when keys are set", () => {
    const env = { GROQ_API_KEY: "g", GOOGLE_GENERATIVE_AI_API_KEY: "k" };
    expect(availableProviders("cloud-ok", env).map((p) => p.name)).toEqual(["groq", "gemini", "ollama"]);
  });

  it("never offers a cloud provider to a local-only client", () => {
    const env = { GROQ_API_KEY: "g", GOOGLE_GENERATIVE_AI_API_KEY: "k" };
    expect(availableProviders("local-only", env).map((p) => p.name)).toEqual(["ollama"]);
  });
});

describe("provider settings", () => {
  it("gives reasoning cloud models room to think and caps the local model", () => {
    const env = { GROQ_API_KEY: "g", GOOGLE_GENERATIVE_AI_API_KEY: "k" };
    const caps = Object.fromEntries(availableProviders("cloud-ok", env).map((p) => [p.name, p.maxOutputTokens]));
    expect(caps).toEqual({ groq: 8192, gemini: 8192, ollama: 2048 });
  });

  it("passes the provider's output cap and options to the model", async () => {
    let seen: { maxOutputTokens?: number; providerOptions?: unknown } = {};
    const model = new MockLanguageModelV4({
      doGenerate: async (options) => {
        seen = options;
        return reply('{"answer":"x"}').doGenerate(options);
      },
    });
    await generateStructured({
      schema,
      system: "s",
      prompt: "p",
      providers: [{ ...entry("groq", model), maxOutputTokens: 8192, providerOptions: { groq: { reasoningEffort: "low" } } }],
    });
    expect(seen.maxOutputTokens).toBe(8192);
    expect(seen.providerOptions).toEqual({ groq: { reasoningEffort: "low" } });
  });
});

describe("generateStructured", () => {
  it("returns the parsed object and names the provider in the cost note", async () => {
    const result = await generateStructured({
      schema,
      system: "s",
      prompt: "p",
      providers: [entry("ollama", reply('{"answer":"yes"}'))],
    });
    expect(result.object).toEqual({ answer: "yes" });
    expect(result.cost).toMatchObject({ provider: "ollama", inputTokens: 100, outputTokens: 20, costUsd: 0 });
  });

  it("falls back to the next provider when the first is rate limited", async () => {
    const result = await generateStructured({
      schema,
      system: "s",
      prompt: "p",
      providers: [entry("groq", rateLimited()), entry("ollama", reply('{"answer":"local"}'))],
    });
    expect(result.object.answer).toBe("local");
    expect(result.cost.provider).toBe("ollama");
  });

  it("waits and retries the same provider when it asks for a short pause (429 with retry-after)", async () => {
    let calls = 0;
    const limited = new MockLanguageModelV4({
      doGenerate: async (options) => {
        calls++;
        if (calls === 1) {
          throw new APICallError({
            message: "Rate limit reached",
            url: "https://api.groq.com",
            requestBodyValues: {},
            statusCode: 429,
            responseHeaders: { "retry-after": "0.01" },
            isRetryable: true,
          });
        }
        return reply('{"answer":"after wait"}').doGenerate(options);
      },
    });
    const result = await generateStructured({
      schema,
      system: "s",
      prompt: "p",
      providers: [entry("groq", limited), entry("ollama", reply('{"answer":"local"}'))],
    });
    expect(calls).toBe(2);
    expect(result.cost.provider).toBe("groq");
    expect(result.object.answer).toBe("after wait");
  });

  it("retries once on invalid output before moving on", async () => {
    let calls = 0;
    const flaky = new MockLanguageModelV4({
      doGenerate: async () => {
        calls++;
        return (calls === 1 ? reply("not json") : reply('{"answer":"second try"}')).doGenerate({} as never);
      },
    });
    const result = await generateStructured({ schema, system: "s", prompt: "p", providers: [entry("ollama", flaky)] });
    expect(calls).toBe(2);
    expect(result.object.answer).toBe("second try");
  });

  it("throws ProviderError with the raw text when every provider gives invalid output", async () => {
    const attempt = generateStructured({
      schema,
      system: "s",
      prompt: "p",
      providers: [entry("groq", reply("garbage one")), entry("ollama", reply("garbage two"))],
    });
    await expect(attempt).rejects.toBeInstanceOf(ProviderError);
    await expect(attempt).rejects.toMatchObject({ rawText: "garbage two" });
  });

  it("throws ProviderError when no provider is available", async () => {
    await expect(generateStructured({ schema, system: "s", prompt: "p", providers: [] })).rejects.toBeInstanceOf(ProviderError);
  });
});

it("retains a safe quota category when no provider succeeds", async () => {
 await expect(generateStructured({schema,system:"test",prompt:"test",providers:[entry("groq",rateLimited())]})).rejects.toMatchObject({category:"provider_quota",safeMessage:expect.stringContaining("quota")});
});

it("reports an available long retry hint without waiting or exposing raw errors",async()=>{
 await expect(generateStructured({schema,system:"test",prompt:"test",providers:[entry("groq",rateLimited("60"))]})).rejects.toMatchObject({safeMessage:expect.stringContaining("60 seconds")});
});
