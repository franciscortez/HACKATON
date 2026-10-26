import { z } from "zod";
import { ApifySession } from "./apify";
import { publicUrl } from "./url";
import type { ResearchSource } from "./types";

const pageSchema = z.object({ url: z.string().optional(), title: z.string().nullish(), markdown: z.string().nullish(), text: z.string().nullish(),
  crawl: z.object({ loadedUrl: z.string().optional() }).optional(),
  searchResult: z.object({ url: z.string(), title: z.string(), description: z.string().optional() }).optional(),
  metadata: z.object({ title: z.string().nullish(), redirectedUrl: z.string().optional() }).optional() });

export class ResearchCollection {
  sources: ResearchSource[] = [];
  gaps: string[] = [];
  constructor(public session: ApifySession, private now: Date, private validate = publicUrl) {}
  async addPages(items: unknown[], maxPages: number) {
    for (const raw of items.slice(0, maxPages)) {
      const parsed = pageSchema.safeParse(raw);
      if (!parsed.success) continue;
      const page = parsed.data;
      const fullText = page.markdown ?? page.text;
      const text = fullText || page.searchResult?.description || "";
      if (!text.trim()) continue;
      try {
        const rawUrl = page.crawl?.loadedUrl ?? page.metadata?.redirectedUrl ?? page.url ?? page.searchResult?.url;
        if (!rawUrl) continue;
        const url = await this.validate(rawUrl);
        if (this.sources.some(s => s.url === url && s.origin === "web")) continue;
        const remaining = 40_000 - this.sources.reduce((sum, s) => sum + s.text.length, 0);
        if (remaining <= 0) break;
        this.sources.push({ id: `s${this.sources.length + 1}`, url, title: page.metadata?.title ?? page.title ?? page.searchResult?.title ?? new URL(url).hostname,
          text: text.slice(0, Math.min(4000, remaining)), origin: fullText ? "web" : "search", fetchedAt: this.now.toISOString() });
      } catch { this.gaps.push("A source resolved to an unsafe or unavailable address and was excluded."); }
    }
  }
  async company(raw: string, allocation: number) {
    const url = await this.validate(raw), origin = new URL(url).origin;
    const items = await this.session.execute("apify/website-content-crawler", {
      startUrls: [{ url }], maxCrawlPages: 5, maxCrawlDepth: 1, useSitemaps: false,
      includeUrlGlobs: [url, `${origin}/`, ...["about", "our", "team", "service", "contact", "people"].map(path => `${origin}/${path}*`)],
      saveMarkdown: true, saveHtml: false, saveScreenshots: false,
    }, allocation);
    await this.addPages(items, 5);
  }
  async additional(args: { company: string; companyUrl: string; contact: string; city: string | null; industry: string | null; country: string }, allocations: { search: number; pages: number }) {
    const { company, companyUrl, contact, city, industry, country } = args;
    const companyHost = new URL(companyUrl).hostname;
    const clean = (s: string) => s.replace(/["\r\n]/g, " ").slice(0, 100);
    const region = country.toLowerCase() === "nz" ? "New Zealand" : "Australia";
    const options = { outputFormats: ["markdown"], requestTimeoutSecs: 40, serpMaxRetries: 0, maxRequestRetries: 0 };
    const contactPages = await this.session.execute("apify/rag-web-browser", {
      ...options, query: `"${clean(contact)}" "${clean(company)}" ${region} -site:linkedin.com -site:facebook.com -site:instagram.com`, maxResults: 1,
    }, allocations.search);
    await this.addPages(contactPages, 1);
    if (!city || !industry) { this.gaps.push("Competitor search skipped: company city or industry is not verified."); return; }
    // RAG search uses Google's US locale, so geography is explicit and every competitor is verified later.
    const competitorPages = await this.session.execute("apify/rag-web-browser", {
      ...options, query: `"${clean(industry)}" "${clean(city)}" ${region} -site:${companyHost} -site:linkedin.com -site:facebook.com`, maxResults: 2,
    }, allocations.pages);
    await this.addPages(competitorPages, 2);
  }
}
