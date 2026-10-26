import Link from "next/link";

export function TopBar() {
  return (
    <header className="px-pad sticky top-0 z-20 flex items-center justify-between border-b border-rule-l bg-field/95 py-3 backdrop-blur">
      <Link href="/" className="text-lg font-semibold uppercase tracking-[var(--tracking-display)]">
        Leveric<span className="label ml-2 align-middle text-ink-soft">Workbench</span>
      </Link>
      <Link href="/" className="label arrow-link text-ink-soft hover:text-ink">
        Tools <span className="arrow">→</span>
      </Link>
    </header>
  );
}
