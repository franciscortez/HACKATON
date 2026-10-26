export type ApprovalStatus = "DRAFT" | "EDITED" | "APPROVED";

export type ProviderName = "groq" | "gemini" | "ollama";

export interface CostNote {
  provider: ProviderName;
  model: string;
  inputTokens: number;
  outputTokens: number;
  /** What this run cost on the tier used (free tiers and local are 0). */
  costUsd: number;
  /** What it would cost at paid rates, so the cost after free tiers is visible. */
  estPaidUsd: number;
  research?: import("@/services/research/types").ResearchUsage;
  totalCostUsd?: number | null;
  modelCalls?: { stage: string; provider: ProviderName; model: string; inputTokens: number; outputTokens: number }[];
}

export type Flag = "owner-unknown" | "date-unknown" | "owner-not-in-roster" | "ambiguous";
