import type { ProviderName } from "@/types/run";

/**
 * Model IDs per provider. Free-tier names change often: check them against each
 * provider's model list on build day (docs/TECH-STACK.md).
 */
export const MODELS: Record<ProviderName, string> = {
  groq: "llama-3.3-70b-versatile",
  gemini: "gemini-2.5-flash",
  ollama: process.env.OLLAMA_MODEL ?? "qwen2.5:7b-instruct",
};

/** Request timeouts. Local models are slower than cloud ones. */
export const TIMEOUT_MS: Record<ProviderName, number> = {
  groq: 60_000,
  gemini: 60_000,
  ollama: 180_000,
};

/** Paid rates in USD per million tokens (estimates, used only to show cost after free tiers). */
export const PAID_RATES: Record<ProviderName, { input: number; output: number }> = {
  groq: { input: 0.59, output: 0.79 },
  gemini: { input: 0.3, output: 2.5 },
  ollama: { input: 0, output: 0 },
};
