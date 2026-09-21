import Link from "next/link";
import type { Metadata } from "next";
import SVMExplorer from "@/algorithms/svm/SVMExplorer";

export const metadata: Metadata = {
  title: "Support vector machines — ml/visual",
  description:
    "Linear vs. RBF kernel SVM, trained from scratch via subgradient descent and compared live side by side.",
};

export default function SVMPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <Link href="/" className="font-mono text-xs text-[var(--ink-muted)] hover:text-[var(--ink-secondary)]">
        ← all algorithms
      </Link>

      <h1 className="mt-6 text-3xl font-medium tracking-tight text-[var(--ink-primary)]">
        Support vector machines
      </h1>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-[var(--ink-secondary)]">
        An SVM finds the boundary with the widest margin between classes — but a straight-line boundary can only
        separate data that&apos;s actually linearly separable. The kernel trick sidesteps that by measuring
        similarity in a bent space instead of the raw one, without ever computing the bent coordinates directly.
        Both models below are trained from scratch via subgradient descent directly on the dual coefficients — no
        QP solver, no SMO.
      </p>
      <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-[var(--ink-muted)]">
        In practice: early spam filters and a lot of tumor-benign-vs-malignant medical classifiers ran on SVMs —
        clean margins and a principled &ldquo;how confident is this&rdquo; number matter a lot more than raw
        accuracy when a false negative is a missed cancer diagnosis.
      </p>

      <section className="mt-16">
        <h2 className="text-lg font-medium text-[var(--ink-primary)]">Linear vs. RBF, same data</h2>
        <p className="mt-1 text-[13px] text-[var(--ink-secondary)]">
          Larger, ringed points are support vectors — the points close enough to (or on the wrong side of) the margin
          to still be pulling on it.
        </p>
        <div className="mt-8">
          <SVMExplorer />
        </div>
      </section>

      <section className="mt-20 border-t border-[var(--hairline)] pt-8">
        <p className="text-[13px] text-[var(--ink-secondary)]">
          The from-scratch Python/numpy version of this — with the full gradient derivation — lives in{" "}
          <code className="font-mono text-[var(--ink-primary)]">notebooks/supervised/svm/svm.ipynb</code>.
        </p>
      </section>
    </div>
  );
}
