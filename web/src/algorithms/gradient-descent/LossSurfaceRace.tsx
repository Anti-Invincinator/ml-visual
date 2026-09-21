"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Formula } from "@/components/formula";
import {
  batchStep,
  LOSS_SURFACES,
  makeRng,
  momentumStep,
  noisyStep,
  type LossSurface,
  type Vec2,
} from "./engine";

const SIZE = 440;
const RANGE = 4;
const MARGIN = 28;
const SPAN = SIZE - 2 * MARGIN;
const N_STEPS = 40;
const STEP_MS = 90;

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

// Sequential blue ramp: low loss reads light, high loss reads dark/saturated.
const LOW = { r: 0xcd, g: 0xe2, b: 0xfb }; // #cde2fb
const HIGH = { r: 0x0d, g: 0x36, b: 0x6b }; // #0d366b

// Min-max normalized (not assumed to bottom out at zero — the local-minimum
// trap surface dips negative) with a gamma curve so the basin floors stay
// visually distinguishable instead of crushing to a flat color.
function heatmapImageData(surface: LossSurface): ImageData {
  const losses = new Float64Array(SIZE * SIZE);
  let min = Infinity;
  let max = -Infinity;
  for (let py = 0; py < SIZE; py++) {
    for (let px = 0; px < SIZE; px++) {
      const l = surface.loss(fromPx(px, py));
      losses[py * SIZE + px] = l;
      if (l < min) min = l;
      if (l > max) max = l;
    }
  }
  const data = new Uint8ClampedArray(SIZE * SIZE * 4);
  const span = max - min || 1;
  for (let i = 0; i < losses.length; i++) {
    const t = Math.pow((losses[i] - min) / span, 0.6);
    const idx = i * 4;
    data[idx] = LOW.r + (HIGH.r - LOW.r) * t;
    data[idx + 1] = LOW.g + (HIGH.g - LOW.g) * t;
    data[idx + 2] = LOW.b + (HIGH.b - LOW.b) * t;
    data[idx + 3] = 255;
  }
  return new ImageData(data, SIZE, SIZE);
}

const OPTIMIZERS = [
  { key: "batch", label: "Batch GD", color: "#3987e5", tex: "w_{t+1} = w_t - \\eta \\nabla L(w_t)" },
  {
    key: "momentum",
    label: "Momentum",
    color: "#d95926",
    tex: "v_{t+1} = \\beta v_t + \\nabla L(w_t),\\ w_{t+1} = w_t - \\eta v_{t+1}",
  },
  {
    key: "sgd",
    label: "Noisy / SGD-style",
    color: "#199e70",
    tex: "w_{t+1} = w_t - \\eta\\,(\\nabla L(w_t) + \\text{noise})",
  },
] as const;

function runPaths(start: Vec2, lr: number, surface: LossSurface): Record<string, Vec2[]> {
  const gradFn = surface.gradient;

  const batch: Vec2[] = [start];
  let wB = start;
  for (let i = 0; i < N_STEPS; i++) {
    wB = batchStep(wB, lr, gradFn);
    batch.push(wB);
  }

  const momentum: Vec2[] = [start];
  let wM = start;
  let v: Vec2 = { x: 0, y: 0 };
  for (let i = 0; i < N_STEPS; i++) {
    const next = momentumStep(wM, v, lr, gradFn);
    wM = next.w;
    v = next.v;
    momentum.push(wM);
  }

  const sgd: Vec2[] = [start];
  let wS = start;
  const rng = makeRng(7);
  for (let i = 0; i < N_STEPS; i++) {
    wS = noisyStep(wS, lr, rng, gradFn);
    sgd.push(wS);
  }

  return { batch, momentum, sgd };
}

