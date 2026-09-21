import Link from "next/link";
import type { Metadata } from "next";
import KMeansExplorer from "@/algorithms/kmeans/KMeansExplorer";

export const metadata: Metadata = {
  title: "K-means clustering — ml/visual",
  description:
    "Random init vs. k-means++, converging live side by side on the same data — implemented from scratch.",
};

export default function KMeansPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <Link href="/" className="font-mono text-xs text-[var(--ink-muted)] hover:text-[var(--ink-secondary)]">
        ← all algorithms
      </Link>

      <h1 className="mt-6 text-3xl font-medium tracking-tight text-[var(--ink-primary)]">
        K-means clustering
      </h1>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-[var(--ink-secondary)]">
        K-means alternates between two steps until nothing moves: assign every point to its nearest centroid, then
        move each centroid to the mean of the points assigned to it. It always converges — but not always to the
        same place. Where the centroids start matters a lot.
      </p>
      <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-[var(--ink-muted)]">
        In practice: retailers use this to split customers into segments nobody predefined — &ldquo;bargain
        hunters,&rdquo; &ldquo;weekend browsers&rdquo; — and it&apos;s the same idea behind crunching a 16-million-color
        photo down to the 256 colors a GIF can actually hold, by clustering similar pixel colors together.
      </p>

      <section className="mt-16">
        <h2 className="text-lg font-medium text-[var(--ink-primary)]">Initialization matters</h2>
        <p className="mt-1 text-[13px] text-[var(--ink-secondary)]">
          Hit &ldquo;new seed&rdquo; a few times — random init will occasionally land on a visibly worse clustering
          than k-means++, even on data this simple.
        </p>
        <div className="mt-8">
          <KMeansExplorer />
        </div>
      </section>

      <section className="mt-20 border-t border-[var(--hairline)] pt-8">
        <p className="text-[13px] text-[var(--ink-secondary)]">
          The from-scratch Python/numpy version of this — with inertia curves across many random seeds — lives in{" "}
          <code className="font-mono text-[var(--ink-primary)]">notebooks/unsupervised/kmeans/kmeans.ipynb</code>.
        </p>
      </section>
    </div>
  );
}
