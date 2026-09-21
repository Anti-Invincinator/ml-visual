"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Formula } from "@/components/formula";
import {
  forward,
  initNetwork,
  meanSquaredError,
  trainStep,
  PROBLEMS,
  type NetworkParams,
  type Problem,
} from "./engine";

const SIZE = 320;
const MARGIN = 24;
const SPAN = SIZE - 2 * MARGIN;
const SNAPSHOTS = 60;
const STEP_MS = 70;

function toPx(x: number, y: number) {
  return { x: MARGIN + x * SPAN, y: SIZE - MARGIN - y * SPAN };
}

// Sequential blue ramp: low predicted probability reads light, high reads dark.
const LOW = { r: 0xcd, g: 0xe2, b: 0xfb };
const HIGH = { r: 0x0d, g: 0x36, b: 0x6b };

function heatmapFor(params: NetworkParams): ImageData {
  const data = new Uint8ClampedArray(SIZE * SIZE * 4);
  for (let py = 0; py < SIZE; py++) {
    const y = 1 - (py - MARGIN) / SPAN;
    for (let px = 0; px < SIZE; px++) {
      const x = (px - MARGIN) / SPAN;
      const idx = (py * SIZE + px) * 4;
      if (x < 0 || x > 1 || y < 0 || y > 1) {
        data[idx] = 5;
        data[idx + 1] = 5;
        data[idx + 2] = 5;
        data[idx + 3] = 255;
        continue;
      }
      const { output } = forward(params, [x, y]);
      data[idx] = LOW.r + (HIGH.r - LOW.r) * output;
      data[idx + 1] = LOW.g + (HIGH.g - LOW.g) * output;
      data[idx + 2] = LOW.b + (HIGH.b - LOW.b) * output;
      data[idx + 3] = 255;
    }
  }
  return new ImageData(data, SIZE, SIZE);
}

function buildTrajectory(problem: Problem, lr: number) {
  const epochsPerSnapshot = problem.epochs / SNAPSHOTS;
  let params = initNetwork(42, problem.hiddenSize);
  const snapshots: NetworkParams[] = [params];
  const losses: number[] = [meanSquaredError(params, problem.data)];
  for (let epoch = 0; epoch < problem.epochs; epoch++) {
    params = trainStep(params, lr, problem.data);
    if ((epoch + 1) % epochsPerSnapshot === 0) {
      snapshots.push(params);
      losses.push(meanSquaredError(params, problem.data));
    }
  }
  return { snapshots, losses };
}

function activationFill(a: number): string {
  const t = Math.max(0, Math.min(1, a));
  const r = Math.round(LOW.r + (HIGH.r - LOW.r) * t);
  const g = Math.round(LOW.g + (HIGH.g - LOW.g) * t);
  const b = Math.round(LOW.b + (HIGH.b - LOW.b) * t);
  return `rgb(${r},${g},${b})`;
}

// Node/edge layout for the diagram scales with hidden-layer size: XOR's 3
// units get generous 12px circles, circles' 8 units get a taller canvas and
// smaller nodes so they don't overlap.
function computeLayout(hiddenSize: number) {
  const nodeRadius = hiddenSize > 4 ? 7 : 12;
  const height = Math.max(140, hiddenSize * (nodeRadius * 2 + 8));
  const inputPos: [number, number][] = [
    [30, height / 2 - 30],
    [30, height / 2 + 30],
  ];
  const hiddenMargin = nodeRadius + 6;
  const hiddenPos: [number, number][] = Array.from({ length: hiddenSize }, (_, i) => [
    150,
    hiddenSize === 1
      ? height / 2
      : hiddenMargin + (i * (height - 2 * hiddenMargin)) / (hiddenSize - 1),
  ]);
  const outputPos: [number, number] = [270, height / 2];
  return { height, nodeRadius, inputPos, hiddenPos, outputPos };
}

