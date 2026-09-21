"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { Formula } from "@/components/formula";
import {
  covariance,
  euclideanDistance,
  mahalanobisDistance,
  mahalanobisEllipse,
  makeCorrelatedCloud,
  mean,
  type Vec2,
} from "./engine";

const SIZE = 420;
const RANGE = 5;
const MARGIN = 24;
const SPAN = SIZE - 2 * MARGIN;
const RADIUS = 2;

function toPx(v: Vec2) {
  return {
    x: MARGIN + ((v.x + RANGE) / (2 * RANGE)) * SPAN,
    y: SIZE - MARGIN - ((v.y + RANGE) / (2 * RANGE)) * SPAN,
  };
}
function fromPx(px: number, py: number): Vec2 {
  return {
    x: ((px - MARGIN) / SPAN) * 2 * RANGE - RANGE,
    y: ((SIZE - MARGIN - py) / SPAN) * 2 * RANGE - RANGE,
  };
}

function pathFor(points: Vec2[]) {
  return points.map((p, i) => `${i === 0 ? "M" : "L"} ${toPx(p).x.toFixed(2)} ${toPx(p).y.toFixed(2)}`).join(" ");
}

function circlePoints(center: Vec2, r: number, samples = 100): Vec2[] {
  const points: Vec2[] = [];
  for (let i = 0; i <= samples; i++) {
    const theta = (2 * Math.PI * i) / samples;
    points.push({ x: center.x + r * Math.cos(theta), y: center.y + r * Math.sin(theta) });
  }
  return points;
}

export default function MahalanobisExplorer() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [query, setQuery] = useState<Vec2>({ x: 3, y: -0.5 });
  const dragging = useRef(false);

  const points = useMemo(() => makeCorrelatedCloud(70, 3), []);
  const m = useMemo(() => mean(points), [points]);
  const cov = useMemo(() => covariance(points, m), [points, m]);

  const circlePath = useMemo(() => pathFor(circlePoints(m, RADIUS)), [m]);
  const ellipsePath = useMemo(() => pathFor(mahalanobisEllipse(m, cov, RADIUS)), [m, cov]);

  const updateFromEvent = useCallback(
    (evt: React.PointerEvent) => {
      const svg = svgRef.current;
      if (!svg || !dragging.current) return;
      const rect = svg.getBoundingClientRect();
      const px = ((evt.clientX - rect.left) / rect.width) * SIZE;
      const py = ((evt.clientY - rect.top) / rect.height) * SIZE;
      setQuery(fromPx(px, py));
    },
    []
  );

  const startDrag = useCallback((evt: React.PointerEvent<SVGGElement>) => {
    dragging.current = true;
    evt.currentTarget.setPointerCapture(evt.pointerId);
  }, []);
  const endDrag = useCallback(() => {
    dragging.current = false;
  }, []);

  const mPx = toPx(m);
  const qPx = toPx(query);
  const euclidean = euclideanDistance(query, m);
  const mahalanobis = mahalanobisDistance(query, m, cov);

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-[420px_1fr]">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        width={SIZE}
        height={SIZE}
        className="touch-none select-none"
        onPointerMove={updateFromEvent}
        onPointerUp={endDrag}
      >
        <path d={circlePath} fill="none" stroke="var(--ink-muted)" strokeWidth={1.5} strokeDasharray="4 4" opacity={0.7} />
        <path d={ellipsePath} fill="none" stroke="var(--accent-secondary)" strokeWidth={2} />

        {points.map((p, i) => {
          const px = toPx(p);
          return <circle key={i} cx={px.x} cy={px.y} r={2.5} fill="var(--ink-secondary)" opacity={0.6} />;
        })}

        <line x1={mPx.x} y1={mPx.y} x2={qPx.x} y2={qPx.y} stroke="var(--ink-muted)" strokeWidth={1} strokeDasharray="2 3" />

        <circle cx={mPx.x} cy={mPx.y} r={4} fill="var(--ink-primary)" />
        <text x={mPx.x} y={mPx.y - 10} textAnchor="middle" fill="var(--ink-muted)" fontFamily="var(--font-mono)" fontSize={11}>
          mean
        </text>

        <g onPointerDown={startDrag} className="cursor-grab active:cursor-grabbing">
          <circle cx={qPx.x} cy={qPx.y} r={16} fill="transparent" />
          <circle cx={qPx.x} cy={qPx.y} r={7} fill="var(--page)" stroke="var(--accent)" strokeWidth={2} />
        </g>
      </svg>

      <div className="flex flex-col justify-center gap-4">
        <p className="text-[13px] text-[var(--ink-secondary)]">
          The gray dots are correlated data — y roughly tracks 0.8x. The dashed circle is &ldquo;distance {RADIUS}&rdquo;
          under Euclidean distance; the solid ellipse is &ldquo;distance {RADIUS}&rdquo; under Mahalanobis distance.
          Drag the point and watch which one actually tracks the shape of the data.
        </p>
        <div>
          <p className="mb-1 font-mono text-[12px] text-[var(--ink-secondary)]">Mahalanobis distance</p>
          <Formula tex="d_M(x) = \sqrt{(x-\mu)^{\mathsf T} \Sigma^{-1} (x-\mu)}" />
        </div>
        <dl className="border border-[var(--hairline)]">
          <div className="flex items-center justify-between border-b border-[var(--hairline)] px-4 py-3">
            <dt className="flex items-center gap-2 text-[13px] text-[var(--ink-secondary)]">
              <span className="h-2 w-2 rounded-full border border-[var(--ink-muted)]" /> Euclidean
            </dt>
            <dd className="tabular font-mono text-[15px] text-[var(--ink-primary)]">{euclidean.toFixed(2)}</dd>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <dt className="flex items-center gap-2 text-[13px] text-[var(--ink-secondary)]">
              <span className="h-2 w-2 rounded-full" style={{ background: "var(--accent-secondary)" }} /> Mahalanobis
            </dt>
            <dd className="tabular font-mono text-[15px] text-[var(--ink-primary)]">{mahalanobis.toFixed(2)}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
