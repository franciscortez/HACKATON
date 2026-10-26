import type { MeetingOutput } from "@/features/meeting-to-action/types";

type Item = MeetingOutput["decisions"][number];

export function DecisionsList({ title, items }: { title: string; items: Item[] }) {
  if (items.length === 0) return null;
  return (
    <section aria-label={title} className="mt-8">
      <p className="label text-ink-soft">{title}</p>
      <ul className="mt-2 border-t border-rule-l">
        {items.map((item, i) => (
          <li key={i} className="border-b border-rule-l py-3">
            <p className="font-medium">{item.text}</p>
            <p className="mt-1 text-sm text-ink-soft">
              &ldquo;{item.quote}&rdquo;{!item.verified && <span className="label ml-2 text-warn">Quote not found</span>}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
