import AlgorithmCard from "@/components/algorithm-card";
import { categories } from "@/lib/algorithms";

export default function Home() {
  return (
    <div className="mx-auto max-w-5xl px-6">
      <section className="border-b border-[var(--hairline)] py-20">
        <p className="font-mono text-sm uppercase tracking-[0.2em] text-[var(--ink-muted)]">
          ml visual · algorithms
        </p>
        <h1 className="mt-4 max-w-2xl text-5xl font-medium leading-tight tracking-tight text-[var(--ink-primary)] sm:text-6xl">
          Algorithms, from <span className="glow-accent text-[var(--accent)]">first principles</span>.
        </h1>
        <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-[var(--ink-secondary)]">
          Classical ML, deep learning, and neural network fundamentals —
          implemented from scratch, twice. Once in Python for the math, once
          in TypeScript so you can drag a point and watch it happen.
        </p>
      </section>

      {categories.map((category) => (
        <section key={category.name} className="py-12">
          <div className="flex items-baseline justify-between gap-4 border-b border-[var(--hairline)] pb-4">
            <h2 className="text-xl font-medium text-[var(--ink-primary)]">
              {category.name}
            </h2>
            <p className="text-right text-[15px] text-[var(--ink-muted)]">
              {category.description}
            </p>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-px bg-[var(--hairline)] sm:grid-cols-2 lg:grid-cols-3">
            {category.algorithms.map((algorithm) => (
              <div key={algorithm.slug} className="bg-[var(--page)]">
                <AlgorithmCard algorithm={algorithm} />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
