import Link from "next/link";
import type { Metadata } from "next";
import PointComparison from "@/algorithms/distance-metrics/PointComparison";
import UnitBallExplorer from "@/algorithms/distance-metrics/UnitBallExplorer";

export const metadata: Metadata = {
  title: "Distance metrics — ml/visual",
  description:
    "Euclidean, Manhattan, Chebyshev, Minkowski, and cosine distance, implemented from scratch and compared live.",
};

export default function DistanceMetricsPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <Link href="/" className="font-mono text-xs text-[var(--ink-muted)] hover:text-[var(--ink-secondary)]">
        ← all algorithms
      </Link>

      <h1 className="mt-6 text-3xl font-medium tracking-tight text-[var(--ink-primary)]">
        Distance metrics
      </h1>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-[var(--ink-secondary)]">
        Every one of these functions decides what &ldquo;close&rdquo; means. Change the metric and you change which
        neighbors a KNN classifier picks, which cluster a point joins, which document a search ranks first — with the
        same data. Both panels below run entirely in the browser, computed from scratch in TypeScript on every
        render.
      </p>

      <section className="mt-16">
        <h2 className="text-lg font-medium text-[var(--ink-primary)]">Unit balls</h2>
        <p className="mt-1 text-[13px] text-[var(--ink-secondary)]">
          The shape traced by every point exactly distance 1 from the origin — the clearest way to see how a metric
          treats direction.
        </p>
        <div className="mt-8">
          <UnitBallExplorer />
        </div>
      </section>

      <section className="mt-20 border-t border-[var(--hairline)] pt-16">
        <h2 className="text-lg font-medium text-[var(--ink-primary)]">Two points, four metrics</h2>
        <p className="mt-1 text-[13px] text-[var(--ink-secondary)]">
          Drag either point and watch every metric disagree on how far apart they are.
        </p>
        <div className="mt-8">
          <PointComparison />
        </div>
      </section>

      <section className="mt-20 border-t border-[var(--hairline)] pt-8">
        <p className="text-[13px] text-[var(--ink-secondary)]">
          The from-scratch Python/numpy version of this — with the KNN decision-boundary comparison — lives in{" "}
          <code className="font-mono text-[var(--ink-primary)]">notebooks/distance-metrics/distance_metrics.ipynb</code>.
        </p>
      </section>
    </div>
  );
}
