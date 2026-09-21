import Link from "next/link";
import type { Metadata } from "next";
import LossSurfaceRace from "@/algorithms/gradient-descent/LossSurfaceRace";

export const metadata: Metadata = {
  title: "Gradient descent — ml/visual",
  description:
    "Batch, momentum, and noisy/SGD-style gradient descent, implemented from scratch and raced live on a loss surface.",
};

export default function GradientDescentPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <Link href="/" className="font-mono text-sm text-[var(--ink-muted)] hover:text-[var(--ink-secondary)]">
        ← all algorithms
      </Link>

      <h1 className="mt-6 text-4xl font-medium tracking-tight text-[var(--ink-primary)]">
        Gradient descent
      </h1>
      <p className="mt-3 max-w-2xl text-[17px] leading-relaxed text-[var(--ink-secondary)]">
        Almost everything that &ldquo;learns&rdquo; is gradient descent wearing a costume. The first surface below is
        deliberately lopsided — steep in one direction, shallow in the other — the shape that makes vanilla descent
        visibly zig-zag and makes momentum&apos;s advantage obvious. The second is harder: two basins of different
        depth, which is what a real, non-convex training loss actually looks like. All three optimizers run entirely
        in the browser, computed from scratch in TypeScript.
      </p>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-[var(--ink-muted)]">
        In practice: every large language model you&apos;ve used was trained by exactly this update rule, just
        applied to a loss surface with billions of dimensions instead of two — momentum (or a close cousin of it,
        Adam) is the default in almost every real training run, both for the zig-zag reason and because a plain
        update can stall in a shallow basin that a bit of accumulated velocity, or noise, can carry it past.
      </p>

      <section className="mt-16">
        <h2 className="text-xl font-medium text-[var(--ink-primary)]">Race the optimizers</h2>
        <p className="mt-1 text-[15px] text-[var(--ink-secondary)]">
          Same start, same learning rate, same surface — only the update rule changes. Switch surfaces to go from
          the textbook convex case to one with a local minimum to get trapped in.
        </p>
        <div className="mt-8">
          <LossSurfaceRace />
        </div>
      </section>

      <section className="mt-20 border-t border-[var(--hairline)] pt-8">
        <p className="text-[15px] text-[var(--ink-secondary)]">
          The from-scratch Python/numpy version of this — with the same three optimizers and a loss-vs-iteration
          comparison — lives in{" "}
          <code className="font-mono text-[var(--ink-primary)]">
            notebooks/foundations/gradient-descent/gradient_descent.ipynb
          </code>
          .
        </p>
      </section>
    </div>
  );
}
