import Link from "next/link";
import { StatusChip } from "@/components/workflow/StatusChip";
import { listTools } from "@/features/registry";

export default function Home() {
  const tools = listTools().filter((tool) => tool.status === "LIVE");
  return (
    <>
      <section className="bg-dark-grain px-pad py-16 text-white md:py-24">
        <p className="label reveal text-white/60">00 · Workbench</p>
        <h1
          className="reveal mt-4 max-w-[14ch] font-semibold uppercase leading-[0.9] tracking-[var(--tracking-display)]"
          style={{ fontSize: "clamp(40px, 8.6vw, 176px)", ["--i" as string]: 1 }}
        >
          Source in. Approved out.
        </h1>
        <p className="reveal mt-6 max-w-[52ch] text-lg text-white/75" style={{ ["--i" as string]: 2 }}>
          Leveric tools turn a meeting, a page or a brief into reviewed, export-ready work. Nothing is sent until a
          person approves it.
        </p>
      </section>

      <section className="px-pad py-12">
        <div className="flex items-baseline justify-between border-b border-rule-l pb-3">
          <h2 className="font-semibold uppercase tracking-[var(--tracking-heading)]" style={{ fontSize: "clamp(28px, 4vw, 56px)" }}>
            Tools
          </h2>
          <span className="label text-ink-soft">{tools.length} tools · one at a time</span>
        </div>
        <ol>
          {tools.map((tool, i) => {
            const row = (
              <div className="grid grid-cols-[3rem_1fr] items-baseline gap-x-4 gap-y-2 py-5 sm:grid-cols-[4rem_1fr_auto_auto]">
                <span className="label text-ink-soft">{tool.index}</span>
                <div>
                  <h3 className="text-xl font-semibold tracking-[-0.04em] sm:text-2xl">{tool.name}</h3>
                  <p className="mt-1 max-w-[60ch] text-ink-soft">{tool.summary}</p>
                </div>
                <span className="col-start-2 sm:col-start-auto">
                  <StatusChip value={tool.status} />
                </span>
                <span className="label hidden sm:inline">Open <span className="arrow">→</span></span>
              </div>
            );
            return (
              <li key={tool.slug} className="reveal border-b border-rule-l" style={{ ["--i" as string]: i }}>
                <Link href={`/tools/${tool.slug}`} className="arrow-link block transition-colors duration-300 hover:bg-white/40">
                  {row}
                </Link>
              </li>
            );
          })}
        </ol>
      </section>
    </>
  );
}
