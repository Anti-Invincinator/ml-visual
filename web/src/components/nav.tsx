import Link from "next/link";

export default function Nav() {
  return (
    <header className="border-b border-[var(--hairline)]">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="font-mono text-[17px] tracking-tight text-[var(--ink-primary)]"
        >
          ml<span className="glow-accent text-[var(--accent)]">/</span>visual
        </Link>
        <span className="font-mono text-sm text-[var(--ink-muted)]">
          algorithms, from scratch
        </span>
      </div>
    </header>
  );
}
