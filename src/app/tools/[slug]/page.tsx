import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense, type ComponentType } from "react";
import { StatusChip } from "@/components/workflow/StatusChip";
import { MeetingWorkbench } from "@/features/meeting-to-action";
import { ResearchWorkbench } from "@/features/research-to-call-brief";
import { getTool, listTools } from "@/features/registry";
import { VideoVariationsWorkbench } from "@/features/video-to-variations";

/** Workbench UI per runnable tool. Planned tools show their summary only. */
const workbenches: Record<string, ComponentType> = {
  "meeting-to-action": MeetingWorkbench,
  "research-to-call-brief": ResearchWorkbench,
  "video-to-variations": VideoVariationsWorkbench,
};

/** Tools that are full-width editors: a one-line header, no summary, so the editor gets the screen. */
const editors = new Set(["video-to-variations"]);

/** Every tool page is known at build time, so all of them prerender. */
export function generateStaticParams() {
  return listTools().map((tool) => ({ slug: tool.slug }));
}

export default function ToolPage({ params }: PageProps<"/tools/[slug]">) {
  return (
    <div className="px-pad flex flex-1 flex-col py-8">
      <Link href="/" className="label arrow-link text-ink-soft hover:text-ink">
        <span className="arrow inline-block rotate-180">→</span> All tools
      </Link>
      <Suspense fallback={<p className="label mt-6 text-ink-soft">Loading tool…</p>}>
        <Tool params={params} />
      </Suspense>
    </div>
  );
}

async function Tool({ params }: Pick<PageProps<"/tools/[slug]">, "params">) {
  const { slug } = await params;
  const tool = getTool(slug);
  if (!tool) notFound();
  const Workbench = workbenches[slug];
  const editor = editors.has(slug);

  return (
    <>
      <header className={`flex flex-wrap items-end justify-between gap-4 border-b border-ink ${editor ? "mt-3 pb-3" : "mt-6 pb-6"}`}>
        <div>
          <p className="label text-ink-soft">{tool.index} · Tool</p>
          <h1
            className="mt-2 font-semibold uppercase leading-[0.9] tracking-[var(--tracking-display)]"
            style={{ fontSize: slug === "research-to-call-brief" || editor ? "clamp(24px, 3vw, 32px)" : "clamp(36px, 6vw, 96px)" }}
          >
            {tool.name}
          </h1>
          {!editor && <p className="mt-3 max-w-[60ch] text-lg text-ink-soft">{tool.summary}</p>}
        </div>
        <StatusChip value={tool.status} />
      </header>
      <div className={`${editor ? "mt-3" : "mt-6"} flex-1`}>
        {Workbench ? <Workbench /> : <p className="py-10 text-ink-soft">This tool is planned. Its spec is in docs/tools.</p>}
      </div>
    </>
  );
}
