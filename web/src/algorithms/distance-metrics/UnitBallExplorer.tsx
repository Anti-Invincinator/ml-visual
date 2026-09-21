"use client";

import { useMemo, useState } from "react";
import { Formula } from "@/components/formula";
import { minkowskiUnitBall, type Vec2 } from "./engine";

const SIZE = 360;
const RANGE = 1.5;
const MARGIN = 24;
const SPAN = SIZE - 2 * MARGIN;

function toPx(v: Vec2) {
  return {
    x: MARGIN + ((v.x + RANGE) / (2 * RANGE)) * SPAN,
    y: SIZE - MARGIN - ((v.y + RANGE) / (2 * RANGE)) * SPAN,
  };
}

// Rounded to sidestep SSR/CSR float drift in Math.cos/sin (not guaranteed
// bit-identical across JS engines per spec), which otherwise hydration-mismatches.
function round(n: number) {
  return Math.round(n * 100) / 100;
}

function pathFor(points: Vec2[]) {
  return points
    .map((p, i) => {
      const px = toPx(p);
      return `${i === 0 ? "M" : "L"} ${round(px.x)} ${round(px.y)}`;
    })
    .join(" ");
}

const SLIDER_MAX = 20; // >= this snaps to Infinity (Chebyshev)

export default function UnitBallExplorer() {
  const [pRaw, setPRaw] = useState(2);
  const p = pRaw >= SLIDER_MAX ? Infinity : pRaw;

  const livePath = useMemo(() => pathFor(minkowskiUnitBall(p, 240)), [p]);
  const manhattanPath = useMemo(() => pathFor(minkowskiUnitBall(1, 240)), []);
  const chebyshevPath = useMemo(() => pathFor(minkowskiUnitBall(Infinity, 240)), []);

  const originPx = toPx({ x: 0, y: 0 });

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-[360px_1fr]">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width={SIZE} height={SIZE}>
        <line x1={MARGIN} y1={originPx.y} x2={SIZE - MARGIN} y2={originPx.y} stroke="var(--hairline)" strokeWidth={1} />
        <line x1={originPx.x} y1={MARGIN} x2={originPx.x} y2={SIZE - MARGIN} stroke="var(--hairline)" strokeWidth={1} />

        {/* reference curves, quiet */}
        <path d={manhattanPath} fill="none" stroke="var(--ink-muted)" strokeWidth={1} strokeDasharray="3 3" opacity={0.6} />
        <path d={chebyshevPath} fill="none" stroke="var(--ink-muted)" strokeWidth={1} strokeDasharray="3 3" opacity={0.6} />

        {/* live curve */}
        <path d={livePath} fill="none" stroke="var(--metric-minkowski)" strokeWidth={2.5} />
      </svg>

      <div className="flex flex-col justify-center gap-5">
        <p className="text-[13px] text-[var(--ink-secondary)]">
          Every point on this curve is distance <span className="font-mono text-[var(--ink-primary)]">1</span> from
          the origin. The dashed shapes are fixed references — the diamond is Manhattan (
          <span className="font-mono">p=1</span>), the square is Chebyshev (<span className="font-mono">p=∞</span>).
          The solid curve is live.
        </p>

        <Formula tex="d(x, y) = \left(\sum_i |x_i - y_i|^p\right)^{1/p}" block />

        <div>
          <div className="flex items-baseline justify-between">
            <label htmlFor="p-slider" className="font-mono text-[13px] text-[var(--ink-secondary)]">
              p
            </label>
            <span className="tabular font-mono text-[15px] text-[var(--metric-minkowski)]">
              {pRaw >= SLIDER_MAX ? "∞" : pRaw.toFixed(1)}
            </span>
          </div>
          <input
            id="p-slider"
            type="range"
            min={1}
            max={SLIDER_MAX}
            step={0.1}
            value={pRaw}
            onChange={(e) => setPRaw(Number(e.target.value))}
            className="mt-2 w-full accent-[var(--metric-minkowski)]"
          />
          <div className="mt-1 flex justify-between font-mono text-[11px] text-[var(--ink-muted)]">
            <span>1 (Manhattan)</span>
            <span>2 (Euclidean)</span>
            <span>∞ (Chebyshev)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
