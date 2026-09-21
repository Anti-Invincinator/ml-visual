import Link from "next/link";
import type { Metadata } from "next";
import DecisionTreeExplorer from "@/algorithms/decision-trees/DecisionTreeExplorer";

export const metadata: Metadata = {
  title: "Decision trees — ml/visual",
  description:
    "A CART-style decision tree, implemented from scratch, splitting a checkerboard dataset live as depth grows.",
};

export default function DecisionTreesPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <Link href="/" className="font-mono text-xs text-[var(--ink-muted)] hover:text-[var(--ink-secondary)]">
        ← all algorithms
      </Link>

      <h1 className="mt-6 text-3xl font-medium tracking-tight text-[var(--ink-primary)]">
        Decision trees
      </h1>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-[var(--ink-secondary)]">
        A decision tree asks one question at a time — is this feature above or below some threshold? — and picks
        each question greedily to make the two resulting groups as pure as possible. No gradients, no iterative
        optimization: just recursive splitting, implemented from scratch below with Gini impurity as the criterion.
      </p>

      <section className="mt-16">
        <h2 className="text-lg font-medium text-[var(--ink-primary)]">Depth is the whole knob</h2>
        <p className="mt-1 text-[13px] text-[var(--ink-secondary)]">
          Drag the depth slider — the tree diagram and decision surface update instantly, and the accuracy chart
          below shows exactly where more depth stops helping.
        </p>
        <div className="mt-8">
          <DecisionTreeExplorer />
        </div>
      </section>

      <section className="mt-20 border-t border-[var(--hairline)] pt-8">
        <p className="text-[13px] text-[var(--ink-secondary)]">
          The from-scratch Python/numpy version of this — same tree, same dataset, same overfitting curve — lives in{" "}
          <code className="font-mono text-[var(--ink-primary)]">
            notebooks/decision-trees/decision_trees.ipynb
          </code>
          .
        </p>
      </section>
    </div>
  );
}
