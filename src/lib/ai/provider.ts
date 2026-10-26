import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { APICallError, Output, generateText, type JSONValue, type LanguageModel } from "ai";
import type { ZodType } from "zod";
import { estimateCost } from "@/lib/ai/cost";
import { MODELS, TIMEOUT_MS } from "@/lib/ai/models";
import type { Settings } from "@/schemas/settings.schema";
import type { CostNote, ProviderName } from "@/types/run";

export interface ProviderEntry {
  name: ProviderName;
  model: string;
  timeoutMs: number;
  /** Reasoning models spend output tokens on thinking, so cloud models get more room. */
  maxOutputTokens: number;
  providerOptions?: Record<string, Record<string, JSONValue>>;
  create: () => LanguageModel;
}

/** Raised when no provider produced valid output. `rawText` is the last model reply, if any. */
export class ProviderError extends Error {
  constructor(
    message: string,
    readonly rawText?: string,
    readonly category?: string,
    readonly safeMessage?: string,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

type Env = Record<string, string | undefined>;

/** Providers in fallback order. Cloud providers need a key and are never used for local-only clients. */
export function availableProviders(policy: Settings["dataPolicy"], env: Env = process.env): ProviderEntry[] {
  const list: ProviderEntry[] = [];
  if (policy === "cloud-ok" && env.GROQ_API_KEY) {
    list.push({
      name: "groq",
      model: MODELS.groq,
      timeoutMs: TIMEOUT_MS.groq,
      maxOutputTokens: 8192,
      providerOptions: { groq: { reasoningEffort: "low" } },
      create: () => createGroq({ apiKey: env.GROQ_API_KEY })(MODELS.groq),
    });
  }
  if (policy === "cloud-ok" && env.GOOGLE_GENERATIVE_AI_API_KEY) {
    list.push({
      name: "gemini",
      model: MODELS.gemini,
      timeoutMs: TIMEOUT_MS.gemini,
      maxOutputTokens: 8192,
      providerOptions: { google: { thinkingConfig: { thinkingBudget: 1024 } } },
      create: () => createGoogleGenerativeAI({ apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY })(MODELS.gemini),
    });
  }
  const ollamaModel = env.OLLAMA_MODEL ?? MODELS.ollama;
  list.push({
    name: "ollama",
    model: ollamaModel,
    timeoutMs: TIMEOUT_MS.ollama,
    maxOutputTokens: 2048,
    create: () =>
      createOpenAICompatible({
        name: "ollama",
        baseURL: env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434/v1",
        headers: env.OLLAMA_AUTHORIZATION ? { Authorization: env.OLLAMA_AUTHORIZATION } : undefined,
        supportsStructuredOutputs: true,
      })(ollamaModel),
  });
  return list;
}

interface StructuredArgs<T> {
  signal?: AbortSignal;
  schema: ZodType<T>;
  system: string;
  prompt: string;
  policy?: Settings["dataPolicy"];
  providers?: ProviderEntry[];
}

/**
 * Structured output through the provider chain. Each provider gets one retry on invalid
 * output; rate limits, server errors and timeouts move straight to the next provider.
 */
export async function generateStructured<T>(args: StructuredArgs<T>): Promise<{ object: T; cost: CostNote }> {
  const providers = args.providers ?? availableProviders(args.policy ?? "cloud-ok");
  let rawText: string | undefined;
  let lastError = "No AI provider is configured.";
  let quota = false;
  let retryHint = "";

  for (const provider of providers) {
    let waited = false;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const result = await generateText({
          model: provider.create(),
          system: args.system,
          prompt: args.prompt,
          output: Output.object({ schema: args.schema }),
          temperature: 0,
          // Hard stop so a looping model cannot run until its context is full.
          maxOutputTokens: provider.maxOutputTokens,
          providerOptions: provider.providerOptions,
          maxRetries: 0,
          abortSignal: args.signal ? AbortSignal.any([args.signal, AbortSignal.timeout(provider.timeoutMs)]) : AbortSignal.timeout(provider.timeoutMs),
        });
        const usage = result.totalUsage ?? result.usage;
        return {
          object: result.output as T,
          cost: estimateCost(provider.name, provider.model, usage.inputTokens ?? 0, usage.outputTokens ?? 0),
        };
      } catch (error) {
        quota ||= error instanceof APICallError && error.statusCode === 429;
        if(error instanceof APICallError && error.statusCode===429){const seconds=Number(error.responseHeaders?.["retry-after"]);if(Number.isFinite(seconds)&&seconds>0&&seconds<=86400)retryHint=` A provider suggests retrying in ${Math.ceil(seconds)} seconds.`;}
        lastError = error instanceof Error ? error.message : String(error);
        // A free tier's per-minute limit often clears in seconds: wait once rather than drop to a slower model.
        const pause = !waited ? shortRetryAfter(error) : null;
        if (pause !== null) {
          waited = true;
          await new Promise((resolve) => setTimeout(resolve, pause));
          attempt--;
          continue;
        }
        if (error instanceof APICallError || isAbort(error)) break;
        rawText = (error as { text?: string }).text ?? rawText;
      }
    }
  }
  throw new ProviderError(lastError, rawText, quota ? "provider_quota" : "providers_failed", quota ? "AI quota reached and no fallback completed. Wait for quota recovery or choose local Ollama, then retry generation." + retryHint : "No AI model completed the report. Check model availability, then retry generation.");
}

const MAX_RATE_LIMIT_WAIT_MS = 20_000;

/** Milliseconds to wait for a 429 whose retry-after is short enough to be worth it, else null. */
function shortRetryAfter(error: unknown): number | null {
  if (!(error instanceof APICallError) || error.statusCode !== 429) return null;
  const seconds = Number(error.responseHeaders?.["retry-after"]);
  if (!Number.isFinite(seconds) || seconds < 0) return null;
  const ms = Math.ceil(seconds * 1000);
  return ms <= MAX_RATE_LIMIT_WAIT_MS ? ms : null;
}

function isAbort(error: unknown): boolean {
  return error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError");
}