function NetworkDiagram({ params, input }: { params: NetworkParams; input: [number, number] }) {
  const { hidden, output } = forward(params, input);
  const layout = useMemo(() => computeLayout(params.w1.length), [params.w1.length]);
  const { height, nodeRadius, inputPos, hiddenPos, outputPos } = layout;

  return (
    <svg viewBox={`0 0 300 ${height}`} width="100%" className="max-w-[340px]">
      {params.w1.map((w, hi) =>
        w.map((weight, ii) => (
          <line
            key={`h${hi}-i${ii}`}
            x1={inputPos[ii][0]}
            y1={inputPos[ii][1]}
            x2={hiddenPos[hi][0]}
            y2={hiddenPos[hi][1]}
            stroke="var(--ink-muted)"
            strokeWidth={Math.min(4, Math.abs(weight) * 1.6)}
            opacity={0.55}
          />
        ))
      )}
      {params.w2.map((weight, hi) => (
        <line
          key={`o-h${hi}`}
          x1={hiddenPos[hi][0]}
          y1={hiddenPos[hi][1]}
          x2={outputPos[0]}
          y2={outputPos[1]}
          stroke="var(--ink-muted)"
          strokeWidth={Math.min(4, Math.abs(weight) * 1.6)}
          opacity={0.55}
        />
      ))}

      {inputPos.map(([x, y], i) => (
        <g key={`in${i}`}>
          <circle cx={x} cy={y} r={12} fill={activationFill(input[i])} stroke="var(--border-strong)" />
          <text x={x} y={y + 4} textAnchor="middle" fontFamily="var(--font-mono)" fontSize={9} fill="var(--page)">
            {input[i].toFixed(1)}
          </text>
        </g>
      ))}
      {hiddenPos.map(([x, y], i) => (
        <circle key={`hid${i}`} cx={x} cy={y} r={nodeRadius} fill={activationFill(hidden[i])} stroke="var(--border-strong)" />
      ))}
      <g>
        <circle cx={outputPos[0]} cy={outputPos[1]} r={14} fill={activationFill(output)} stroke="var(--ink-primary)" strokeWidth={1.5} />
        <text
          x={outputPos[0]}
          y={outputPos[1] - 22}
          textAnchor="middle"
          fontFamily="var(--font-mono)"
          fontSize={11}
          fill="var(--ink-primary)"
        >
          {output.toFixed(2)}
        </text>
      </g>
    </svg>
  );
}

interface Trajectory {
  snapshots: NetworkParams[];
  losses: number[];
}

