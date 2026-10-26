import type { CostNote as Cost } from "@/types/run";

const NAMES = { groq: "Groq", gemini: "Gemini", ollama: "Local" } as const;

/** One short line; the full breakdown is in the tooltip. */
export function CostNote({ cost }: { cost: Cost }) {
  const detail = `${cost.model} · ${cost.inputTokens.toLocaleString("en-AU")} tokens in / ${cost.outputTokens.toLocaleString("en-AU")} out · about $${cost.estPaidUsd.toFixed(4)} at paid rates`;
  return (
    <p className="label truncate text-ink-soft" aria-label={`Cost of this run: $${cost.costUsd.toFixed(2)}, ${NAMES[cost.provider]}, ${detail}`} title={detail}>
      ${cost.costUsd.toFixed(2)} · {NAMES[cost.provider]} · {(cost.inputTokens + cost.outputTokens).toLocaleString("en-AU")} tokens
    </p>
  );
}
