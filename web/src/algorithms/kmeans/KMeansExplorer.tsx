"use client";

import { useEffect, useMemo, useState } from "react";
import {
  buildTrajectory,
  kmeansPlusPlusInit,
  makeBlobs,
  randomInit,
  type Point,
  type Snapshot,
} from "./engine";

const SIZE = 300;
const RANGE = 2;
const MARGIN = 20;
const SPAN = SIZE - 2 * MARGIN;
const MAX_ITERATIONS = 10;
const STEP_MS = 500;

const CLUSTER_COLORS = ["#3987e5", "#d95926", "#199e70"];

function toPx(p: Point) {
  return {
    x: MARGIN + ((p.x + RANGE) / (2 * RANGE)) * SPAN,
    y: SIZE - MARGIN - ((p.y + RANGE) / (2 * RANGE)) * SPAN,
  };
}

function Panel({
  title,
  points,
  trajectory,
  step,
}: {
  title: string;
  points: Point[];
  trajectory: Snapshot[];
  step: number;
}) {
  const snapshot = trajectory[Math.min(step, trajectory.length - 1)];
  const converged = trajectory.length - 1 <= step && step > 0;

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h3 className="font-mono text-[13px] text-[var(--ink-primary)]">{title}</h3>
        <span className="tabular font-mono text-[12px] text-[var(--ink-muted)]">
          inertia {snapshot.inertia.toFixed(2)}
        </span>
      </div>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width="100%" className="mt-2 max-w-[300px]">
        {points.map((p, i) => {
          const px = toPx(p);
          return (
            <circle
              key={i}
              cx={px.x}
              cy={px.y}
              r={4}
              fill={CLUSTER_COLORS[snapshot.assignments[i]]}
              stroke="var(--page)"
              strokeWidth={1}
              opacity={0.85}
            />
          );
        })}
        {snapshot.centroids.map((c, k) => {
          const px = toPx(c);
          return (
            <g key={k}>
              <circle cx={px.x} cy={px.y} r={9} fill={CLUSTER_COLORS[k]} stroke="#ffffff" strokeWidth={2.5} />
              <line x1={px.x - 4} y1={px.y} x2={px.x + 4} y2={px.y} stroke="#ffffff" strokeWidth={1.5} />
              <line x1={px.x} y1={px.y - 4} x2={px.x} y2={px.y + 4} stroke="#ffffff" strokeWidth={1.5} />
            </g>
          );
        })}
      </svg>
      <p className="mt-1 font-mono text-[11px] text-[var(--ink-muted)]">
        {converged ? `converged in ${trajectory.length - 1} iterations` : `iteration ${step}`}
      </p>
    </div>
  );
}

export default function KMeansExplorer() {
  const [seed, setSeed] = useState(0);
  const [step, setStep] = useState(0);

  const points = useMemo(() => makeBlobs(25, 5), []);
  const randomTrajectory = useMemo(
    () => buildTrajectory(points, randomInit(points, 3, seed), MAX_ITERATIONS),
    [points, seed]
  );
  const kppTrajectory = useMemo(
    () => buildTrajectory(points, kmeansPlusPlusInit(points, 3, seed), MAX_ITERATIONS),
    [points, seed]
  );
  const maxLen = Math.max(randomTrajectory.length, kppTrajectory.length);

  useEffect(() => {
    if (step >= maxLen - 1) return;
    const id = setTimeout(() => setStep((s) => s + 1), STEP_MS);
    return () => clearTimeout(id);
  }, [step, maxLen]);

  function reshuffle() {
    setSeed((s) => s + 1);
    setStep(0);
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-[13px] text-[var(--ink-secondary)]">
        Same three blobs, same k=3, same number of iterations. Only how the centroids start differs. Random init
        picks three data points at random and sometimes strands a centroid where it can&apos;t recover; k-means++
        spreads the initial picks out on purpose.
      </p>
      <div className="grid grid-cols-1 gap-10 sm:grid-cols-2">
        <Panel title="random init" points={points} trajectory={randomTrajectory} step={step} />
        <Panel title="k-means++ init" points={points} trajectory={kppTrajectory} step={step} />
      </div>
      <button
        onClick={reshuffle}
        className="w-fit border border-[var(--hairline)] px-4 py-2 font-mono text-[13px] text-[var(--ink-primary)] transition-colors hover:bg-[var(--surface)]"
      >
        new seed
      </button>
    </div>
  );
}
