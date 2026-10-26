"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { cx } from "@/lib/utils";

export interface TabItem {
  id: string;
  label: string;
  count?: number;
}

/** Underlined tab bar with arrow-key navigation. The active panel is rendered by the parent. */
export function Tabs({ tabs, active, onChange, children }: { tabs: TabItem[]; active: string; onChange: (id: string) => void; children: ReactNode }) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  function onKey(e: KeyboardEvent, i: number) {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = (i + step + tabs.length) % tabs.length;
    onChange(tabs[next].id);
    refs.current[next]?.focus();
  }

  return (
    <div>
      {/* Swipeable on phones, but no visible scrollbar. */}
      <div
        role="tablist"
        className="flex gap-1 overflow-x-auto overflow-y-hidden border-b border-rule-l [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {tabs.map((tab, i) => {
          const selected = tab.id === active;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                refs.current[i] = el;
              }}
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(tab.id)}
              onKeyDown={(e) => onKey(e, i)}
              className={cx(
                "flex shrink-0 items-center gap-2 px-3 py-3 font-medium transition-colors duration-300 ease-brand first:pl-0",
                // Underline drawn inside the tab, so the bar never overflows.
                selected ? "text-blue shadow-[inset_0_-2px_0_var(--color-blue)]" : "text-ink-soft hover:text-ink hover:shadow-[inset_0_-2px_0_var(--color-rule-l)]",
              )}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={cx(
                    "min-w-6 px-1.5 py-0.5 text-center font-mono text-[11px] leading-none tabular-nums transition-colors duration-300",
                    selected ? "bg-blue text-white" : "bg-ink/10 text-ink-soft",
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" id={`panel-${active}`} aria-labelledby={`tab-${active}`} className="pt-4">
        {children}
      </div>
    </div>
  );
}
