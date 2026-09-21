import Link from "next/link";
import type { AlgorithmEntry } from "@/lib/algorithms";

export default function AlgorithmCard({ algorithm }: { algorithm: AlgorithmEntry }) {
  const content = (
    <div
      className={`group h-full p-5 transition-colors ${
        algorithm.status === "live"
          ? "hover:bg-[var(--surface)]"
          : "opacity-50"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-[15px] font-medium text-[var(--ink-primary)]">
          {algorithm.name}
        </h3>
        {algorithm.status === "live" ? (
          <span className="mt-0.5 shrink-0 rounded-full border border-[var(--status-good)]/30 bg-[var(--status-good)]/10 px-2 py-0.5 font-mono text-[11px] text-[var(--status-good)]">
            live
          </span>
        ) : (
          <span className="mt-0.5 shrink-0 rounded-full border border-[var(--border)] px-2 py-0.5 font-mono text-[11px] text-[var(--ink-muted)]">
            soon
          </span>
        )}
      </div>
      <p className="mt-2 text-[13px] leading-relaxed text-[var(--ink-secondary)]">
        {algorithm.description}
      </p>
    </div>
  );

  if (algorithm.status !== "live") {
    return content;
  }

  return (
    <Link href={`/${algorithm.slug}`} className="block h-full">
      {content}
    </Link>
  );
}
