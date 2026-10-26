import type { CostNote as Cost } from "@/types/run";

const NAMES = { groq: "Groq", gemini: "Gemini", ollama: "Local" } as const;

/** One short line; the full breakdown is in the tooltip. */
export function CostNote({ cost }: { cost: Cost }) {
  const detail = `${cost.model} · ${cost.inputTokens.toLocaleString("en-AU")} tokens in / ${cost.outputTokens.toLocaleString("en-AU")} out · about $${cost.estPaidUsd.toFixed(4)} at paid rates`;
  return (
    <div className="label text-ink-soft"><p className="truncate" aria-label={`Cost of this run: $${cost.costUsd.toFixed(2)}, ${NAMES[cost.provider]}, ${detail}`} title={detail}>
      ${cost.costUsd.toFixed(2)} ? {NAMES[cost.provider]} ? {(cost.inputTokens + cost.outputTokens).toLocaleString("en-AU")} tokens
    </p>
      {cost.research && <p className="mt-1">Research: {cost.research.costUsd === null ? "charge pending" : `US$${cost.research.costUsd.toFixed(4)} Apify usage`} · {cost.research.budgetPolicy === "target" ? "target, not a guaranteed ceiling" : "allocation"} US${cost.research.maxUsd.toFixed(2)}</p>}
      {cost.modelCalls && <details className="mt-1"><summary className="cursor-pointer">Model calls ({cost.modelCalls.length})</summary>{cost.modelCalls.map((call, index) => <p key={index}>{call.stage}: {call.provider} · {call.model} · {call.inputTokens} in / {call.outputTokens} out</p>)}</details>}
    </div>
  );
}
