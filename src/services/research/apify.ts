import { setTimeout as sleep } from "node:timers/promises";
import { z } from "zod";
import { ResearchError, type ResearchUsage } from "./types";

const actorRun = z.object({
  id: z.string(), status: z.string(), defaultDatasetId: z.string().optional(), defaultKeyValueStoreId: z.string().optional(), usageTotalUsd: z.number().nonnegative().optional(),
  chargedEventCounts: z.record(z.string(), z.number().nonnegative()).optional(),
  pricingInfo: z.object({ pricingModel: z.string(), pricingPerEvent: z.object({
    actorChargeEvents: z.record(z.string(), z.object({ eventPriceUsd: z.number().nonnegative() })),
  }).optional() }).optional(),
});
type ActorRun = z.infer<typeof actorRun>;
type Actor = "apify/website-content-crawler" | "apify/rag-web-browser" | "apify/playwright-scraper";
const terminal = new Set(["SUCCEEDED", "FAILED", "TIMED-OUT", "ABORTED"]);
class ApifyHttpError extends Error { constructor(public status: number) { super("Apify request failed"); } }
function runCharge(run: ActorRun): number | null {
  if (run.pricingInfo?.pricingModel !== "PAY_PER_EVENT") return run.usageTotalUsd ?? null;
  const prices = run.pricingInfo.pricingPerEvent?.actorChargeEvents;
  if (!prices || !run.chargedEventCounts) return null;
  let sum = 0;
  for (const [event, count] of Object.entries(run.chargedEventCounts)) {
    if (!count) continue;
    if (!prices[event]) return null;
    sum += count * prices[event].eventPriceUsd;
  }
  return sum;
}

export class ApifySession {
  previewStore: string | undefined;
  partial = false;
  private costPolicy: "target" | "cap" = "cap";
  private reserved = 0;
  private runs = new Map<string, ActorRun>();
  private uncertain = false;
  private options;
  constructor(options: { token: string; maxUsd: number; fetcher?: typeof fetch; signal?: AbortSignal }) {
    this.options = { ...options, fetcher: options.fetcher ?? fetch };
  }
  usage(): ResearchUsage {
    const runs = [...this.runs.values()];
    return {
      costUsd: this.uncertain || runs.some(r => !terminal.has(r.status) || runCharge(r) === null) ? null :
        Math.round(runs.reduce((sum, run) => sum + (runCharge(run) ?? 0), 0) * 1e6) / 1e6,
      reservedUsd: this.reserved, maxUsd: this.options.maxUsd, runIds: runs.map(r => r.id),
      budgetPolicy: this.costPolicy,
    };
  }
  private async request(path: string, init: RequestInit = {}, independent = false): Promise<unknown> {
    const timeout = AbortSignal.timeout(20_000);
    const signal = independent || !this.options.signal ? timeout : AbortSignal.any([timeout, this.options.signal]);
    const response = await this.options.fetcher(`https://api.apify.com/v2/${path}`, {
      ...init, signal, headers: { Authorization: `Bearer ${this.options.token}`, "Content-Type": "application/json" },
    });
    if (!response.ok) throw new ApifyHttpError(response.status);
    const body = await response.text();
    if (body.length > 2_000_000) throw new Error("Apify response exceeds size limit");
    return JSON.parse(body);
  }
  private async readRun(path: string, init?: RequestInit, independent = false) {
    return z.object({ data: actorRun }).parse(await this.request(path, init, independent)).data;
  }
  async execute(actor: Actor, input: object, allocation: number): Promise<unknown[]> {
    const browser = actor === "apify/playwright-scraper";
    if (browser) this.costPolicy = "target";
    allocation = Math.round(allocation * 1e6) / 1e6;
    if (this.options.signal?.aborted) throw new ResearchError("research_cancelled", "Research was cancelled.", this.usage());
    if (allocation <= 0 || this.reserved + allocation > this.options.maxUsd + 1e-9) {
      throw new ResearchError("research_budget", "The research budget is exhausted. Paste source text to continue.", this.usage());
    }
    this.reserved = Math.round((this.reserved + allocation) * 1e6) / 1e6;
    let started: ActorRun | undefined;
    try {
      // A failed start may already have charged the account. Never retry it.
      this.uncertain = true;
      started = await this.readRun(`acts/${actor.replace("/", "~")}/runs?waitForFinish=1&timeout=${browser ? 120 : 90}${browser ? "&memory=1024" : `&maxTotalChargeUsd=${allocation}`}`, {
        method: "POST", body: JSON.stringify(input),
      });
      this.uncertain = false;
      this.runs.set(started.id, started);
      const deadline = Date.now() + (browser ? 125_000 : 90_000);
      while (!terminal.has(started.status)) {
        if (Date.now() >= deadline) throw new Error("Research timeout");
        await sleep(750, undefined, { signal: this.options.signal });
        started = await this.readRun(`actor-runs/${started.id}`);
        this.runs.set(started.id, started);
      }
      if ((!browser && started.status !== "SUCCEEDED") || !started.defaultDatasetId) throw new Error("Research did not finish");
      this.partial = started.status !== "SUCCEEDED";
      this.previewStore = started.defaultKeyValueStoreId;
      return z.array(z.unknown()).parse(await this.request(`datasets/${started.defaultDatasetId}/items?format=json&limit=30`));
    } catch (error) {
      if (!started && error instanceof ApifyHttpError && [400, 401, 402, 403, 404, 422, 429].includes(error.status)) this.uncertain = false;
      if (started && !terminal.has(started.status)) {
        try {
          const aborted = await this.readRun(`actor-runs/${started.id}/abort`, { method: "POST" }, true);
          this.runs.set(aborted.id, aborted);
        } catch { this.uncertain = true; }
      }
      throw new ResearchError(error instanceof ApifyHttpError ? `research_http_${error.status}` : "research_failed", error instanceof ApifyHttpError && error.status < 500 ? "The research service did not accept this request. Paste source text to continue, or ask Leveric to check the research configuration." : "Some research could not finish. Review the available evidence or paste source text. Do not immediately retry a failed start: it may still be running on Apify.", this.usage());
    }
  }
}
