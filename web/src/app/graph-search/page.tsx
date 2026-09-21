import Link from "next/link";
import type { Metadata } from "next";
import GraphSearchExplorer from "@/algorithms/graph-search/GraphSearchExplorer";

export const metadata: Metadata = {
  title: "Graph search — ml/visual",
  description:
    "BFS, DFS, Greedy Best-First, A*, and Dijkstra on a real street network, implemented from scratch.",
};

export default function GraphSearchPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <Link href="/" className="font-mono text-sm text-[var(--ink-muted)] hover:text-[var(--ink-secondary)]">
        ← all algorithms
      </Link>

      <h1 className="mt-6 text-4xl font-medium tracking-tight text-[var(--ink-primary)]">
        Graph search
      </h1>
      <p className="mt-3 max-w-2xl text-[17px] leading-relaxed text-[var(--ink-secondary)]">
        Five algorithms, one shared skeleton: keep a frontier of intersections to explore, expand whichever one is
        highest-priority, repeat until the goal is found. BFS (queue) and DFS (stack) don&apos;t know about cost at
        all — they only count intersections crossed. Greedy, A*, and Dijkstra all use a priority instead, and differ
        only in what that priority is made of: Greedy uses just the straight-line distance to the goal, Dijkstra
        uses just the travel time accumulated so far, and A* uses both — which is exactly what makes it both
        optimal <em>and</em> efficient.
      </p>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-[var(--ink-muted)]">
        The map below is not a procedural maze — it&apos;s the real street network of Manhattan&apos;s West
        Village, pulled from OpenStreetMap. Every intersection and street segment is a real place; each
        street&apos;s traversal cost is modeled as travel time from its actual length and road type. This is the
        literal core of GPS turn-by-turn directions: A* is what most real routing engines actually run, for the
        exact reason demonstrated here.
      </p>

      <section className="mt-16">
        <h2 className="text-xl font-medium text-[var(--ink-primary)]">One street network, five algorithms</h2>
        <p className="mt-1 text-[15px] text-[var(--ink-secondary)]">
          Place your own start and goal, then switch algorithms on the same map. Watch what happens to travel time
          when an algorithm that doesn&apos;t know about road speed (BFS, DFS, Greedy) meets a real city grid that
          has some streets built for speed and others not.
        </p>
        <div className="mt-8">
          <GraphSearchExplorer />
        </div>
      </section>

      <section className="mt-20 border-t border-[var(--hairline)] pt-8">
        <p className="text-[15px] text-[var(--ink-secondary)]">
          The from-scratch Python version of this — same street graph, same five algorithms — lives in{" "}
          <code className="font-mono text-[var(--ink-primary)]">
            notebooks/search-optimization/graph-search/graph_search.ipynb
          </code>
          .
        </p>
      </section>
    </div>
  );
}
