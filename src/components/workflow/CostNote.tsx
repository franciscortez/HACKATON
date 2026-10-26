import type { CostNote as Cost } from "@/types/run";

const NAMES = { groq: "Groq free tier", gemini: "Gemini free tier", ollama: "Local Ollama" } as const;

export function CostNote({ cost }: { cost: Cost }) {
  return (
    <div className="label text-ink-soft" aria-label="Cost of this run"><p>
      ${cost.costUsd.toFixed(2)} · {NAMES[cost.provider]} · {cost.model} · {cost.inputTokens.toLocaleString("en-AU")} in /{" "}
      {cost.outputTokens.toLocaleString("en-AU")} out · ~${cost.estPaidUsd.toFixed(4)} at paid rates
    </p>
      {cost.research && <p className="mt-1">Research: {cost.research.costUsd === null ? "charge pending" : `US$${cost.research.costUsd.toFixed(4)} Apify usage`} · {cost.research.budgetPolicy === "target" ? "target, not a guaranteed ceiling" : "allocation"} US${cost.research.maxUsd.toFixed(2)}</p>}
      {cost.modelCalls && <details className="mt-1"><summary className="cursor-pointer">Model calls ({cost.modelCalls.length})</summary>{cost.modelCalls.map((call, index) => <p key={index}>{call.stage}: {call.provider} · {call.model} · {call.inputTokens} in / {call.outputTokens} out</p>)}</details>}
    </div>
  );
}