export default function LossSurfaceRace() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageDataRef = useRef<ImageData | null>(null);
  const [surfaceKey, setSurfaceKey] = useState<string>(LOSS_SURFACES[0].key);
  const surface = LOSS_SURFACES.find((s) => s.key === surfaceKey)!;

  const [start, setStart] = useState<Vec2>(surface.defaultStart);
  const [lr, setLr] = useState(surface.defaultLr);
  const [step, setStep] = useState(0);

  function selectSurface(key: string) {
    const next = LOSS_SURFACES.find((s) => s.key === key)!;
    setSurfaceKey(key);
    setStart(next.defaultStart);
    setLr(next.defaultLr);
    setStep(0);
  }

  const paths = useMemo(() => runPaths(start, lr, surface), [start, lr, surface]);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const imageData = imageDataRef.current;
    if (!canvas || !imageData) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.putImageData(imageData, 0, 0);

    for (const opt of OPTIMIZERS) {
      const path = paths[opt.key].slice(0, step + 1);
      if (path.length < 2) continue;
      ctx.beginPath();
      ctx.strokeStyle = opt.color;
      ctx.lineWidth = 2.5;
      ctx.lineJoin = "round";
      const p0 = toPx(path[0]);
      ctx.moveTo(p0.x, p0.y);
      for (let i = 1; i < path.length; i++) {
        const p = toPx(path[i]);
        ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();

      const last = toPx(path[path.length - 1]);
      ctx.beginPath();
      ctx.fillStyle = opt.color;
      ctx.arc(last.x, last.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    const startPx = toPx(start);
    ctx.beginPath();
    ctx.fillStyle = "#0d0d0d";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.arc(startPx.x, startPx.y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }, [paths, step, start]);

  useEffect(() => {
    imageDataRef.current = heatmapImageData(surface);
    redraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surface]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  useEffect(() => {
    if (step >= N_STEPS) return;
    const id = setTimeout(() => setStep((s) => s + 1), STEP_MS);
    return () => clearTimeout(id);
  }, [step]);

  function handlePointerDown(evt: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const px = ((evt.clientX - rect.left) / rect.width) * SIZE;
    const py = ((evt.clientY - rect.top) / rect.height) * SIZE;
    setStart(fromPx(px, py));
    setStep(0);
  }

  function replay() {
    setStep(0);
  }

  const chartWidth = 460;
  const chartHeight = 150;
  const chartMargin = { left: 40, right: 12, top: 10, bottom: 22 };
  const rawLosses = OPTIMIZERS.map((opt) => paths[opt.key].map((w) => surface.loss(w)));
  const lossFloor = Math.min(0, ...rawLosses.flat());
  const logLosses = rawLosses.map((series) => series.map((l) => Math.log10(l - lossFloor + 1e-3)));
  const allLogs = logLosses.flat();
  const maxLog = Math.max(...allLogs);
  const minLog = Math.min(...allLogs);

  function chartX(i: number) {
    return chartMargin.left + (i / N_STEPS) * (chartWidth - chartMargin.left - chartMargin.right);
  }
  function chartY(v: number) {
    const t = (v - minLog) / (maxLog - minLog || 1);
    return chartHeight - chartMargin.bottom - t * (chartHeight - chartMargin.top - chartMargin.bottom);
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap gap-2">
        {LOSS_SURFACES.map((s) => (
          <button
            key={s.key}
            onClick={() => selectSurface(s.key)}
            className={`border px-3 py-1.5 font-mono text-[14px] transition-colors ${
              surfaceKey === s.key
                ? "border-[var(--accent)] text-[var(--accent)]"
                : "border-[var(--hairline)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
      <p className="max-w-2xl text-[15px] text-[var(--ink-secondary)]">{surface.blurb}</p>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-[440px_1fr]">
        <canvas
          ref={canvasRef}
          width={SIZE}
          height={SIZE}
          onPointerDown={handlePointerDown}
          className="cursor-crosshair touch-none select-none"
        />
        <div className="flex flex-col justify-center gap-5">
          <p className="text-[15px] text-[var(--ink-secondary)]">
            Click anywhere on the surface to drop a shared starting point — all three optimizers race from there,
            live, computed from scratch on every step.
          </p>

          <Formula tex={surface.tex} block />

          <div>
            <div className="flex items-baseline justify-between">
              <label htmlFor="lr-slider" className="font-mono text-[15px] text-[var(--ink-secondary)]">
                learning rate
              </label>
              <span className="tabular font-mono text-[17px] text-[var(--ink-primary)]">{lr.toFixed(2)}</span>
            </div>
            <input
              id="lr-slider"
              type="range"
              min={surface.lrRange.min}
              max={surface.lrRange.max}
              step={surface.lrRange.step}
              value={lr}
              onChange={(e) => {
                setLr(Number(e.target.value));
                setStep(0);
              }}
              className="mt-2 w-full accent-[var(--metric-euclidean)]"
            />
          </div>

          <button
            onClick={replay}
            className="w-fit border border-[var(--hairline)] px-4 py-2 font-mono text-[15px] text-[var(--ink-primary)] transition-colors hover:bg-[var(--surface)]"
          >
            {step < N_STEPS ? "running…" : "replay"}
          </button>

          <dl className="border border-[var(--hairline)]">
            {OPTIMIZERS.map((opt, i) => {
              const path = paths[opt.key];
              const current = path[Math.min(step, path.length - 1)];
              return (
                <div
                  key={opt.key}
                  className={`flex items-center justify-between px-4 py-3 ${
                    i !== OPTIMIZERS.length - 1 ? "border-b border-[var(--hairline)]" : ""
                  }`}
                >
                  <dt className="flex flex-col gap-1 text-[15px] text-[var(--ink-secondary)]">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ background: opt.color }} />
                      {opt.label}
                    </span>
                    <span className="text-[var(--ink-muted)]">
                      <Formula tex={opt.tex} />
                    </span>
                  </dt>
                  <dd className="tabular font-mono text-[17px] text-[var(--ink-primary)]">
                    {surface.loss(current).toFixed(3)}
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>
      </div>

      <div>
        <p className="mb-2 font-mono text-sm text-[var(--ink-muted)]">loss vs. iteration (log scale)</p>
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} width="100%" className="max-w-[460px]">
          {OPTIMIZERS.map((opt, oi) => {
            const points = logLosses[oi]
              .slice(0, step + 1)
              .map((v, i) => `${chartX(i)},${chartY(v)}`)
              .join(" ");
            return <polyline key={opt.key} points={points} fill="none" stroke={opt.color} strokeWidth={2} />;
          })}
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
        </svg>
      </div>
    </div>
  );
}
