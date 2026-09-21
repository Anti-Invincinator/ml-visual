import Link from "next/link";
import type { Metadata } from "next";
import SimulatedAnnealingExplorer from "@/algorithms/simulated-annealing/SimulatedAnnealingExplorer";

export const metadata: Metadata = {
  title: "Simulated annealing — ml/visual",
  description:
    "Simulated annealing vs. plain gradient descent on the multi-modal Rastrigin function, implemented from scratch.",
};

export default function SimulatedAnnealingPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <Link href="/" className="font-mono text-xs text-[var(--ink-muted)] hover:text-[var(--ink-secondary)]">
        ← all algorithms
      </Link>

      <h1 className="mt-6 text-3xl font-medium tracking-tight text-[var(--ink-primary)]">
        Simulated annealing
      </h1>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-[var(--ink-secondary)]">
        Named for how metal cools: hot and malleable at first, gradually locking into place. Simulated annealing
        takes worse moves on purpose while &ldquo;hot,&rdquo; with a probability that shrinks as it cools — early on
        that&apos;s enough to walk back out of a bad basin; by the end, only genuine improvements get accepted.
      </p>
      <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-[var(--ink-muted)]">
        In practice: computer chip designers use this to place millions of transistors on a die, and airlines use
        it (or a close relative) to build crew schedules — both are search spaces far too large and bumpy to
        explore with anything that only ever moves downhill.
      </p>

      <section className="mt-16">
        <h2 className="text-lg font-medium text-[var(--ink-primary)]">Same start, same landscape</h2>
        <p className="mt-1 text-[13px] text-[var(--ink-secondary)]">
          Red dots mark every move that was worse than where it already was — and got accepted anyway.
        </p>
        <div className="mt-8">
          <SimulatedAnnealingExplorer />
        </div>
      </section>

      <section className="mt-20 border-t border-[var(--hairline)] pt-8">
        <p className="text-[13px] text-[var(--ink-secondary)]">
          The from-scratch Python/numpy version of this — same comparison, same function — lives in{" "}
          <code className="font-mono text-[var(--ink-primary)]">
            notebooks/search-optimization/simulated-annealing/simulated_annealing.ipynb
          </code>
          .
        </p>
      </section>
    </div>
  );
}
