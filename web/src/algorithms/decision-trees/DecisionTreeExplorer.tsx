"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Formula } from "@/components/formula";
import {
  accuracy,
  buildTree,
  makeCheckerboardDataset,
  predict,
  splitDataset,
  type LabeledPoint,
  type TreeNode,
} from "./engine";

const GRID = 110;
const MARGIN = 10;
const SPAN = GRID - 2 * MARGIN;
const RANGE = 2.2;
const DISPLAY_SIZE = 300;
const MAX_DEPTH = 8;

const CLASS_COLORS: [string, string] = ["#3987e5", "#d95926"];
const CLASS_RGB: [number, number, number][] = [
  [0x39, 0x87, 0xe5],
  [0xd9, 0x59, 0x26],
];
const PAGE_RGB: [number, number, number] = [0x05, 0x05, 0x05];

function toPx(x: number, y: number) {
  return {
    x: MARGIN + ((x + RANGE) / (2 * RANGE)) * SPAN,
    y: GRID - MARGIN - ((y + RANGE) / (2 * RANGE)) * SPAN,
  };
}
function fromPx(px: number, py: number) {
  return {
    x: ((px - MARGIN) / SPAN) * 2 * RANGE - RANGE,
    y: ((GRID - MARGIN - py) / SPAN) * 2 * RANGE - RANGE,
  };
}

function heatmapFor(tree: TreeNode): ImageData {
  const pixels = new Uint8ClampedArray(GRID * GRID * 4);
  for (let py = 0; py < GRID; py++) {
    for (let px = 0; px < GRID; px++) {
      const { x, y } = fromPx(px, py);
      const cls = predict(tree, { x, y });
      const [cr, cg, cb] = CLASS_RGB[cls];
      const idx = (py * GRID + px) * 4;
      pixels[idx] = PAGE_RGB[0] + (cr - PAGE_RGB[0]) * 0.32;
      pixels[idx + 1] = PAGE_RGB[1] + (cg - PAGE_RGB[1]) * 0.32;
      pixels[idx + 2] = PAGE_RGB[2] + (cb - PAGE_RGB[2]) * 0.32;
      pixels[idx + 3] = 255;
    }
  }
  return new ImageData(pixels, GRID, GRID);
}