export default function BackpropExplorer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [problemKey, setProblemKey] = useState(PROBLEMS[0].key);
  const problem = PROBLEMS.find((p) => p.key === problemKey)!;

  const [lr, setLr] = useState(problem.defaultLr);
  const [trajectory, setTrajectory] = useState<Trajectory | null>(null);
  const [step, setStep] = useState(0);
  const [x1, setX1] = useState(0.3);
  const [x2, setX2] = useState(0.7);

  function selectProblem(key: string) {
    const next = PROBLEMS.find((p) => p.key === key)!;
    setProblemKey(key);
    setLr(next.defaultLr);
    setTrajectory(null);
    setStep(0);
  }

  // Fixed, cheap to compute — the network as it looks before anyone hits "train".
  const untrainedParams = useMemo(() => initNetwork(42, problem.hiddenSize), [problem.hiddenSize]);
  const currentParams = trajectory
    ? trajectory.snapshots[Math.min(step, trajectory.snapshots.length - 1)]
    : untrainedParams;

  // ImageData is a browser API — built client-side only, after mount, never during SSR,
  // and kept in a ref (not state) since it's only ever read imperatively by redraw().
  const imagesRef = useRef<ImageData[] | null>(null);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const images = imagesRef.current;
    if (!canvas || !ctx || !images) return;
    ctx.putImageData(images[Math.min(step, images.length - 1)], 0, 0);

    for (const { input, label } of problem.data) {
      const p = toPx(input[0], input[1]);
      ctx.beginPath();
      ctx.arc(p.x, p.y, problem.pointRadius, 0, Math.PI * 2);
      ctx.fillStyle = label === 1 ? "#9085e9" : "#ffffff";
      ctx.fill();
      ctx.lineWidth = problem.pointRadius > 4 ? 2 : 1;
      ctx.strokeStyle = label === 1 ? "#ffffff" : "#0d0d0f";
      ctx.stroke();
    }
  }, [step, problem]);

  // The heavy part (training + rendering dozens of heatmap frames) only ever runs
  // once "train" is clicked — never eagerly on mount or on every lr change.
  useEffect(() => {
    imagesRef.current = trajectory
      ? trajectory.snapshots.map(heatmapFor)
      : [heatmapFor(untrainedParams)];
    redraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trajectory, untrainedParams]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  useEffect(() => {
    if (!trajectory) return;
    if (step >= trajectory.snapshots.length - 1) return;
    const id = setTimeout(() => setStep((s) => s + 1), STEP_MS);
    return () => clearTimeout(id);
  }, [step, trajectory]);

  function handleTrainClick() {
    if (!trajectory) {
      setTrajectory(buildTrajectory(problem, lr));
    }
    setStep(0);
  }

  function handleLrChange(value: number) {
    setLr(value);
    setTrajectory(null);
    setStep(0);
  }

  const buttonLabel = !trajectory ? "train network" : step < trajectory.snapshots.length - 1 ? "training…" : "replay";

  const chartWidth = 460;
  const chartHeight = 140;
  const chartMargin = { left: 44, right: 12, top: 10, bottom: 22 };
  const losses = trajectory?.losses ?? [];
  function chartX(i: number) {
    return chartMargin.left + (i / (losses.length - 1)) * (chartWidth - chartMargin.left - chartMargin.right);
  }
  function chartY(v: number) {
    const t = v / (losses[0] || 1);
    return chartMargin.top + t * (chartHeight - chartMargin.top - chartMargin.bottom);
  }
  const lossPoints = losses
    .slice(0, step + 1)
    .map((v, i) => `${chartX(i)},${chartY(v)}`)
    .join(" ");

  return (
    <div className="flex flex-col gap-12">
      <div className="flex flex-wrap gap-2">
        {PROBLEMS.map((p) => (
          <button
            key={p.key}
            onClick={() => selectProblem(p.key)}
            className={`border px-3 py-1.5 font-mono text-[14px] transition-colors ${
              problemKey === p.key
                ? "border-[var(--accent)] text-[var(--accent)]"
                : "border-[var(--hairline)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-[320px_1fr]">
        <canvas ref={canvasRef} width={SIZE} height={SIZE} />
        <div className="flex flex-col justify-center gap-5">
          <p className="text-[15px] text-[var(--ink-secondary)]">
            {problem.blurb} Hit train to watch the boundary form over{" "}
            <span className="font-mono text-[var(--ink-primary)]">{problem.epochs}</span> epochs of full-batch
            gradient descent, weights updated by hand-derived backprop.
          </p>
          <Formula tex="h = \sigma(XW_1 + b_1), \quad \hat{y} = \sigma(hW_2 + b_2)" block />
          <div>
            <div className="flex items-baseline justify-between">
              <label htmlFor="bp-lr" className="font-mono text-[15px] text-[var(--ink-secondary)]">
                learning rate
              </label>
              <span className="tabular font-mono text-[17px] text-[var(--ink-primary)]">{lr.toFixed(1)}</span>
            </div>
            <input
              id="bp-lr"
              type="range"
              min={problem.lrRange.min}
              max={problem.lrRange.max}
              step={problem.lrRange.step}
              value={lr}
              onChange={(e) => handleLrChange(Number(e.target.value))}
              className="mt-2 w-full accent-[var(--accent)]"
            />
          </div>
          <button
            onClick={handleTrainClick}
            className="w-fit border border-[var(--hairline)] px-4 py-2 font-mono text-[15px] text-[var(--ink-primary)] transition-colors hover:bg-[var(--surface)]"
          >
            {buttonLabel}
          </button>
          {trajectory ? (
            <>
              <p className="tabular font-mono text-[14px] text-[var(--ink-muted)]">
                epoch {Math.min(step, trajectory.snapshots.length - 1) * (problem.epochs / SNAPSHOTS)} /{" "}
                {problem.epochs} · loss {losses[Math.min(step, losses.length - 1)].toFixed(4)}
              </p>
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} width="100%" className="max-w-[460px]">
                <polyline points={lossPoints} fill="none" stroke="var(--accent)" strokeWidth={2} />
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
                  loss
                </text>
              </svg>
            </>
          ) : (
            <p className="font-mono text-[14px] text-[var(--ink-muted)]">
              untrained — random initial weights, MSE {meanSquaredError(untrainedParams, problem.data).toFixed(4)}
            </p>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-[17px] font-medium text-[var(--ink-primary)]">Probe the network</h3>
        <p className="mt-1 max-w-xl text-[15px] text-[var(--ink-secondary)]">
          Drag the inputs and watch activation flow through whatever the network currently looks like — mid-training
          or fully converged. Node fill is the activation value; edge thickness is{" "}
          <span className="font-mono">|weight|</span>.
        </p>
        <div className="mt-3">
          <Formula tex="\delta_1 = (\delta_2 W_2^T) \odot h(1-h)" />
        </div>
        <div className="mt-6 grid grid-cols-1 gap-8 sm:grid-cols-[auto_1fr]">
          <NetworkDiagram params={currentParams} input={[x1, x2]} />
          <div className="flex flex-col justify-center gap-4">
            {[
              { label: "x1", value: x1, set: setX1 },
              { label: "x2", value: x2, set: setX2 },
            ].map((s) => (
              <div key={s.label}>
                <div className="flex items-baseline justify-between">
                  <label className="font-mono text-[15px] text-[var(--ink-secondary)]">{s.label}</label>
                  <span className="tabular font-mono text-[17px] text-[var(--ink-primary)]">{s.value.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={s.value}
                  onChange={(e) => s.set(Number(e.target.value))}
                  className="mt-2 w-full accent-[var(--accent-secondary)]"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
