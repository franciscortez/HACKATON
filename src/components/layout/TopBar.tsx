import Link from "next/link";
import { ClientSwitcher } from "@/components/layout/ClientSwitcher";
import { RunCounter } from "@/components/layout/RunCounter";

export function TopBar() {
  return (
    <header className="px-pad sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-rule-l bg-field/95 py-3 backdrop-blur">
      <Link href="/" className="text-lg font-semibold uppercase tracking-[var(--tracking-display)]">
        Leveric<span className="label ml-2 align-middle text-ink-soft">Workbench</span>
      </Link>
      <div className="flex flex-wrap items-center gap-4">
        <ClientSwitcher />
        <RunCounter />
      </div>
    </header>
  );
}
