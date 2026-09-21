import Link from "next/link";
import type { Metadata } from "next";
import GraphSearchExplorer from "@/algorithms/graph-search/GraphSearchExplorer";

export const metadata: Metadata = {
  title: "BFS vs. DFS — ml/visual",
  description:
    "Breadth-first search vs. depth-first search racing through the same maze, implemented from scratch.",
};

export default function GraphSearchPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <Link href="/" className="font-mono text-xs text-[var(--ink-muted)] hover:text-[var(--ink-secondary)]">
        ← all algorithms
      </Link>

      <h1 className="mt-6 text-3xl font-medium tracking-tight text-[var(--ink-primary)]">
        BFS vs. DFS
      </h1>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-[var(--ink-secondary)]">
        Breadth-first and depth-first search are the same algorithm with one line changed — swap a queue for a
        stack and the entire character of the search flips. BFS explores everything one step away before anything
        two steps away, which is exactly what guarantees it finds the shortest path. DFS commits to one corridor
        and rides it as far as it goes before backtracking — often faster to write, never guaranteed to find the
        short way.
      </p>
      <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-[var(--ink-muted)]">
        In practice: this is the literal core of GPS turn-by-turn directions (with edge weights and a heuristic,
        it grows into A* — next on this site&apos;s list) — and it&apos;s exactly how you&apos;d solve a corn maze
        by hand: DFS is &ldquo;always turn left,&rdquo; BFS is &ldquo;send someone down every path at once.&rdquo;
      </p>

      <section className="mt-16">
        <h2 className="text-lg font-medium text-[var(--ink-primary)]">Same maze, different frontier</h2>
        <p className="mt-1 text-[13px] text-[var(--ink-secondary)]">
          The maze has a few extra loops cut into it on purpose — in a loop-free maze there&apos;s only one possible
          route between any two cells, so BFS and DFS would always find the identical path and the comparison
          would be meaningless.
        </p>
        <div className="mt-8">
          <GraphSearchExplorer />
        </div>
      </section>

      <section className="mt-20 border-t border-[var(--hairline)] pt-8">
        <p className="text-[13px] text-[var(--ink-secondary)]">
          The from-scratch Python version of this — same maze generator, same comparison — lives in{" "}
          <code className="font-mono text-[var(--ink-primary)]">
            notebooks/search-optimization/graph-search/graph_search.ipynb
          </code>
          .
        </p>
      </section>
    </div>
  );
}
