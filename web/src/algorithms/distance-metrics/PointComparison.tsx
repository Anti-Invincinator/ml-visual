"use client";

import { useCallback, useRef, useState } from "react";
import { Formula } from "@/components/formula";
import {
  chebyshevDistance,
  cosineDistance,
  euclideanDistance,
  manhattanDistance,
  type Vec2,
} from "./engine";

const SIZE = 440;
const RANGE = 6;
const MARGIN = 32;
const SPAN = SIZE - 2 * MARGIN;

function toPx(v: Vec2) {
  return {
    x: MARGIN + ((v.x + RANGE) / (2 * RANGE)) * SPAN,
    y: SIZE - MARGIN - ((v.y + RANGE) / (2 * RANGE)) * SPAN,
  };
}

function fromPx(px: number, py: number): Vec2 {
  const x = ((px - MARGIN) / SPAN) * 2 * RANGE - RANGE;
  const y = ((SIZE - MARGIN - py) / SPAN) * 2 * RANGE - RANGE;
  return {
    x: Math.max(-RANGE, Math.min(RANGE, x)),
    y: Math.max(-RANGE, Math.min(RANGE, y)),
  };
}

const GRID_LINES = Array.from({ length: 2 * RANGE + 1 }, (_, i) => i - RANGE);

function chebyshevSquare(a: Vec2, b: Vec2): Vec2[] {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const m = Math.max(Math.abs(dx), Math.abs(dy));
  const sx = dx === 0 ? 1 : Math.sign(dx);
  const sy = dy === 0 ? 1 : Math.sign(dy);
  return [
    a,
    { x: a.x + sx * m, y: a.y },
    { x: a.x + sx * m, y: a.y + sy * m },
    { x: a.x, y: a.y + sy * m },
  ];
}

type DragTarget = "a" | "b" | null;

