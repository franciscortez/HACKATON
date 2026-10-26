import type { CostNote as Cost } from "@/types/run";

const NAMES = { groq: "Groq free tier", gemini: "Gemini free tier", ollama: "Local Ollama" } as const;

export function CostNote({ cost }: { cost: Cost }) {
  return (
    <p className="label text-ink-soft" aria-label="Cost of this run">
      ${cost.costUsd.toFixed(2)} · {NAMES[cost.provider]} · {cost.model} · {cost.inputTokens.toLocaleString("en-AU")} in /{" "}
      {cost.outputTokens.toLocaleString("en-AU")} out · ~${cost.estPaidUsd.toFixed(4)} at paid rates
    </p>
  );
}
