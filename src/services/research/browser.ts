import { z } from "zod";
import { brandSchema, emptyBrand } from "./brand.schema";
import { browserGuard, browserPage } from "./browser-script";
import { publicUrl } from "./url";
import type { ResearchSource } from "./types";

export function browserInput(url: string) {
  return { startUrls: [{ url, userData: { initial: true } }], customData: { startUrl: url },
    pageFunction: browserPage, preNavigationHooks: browserGuard, launcher: "chromium",
    maxPagesPerCrawl: 6, maxResultsPerCrawl: 6, maxConcurrency: 1, maxRequestRetries: 0,
    maxCrawlingDepth: 1, linkSelector: "", proxyConfiguration: { useApifyProxy: true },
    respectRobotsTxtFile: true, pageLoadTimeoutSecs: 20, pageFunctionTimeoutSecs: 15,
    waitUntil: "domcontentloaded", downloadCss: true, downloadMedia: true, maxScrollHeightPixels: 0,
    ignoreSslErrors: false, ignoreCorsAndCsp: false,
  };
}
const rawObservation = z.object({ value: z.string().max(240), selector: z.string().max(180), role: z.string().max(80) });
const pageSchema = z.object({ url: z.string(), title: z.string().max(1000), text: z.string(), truncated: z.boolean().optional(),
  previewKey: z.enum(["brand-home", "brand-entry"]).nullable().optional(),
  brand: z.object({ colors: z.array(rawObservation).default([]), fonts: z.array(rawObservation).default([]), imagery: z.array(rawObservation).default([]), actions: z.array(rawObservation).default([]), logo: rawObservation.nullable().default(null) }).optional(),
});
export async function parseBrowserPages(items: unknown[], now: Date, validate = publicUrl) {
  const sources: ResearchSource[] = [], gaps: string[] = [];
  let brand = emptyBrand(), previewKey: "brand-home" | "brand-entry" | null = null;
  for (const raw of items.slice(0, 6)) {
    const parsed = pageSchema.safeParse(raw);
    if (!parsed.success) { gaps.push("A website page could not be read."); continue; }
    const page = parsed.data;
    let url: string;
    try { url = await validate(page.url); } catch { gaps.push("An unsafe or unavailable page was excluded."); continue; }
    if (!page.text.trim() || sources.some(s => s.url === url)) continue;
    const remaining = 40000 - sources.reduce((n, s) => n + s.text.length, 0);
    if (remaining <= 0) { gaps.push("Source text reached the 40,000-character limit."); break; }
    const text = page.text.slice(0, Math.min(12000, remaining));
    if (page.truncated || text.length < page.text.length) gaps.push("Some page text was truncated to stay within research limits.");
    const sourceId = `s${sources.length + 1}`;
    sources.push({ id: sourceId, url, title: page.title, text, origin: "web", fetchedAt: now.toISOString() });
    if (page.brand && (sources.length === 1 || new URL(url).pathname === "/")) {
      const obs = (items: z.infer<typeof rawObservation>[]) => items.map(o => ({ ...o, sourceId }));
      brand = brandSchema.parse({ colors: obs(page.brand.colors).filter(o => /^rgba?\([\d.,\s%]+\)$/.test(o.value)).slice(0, 8),
        fonts: obs(page.brand.fonts).slice(0, 6), imagery: obs(page.brand.imagery).slice(0, 4), actions: obs(page.brand.actions).slice(0, 5),
        logo: page.brand.logo ? { ...page.brand.logo, sourceId } : null, preview: null });
      previewKey = page.previewKey ?? null;
    }
  }
  if (!brand.colors.length) gaps.push("Website colours could not be observed.");
  if (!brand.fonts.length) gaps.push("Website font families could not be observed.");
  return { sources, brand, gaps: [...new Set(gaps)], previewKey };
}