export default function PointComparison() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [a, setA] = useState<Vec2>({ x: -3, y: -1.5 });
  const [b, setB] = useState<Vec2>({ x: 2.5, y: 2.5 });
  const dragging = useRef<DragTarget>(null);

  const updateFromEvent = useCallback(
    (evt: React.PointerEvent) => {
      const svg = svgRef.current;
      if (!svg || !dragging.current) return;
      const rect = svg.getBoundingClientRect();
      const px = ((evt.clientX - rect.left) / rect.width) * SIZE;
      const py = ((evt.clientY - rect.top) / rect.height) * SIZE;
      const data = fromPx(px, py);
      if (dragging.current === "a") setA(data);
      else setB(data);
    },
    []
  );

  const startDrag = useCallback((evt: React.PointerEvent<SVGGElement>) => {
    const target = evt.currentTarget.dataset.point as DragTarget;
    dragging.current = target;
    evt.currentTarget.setPointerCapture(evt.pointerId);
  }, []);

  const endDrag = useCallback(() => {
    dragging.current = null;
  }, []);

  const originPx = toPx({ x: 0, y: 0 });
  const aPx = toPx(a);
  const bPx = toPx(b);
  const squarePx = chebyshevSquare(a, b).map(toPx);
  const squarePath = `M ${squarePx.map((p) => `${p.x},${p.y}`).join(" L ")} Z`;

  const angleA = Math.atan2(-(aPx.y - originPx.y), aPx.x - originPx.x);
  const angleB = Math.atan2(-(bPx.y - originPx.y), bPx.x - originPx.x);

  const readouts = [
    {
      label: "Euclidean",
      value: euclideanDistance(a, b),
      color: "var(--metric-euclidean)",
      tex: "\\sqrt{\\Delta x^2 + \\Delta y^2}",
    },
    {
      label: "Manhattan",
      value: manhattanDistance(a, b),
      color: "var(--metric-manhattan)",
      tex: "|\\Delta x| + |\\Delta y|",
    },
    {
      label: "Chebyshev",
      value: chebyshevDistance(a, b),
      color: "var(--metric-chebyshev)",
      tex: "\\max(|\\Delta x|, |\\Delta y|)",
    },
    {
      label: "Cosine distance",
      value: cosineDistance(a, b),
      color: "var(--metric-cosine)",
      tex: "1 - \\cos\\theta",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-[440px_1fr]">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        width={SIZE}
        height={SIZE}
        className="touch-none select-none"
        onPointerMove={updateFromEvent}
        onPointerUp={endDrag}
      >
        {/* grid */}
        {GRID_LINES.map((g) => {
          const p = toPx({ x: g, y: g });
          return (
            <g key={g}>
              <line x1={p.x} y1={MARGIN} x2={p.x} y2={SIZE - MARGIN} stroke="var(--hairline)" strokeWidth={1} />
              <line x1={MARGIN} y1={p.y} x2={SIZE - MARGIN} y2={p.y} stroke="var(--hairline)" strokeWidth={1} />
            </g>
          );
        })}
        {/* axes */}
        <line x1={MARGIN} y1={originPx.y} x2={SIZE - MARGIN} y2={originPx.y} stroke="var(--border-strong)" strokeWidth={1} />
        <line x1={originPx.x} y1={MARGIN} x2={originPx.x} y2={SIZE - MARGIN} stroke="var(--border-strong)" strokeWidth={1} />

        {/* cosine rays + arc */}
        <line x1={originPx.x} y1={originPx.y} x2={aPx.x} y2={aPx.y} stroke="var(--metric-cosine)" strokeWidth={1.5} strokeDasharray="4 4" opacity={0.85} />
        <line x1={originPx.x} y1={originPx.y} x2={bPx.x} y2={bPx.y} stroke="var(--metric-cosine)" strokeWidth={1.5} strokeDasharray="4 4" opacity={0.85} />
        <path
          d={describeArc(originPx.x, originPx.y, 26, angleA, angleB)}
          fill="none"
          stroke="var(--metric-cosine)"
          strokeWidth={2}
        />

        {/* chebyshev square */}
        <path d={squarePath} fill="none" stroke="var(--metric-chebyshev)" strokeWidth={1.5} strokeDasharray="3 3" opacity={0.9} />

        {/* manhattan staircase */}
        <polyline
          points={`${aPx.x},${aPx.y} ${bPx.x},${aPx.y} ${bPx.x},${bPx.y}`}
          fill="none"
          stroke="var(--metric-manhattan)"
          strokeWidth={2.5}
          strokeLinejoin="round"
        />

        {/* euclidean line */}
        <line x1={aPx.x} y1={aPx.y} x2={bPx.x} y2={bPx.y} stroke="var(--metric-euclidean)" strokeWidth={2.5} />

        {/* origin marker */}
        <circle cx={originPx.x} cy={originPx.y} r={3} fill="var(--ink-muted)" />

        {/* draggable handles */}
        <g data-point="a" onPointerDown={startDrag} className="cursor-grab active:cursor-grabbing">
          <circle cx={aPx.x} cy={aPx.y} r={16} fill="transparent" />
          <circle cx={aPx.x} cy={aPx.y} r={7} fill="var(--page)" stroke="var(--ink-primary)" strokeWidth={2} />
          <text x={aPx.x} y={aPx.y - 14} textAnchor="middle" fill="var(--ink-primary)" fontFamily="var(--font-mono)" fontSize={12}>
            A
          </text>
        </g>
        <g data-point="b" onPointerDown={startDrag} className="cursor-grab active:cursor-grabbing">
          <circle cx={bPx.x} cy={bPx.y} r={16} fill="transparent" />
          <circle cx={bPx.x} cy={bPx.y} r={7} fill="var(--page)" stroke="var(--ink-primary)" strokeWidth={2} />
          <text x={bPx.x} y={bPx.y - 14} textAnchor="middle" fill="var(--ink-primary)" fontFamily="var(--font-mono)" fontSize={12}>
            B
          </text>
        </g>
      </svg>

      <div className="flex flex-col justify-center gap-4">
        <p className="text-[13px] text-[var(--ink-secondary)]">
          Drag points <span className="font-mono text-[var(--ink-primary)]">A</span> and{" "}
          <span className="font-mono text-[var(--ink-primary)]">B</span>. Every metric below is computed live, from
          scratch, on every frame.
        </p>
        <dl className="border border-[var(--hairline)]">
          {readouts.map((r, i) => (
            <div
              key={r.label}
              className={`flex items-center justify-between px-4 py-3 ${
                i !== readouts.length - 1 ? "border-b border-[var(--hairline)]" : ""
              }`}
            >
              <dt className="flex items-center gap-2 text-[13px] text-[var(--ink-secondary)]">
                <span className="h-2 w-2 rounded-full" style={{ background: r.color }} />
                {r.label}
                <span className="text-[var(--ink-muted)]">
                  <Formula tex={r.tex} />
                </span>
              </dt>
              <dd className="tabular font-mono text-[15px] text-[var(--ink-primary)]">
                {r.value.toFixed(2)}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

// Rounded to sidestep SSR/CSR float drift in Math.cos/sin/atan2 (not guaranteed
// bit-identical across JS engines per spec), which otherwise hydration-mismatches.
function round(n: number) {
  return Math.round(n * 100) / 100;
}

function describeArc(cx: number, cy: number, r: number, a0: number, a1: number): string {
  const p0 = { x: round(cx + r * Math.cos(a0)), y: round(cy - r * Math.sin(a0)) };
  const p1 = { x: round(cx + r * Math.cos(a1)), y: round(cy - r * Math.sin(a1)) };
  let delta = a1 - a0;
  while (delta <= -Math.PI) delta += 2 * Math.PI;
  while (delta > Math.PI) delta -= 2 * Math.PI;
  const sweep = delta > 0 ? 0 : 1;
  const largeArc = Math.abs(delta) > Math.PI ? 1 : 0;
  return `M ${p0.x} ${p0.y} A ${r} ${r} 0 ${largeArc} ${sweep} ${p1.x} ${p1.y}`;
}
