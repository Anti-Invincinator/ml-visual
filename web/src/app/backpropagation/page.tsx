import Link from "next/link";
import type { Metadata } from "next";
import BackpropExplorer from "@/algorithms/backpropagation/BackpropExplorer";

export const metadata: Metadata = {
  title: "Backpropagation — ml/visual",
  description:
    "A small neural network learning XOR and a concentric-circles boundary from scratch — forward pass, manual backprop, and gradient descent, live in the browser.",
};

export default function BackpropagationPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <Link href="/" className="font-mono text-sm text-[var(--ink-muted)] hover:text-[var(--ink-secondary)]">
        ← all algorithms
      </Link>

      <h1 className="mt-6 text-4xl font-medium tracking-tight text-[var(--ink-primary)]">
        Backpropagation
      </h1>
      <p className="mt-3 max-w-2xl text-[17px] leading-relaxed text-[var(--ink-secondary)]">
        Backprop is just the chain rule, applied layer by layer. A tiny network below learns two problems that a
        single-layer model can&apos;t solve: XOR, the textbook minimum case, and a much more visual one — telling
        two concentric rings of points apart, which takes real hidden-layer capacity to trace a closed curve
        through. Every gradient is derived by hand and every weight update is computed from scratch in TypeScript.
      </p>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-[var(--ink-muted)]">
        In practice: this is the exact same algorithm behind your phone unlocking with your face, a spam filter
        that keeps adapting to new tricks, and every chatbot you&apos;ve talked to — all of it is backprop, just
        with millions or billions of parameters instead of a dozen.
      </p>

      <section className="mt-16">
        <h2 className="text-xl font-medium text-[var(--ink-primary)]">Watch the boundary fold into place</h2>
        <p className="mt-1 text-[15px] text-[var(--ink-secondary)]">
          The decision boundary starts as noise and folds itself around the data as training progresses. Switch
          problems to see how much more hidden-layer work a closed curve takes than a single bent line.
        </p>
        <div className="mt-8">
          <BackpropExplorer />
        </div>
      </section>

      <section className="mt-20 border-t border-[var(--hairline)] pt-8">
        <p className="text-[15px] text-[var(--ink-secondary)]">
          The from-scratch Python/numpy version of this — vectorized forward/backward pass, decision-boundary
          snapshots across training — lives in{" "}
          <code className="font-mono text-[var(--ink-primary)]">
            notebooks/deep-learning/backpropagation/backpropagation.ipynb
          </code>
          .
        </p>
      </section>
    </div>
  );
}
