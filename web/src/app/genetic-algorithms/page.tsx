import Link from "next/link";
import type { Metadata } from "next";
import GeneticAlgorithmExplorer from "@/algorithms/genetic-algorithms/GeneticAlgorithmExplorer";

export const metadata: Metadata = {
  title: "Genetic algorithms — ml/visual",
  description: "A genetic algorithm solving N-Queens from scratch — chromosomes, crossover, and mutation, live.",
};

export default function GeneticAlgorithmsPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <Link href="/" className="font-mono text-sm text-[var(--ink-muted)] hover:text-[var(--ink-secondary)]">
        ← all algorithms
      </Link>

      <h1 className="mt-6 text-4xl font-medium tracking-tight text-[var(--ink-primary)]">
        Genetic algorithms
      </h1>
      <p className="mt-3 max-w-2xl text-[17px] leading-relaxed text-[var(--ink-secondary)]">
        Not every optimizer needs a gradient. A genetic algorithm keeps a whole population of candidate solutions at
        once and evolves it generation by generation: the fittest survive, pairs combine (crossover), and mutation
        keeps the search from stalling. The classic showcase for this is <strong>N-Queens</strong> — place N queens
        on an N×N board so none attack another. It&apos;s a constraint problem with no gradient to follow (a queen
        either attacks another or it doesn&apos;t — nothing in between to differentiate), and a chromosome for it is
        about as simple as encodings get: one number per row.
      </p>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-[var(--ink-muted)]">
        In practice: NASA used this same evolve-a-population approach to design an unusual, bent-wire antenna for
        a 2006 satellite — a shape no human engineer would have sketched, but one that measurably outperformed the
        hand-designed alternative on the mission&apos;s actual requirements.
      </p>

      <section className="mt-16">
        <h2 className="text-xl font-medium text-[var(--ink-primary)]">Watch it evolve</h2>
        <p className="mt-1 text-[15px] text-[var(--ink-secondary)]">
          Toggle between 4 and 8 queens — the smaller board converges almost instantly and makes the mechanics
          easier to follow; 8-queens is the classic version and takes real generations to solve. If the population
          goes 20 generations without improving, it restarts from scratch — without that, tournament selection and
          crossover alone get permanently stuck on a real fraction of runs, no matter how much time you give them.
        </p>
        <div className="mt-8">
          <GeneticAlgorithmExplorer />
        </div>
      </section>

      <section className="mt-20 border-t border-[var(--hairline)] pt-8">
        <p className="text-[15px] text-[var(--ink-secondary)]">
          The from-scratch Python/numpy version of this — same encoding, same operators — lives in{" "}
          <code className="font-mono text-[var(--ink-primary)]">
            notebooks/search-optimization/genetic-algorithms/genetic_algorithms.ipynb
          </code>
          .
        </p>
      </section>
    </div>
  );
}
