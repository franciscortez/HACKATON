import { PAID_RATES } from "@/lib/ai/models";
import type { CostNote, ProviderName } from "@/types/run";

/** Every provider we use runs on a free tier or locally, so the actual cost is 0. */
export function estimateCost(provider: ProviderName, model: string, inputTokens: number, outputTokens: number): CostNote {
  const rate = PAID_RATES[provider];
  const estPaidUsd = (inputTokens * rate.input + outputTokens * rate.output) / 1_000_000;
  return { provider, model, inputTokens, outputTokens, costUsd: 0, estPaidUsd: Math.round(estPaidUsd * 1e5) / 1e5 };
}

export function addCosts(a: CostNote, b: CostNote): CostNote {
  return {
    provider: b.provider,
    model: b.model,
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    costUsd: a.costUsd + b.costUsd,
    estPaidUsd: Math.round((a.estPaidUsd + b.estPaidUsd) * 1e5) / 1e5,
  };
}