interface LayoutEntry {
  node: TreeNode;
  x: number;
  y: number;
}
interface Edge {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

function layoutTree(root: TreeNode) {
  const positions: LayoutEntry[] = [];
  const edges: Edge[] = [];
  let leafCounter = 0;
  let maxDepthSeen = 0;

  function visit(node: TreeNode, depth: number): number {
    maxDepthSeen = Math.max(maxDepthSeen, depth);
    if (node.type === "leaf") {
      const x = leafCounter++;
      positions.push({ node, x, y: depth });
      return x;
    }
    const leftX = visit(node.left, depth + 1);
    const rightX = visit(node.right, depth + 1);
    const x = (leftX + rightX) / 2;
    positions.push({ node, x, y: depth });
    edges.push({ x1: x, y1: depth, x2: leftX, y2: depth + 1 });
    edges.push({ x1: x, y1: depth, x2: rightX, y2: depth + 1 });
    return x;
  }

  visit(root, 0);
  return { positions, edges, leafCount: leafCounter, maxDepth: maxDepthSeen };
}

function TreeDiagram({ root }: { root: TreeNode }) {
  const { positions, edges, leafCount, maxDepth } = useMemo(() => layoutTree(root), [root]);
  const colWidth = 58;
  const rowHeight = 42;
  const pad = 30;
  const width = Math.max(1, leafCount - 1) * colWidth + pad * 2;
  const height = maxDepth * rowHeight + pad * 2;
  const dense = leafCount > 14;

  function px(x: number) {
    return pad + x * colWidth;
  }
  function py(y: number) {
    return pad + y * rowHeight;
  }

  return (
    <div className="w-full overflow-x-auto">
      <svg width={width} height={height} className="block">
        {edges.map((e, i) => (
          <line
            key={i}
            x1={px(e.x1)}
            y1={py(e.y1)}
            x2={px(e.x2)}
            y2={py(e.y2)}
            stroke="var(--ink-muted)"
            strokeWidth={1.5}
          />
        ))}
        {positions.map((p, i) => {
          const cx = px(p.x);
          const cy = py(p.y);
          if (p.node.type === "leaf") {
            return <circle key={i} cx={cx} cy={cy} r={7} fill={CLASS_COLORS[p.node.prediction]} stroke="#ffffff" strokeWidth={1.5} />;
          }
          const label = `${p.node.featureIndex === 0 ? "x₁" : "x₂"}<${p.node.threshold.toFixed(1)}`;
          return (
            <g key={i}>
              <rect x={cx - 24} y={cy - 10} width={48} height={20} rx={4} fill="var(--surface)" stroke="var(--hairline)" />
              {!dense && (
                <text
                  x={cx}
                  y={cy + 4}
                  textAnchor="middle"
                  fontFamily="var(--font-mono)"
                  fontSize={10}
                  fill="var(--ink-primary)"
                >
                  {label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function DecisionTreeExplorer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [depth, setDepth] = useState(3);

  const all = useMemo(() => makeCheckerboardDataset(25, 3, 0.55), []);
  const { train, test } = useMemo(() => splitDataset(all), [all]);

  const tree = useMemo(() => buildTree(train, depth), [train, depth]);

  const accuracyCurve = useMemo(
    () =>
      Array.from({ length: MAX_DEPTH }, (_, i) => {
        const d = i + 1;
        const t = buildTree(train, d);
        return { depth: d, train: accuracy(t, train), test: accuracy(t, test) };
      }),
    [train, test]
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.putImageData(heatmapFor(tree), 0, 0);

    for (const p of [...train.map((p) => ({ ...p, isTrain: true })), ...test.map((p) => ({ ...p, isTrain: false }))] as (LabeledPoint & {
      isTrain: boolean;
    })[]) {
      const px = toPx(p.x, p.y);
      ctx.beginPath();
      ctx.arc(px.x, px.y, p.isTrain ? 3.2 : 4, 0, Math.PI * 2);
      if (p.isTrain) {
        ctx.fillStyle = CLASS_COLORS[p.label];
        ctx.fill();
      } else {
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = CLASS_COLORS[p.label];
        ctx.stroke();
      }
    }
  }, [tree, train, test]);

  const current = accuracyCurve[depth - 1];

  const chartWidth = 460;
  const chartHeight = 150;
  const chartMargin = { left: 40, right: 12, top: 10, bottom: 22 };
  function chartX(d: number) {
    return chartMargin.left + ((d - 1) / (MAX_DEPTH - 1)) * (chartWidth - chartMargin.left - chartMargin.right);
  }
  function chartY(v: number) {
    return chartHeight - chartMargin.bottom - v * (chartHeight - chartMargin.top - chartMargin.bottom);
  }
  const trainPoints = accuracyCurve.map((d) => `${chartX(d.depth)},${chartY(d.train)}`).join(" ");
  const testPoints = accuracyCurve.map((d) => `${chartX(d.depth)},${chartY(d.test)}`).join(" ");

  return (
    <div className="flex flex-col gap-10">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-[300px_1fr]">
        <div>
          <canvas
            ref={canvasRef}
            width={GRID}
            height={GRID}
            style={{ width: DISPLAY_SIZE, height: DISPLAY_SIZE }}
            className="block"
          />
          <p className="mt-2 font-mono text-[13px] text-[var(--ink-muted)]">
            filled = train · ring = test (held out, never split on)
          </p>
        </div>
        <div className="flex flex-col justify-center gap-5">
          <p className="text-[15px] text-[var(--ink-secondary)]">
            Four overlapping blobs in a checkerboard — the same shape that needed a hidden layer to solve with
            backprop. A tree solves it differently: greedy axis-aligned splits, each one picked to minimize Gini
            impurity in the two resulting groups.
          </p>
          <Formula tex="\text{Gini}(S) = 1 - \sum_c p_c^2" block />
          <div>
            <div className="flex items-baseline justify-between">
              <label htmlFor="dt-depth" className="font-mono text-[15px] text-[var(--ink-secondary)]">
                max depth
              </label>
              <span className="tabular font-mono text-[17px] text-[var(--ink-primary)]">{depth}</span>
            </div>
            <input
              id="dt-depth"
              type="range"
              min={1}
              max={MAX_DEPTH}
              step={1}
              value={depth}
              onChange={(e) => setDepth(Number(e.target.value))}
              className="mt-2 w-full accent-[var(--accent)]"
            />
          </div>
          <p className="tabular font-mono text-[14px] text-[var(--ink-muted)]">
            train accuracy {(current.train * 100).toFixed(1)}% · test accuracy {(current.test * 100).toFixed(1)}%
          </p>
        </div>
      </div>

      <div>
        <h3 className="text-[17px] font-medium text-[var(--ink-primary)]">The tree itself</h3>
        <p className="mt-1 max-w-xl text-[15px] text-[var(--ink-secondary)]">
          Every box is a question; every colored dot is a leaf&apos;s final answer.
        </p>
        <div className="mt-4">
          <TreeDiagram root={tree} />
        </div>
      </div>

      <div>
        <h3 className="text-[17px] font-medium text-[var(--ink-primary)]">Accuracy vs. depth</h3>
        <p className="mt-1 max-w-xl text-[15px] text-[var(--ink-secondary)]">
          Train accuracy climbs toward 100% no matter how deep you go — the tree can always carve out one more tiny
          region to fit one more noisy point. Test accuracy tells the real story.
        </p>
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} width="100%" className="mt-4 max-w-[460px]">
          <polyline points={trainPoints} fill="none" stroke="var(--accent-secondary)" strokeWidth={2} />
          <polyline points={testPoints} fill="none" stroke="var(--accent)" strokeWidth={2} />
          <line
            x1={chartX(depth)}
            y1={chartMargin.top}
            x2={chartX(depth)}
            y2={chartHeight - chartMargin.bottom}
            stroke="var(--hairline)"
            strokeDasharray="3 3"
          />
          <line
            x1={chartMargin.left}
            y1={chartHeight - chartMargin.bottom}
            x2={chartWidth - chartMargin.right}
            y2={chartHeight - chartMargin.bottom}
            stroke="var(--hairline)"
          />
          <line
            x1={chartMargin.left}
            y1={chartMargin.top}
            x2={chartMargin.left}
            y2={chartHeight - chartMargin.bottom}
            stroke="var(--hairline)"
          />
          <text x={4} y={chartMargin.top + 6} fontFamily="var(--font-mono)" fontSize={10} fill="var(--ink-muted)">
            acc
          </text>
        </svg>
        <div className="mt-2 flex gap-4 font-mono text-[13px] text-[var(--ink-muted)]">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: "var(--accent-secondary)" }} /> train
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: "var(--accent)" }} /> test
          </span>
        </div>
      </div>
    </div>
  );
}
