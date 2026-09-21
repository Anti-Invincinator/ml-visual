"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Formula } from "@/components/formula";
import { rastrigin, runGradientDescent, runSimulatedAnnealing, type Point, type SAStep } from "./engine";

const SIZE = 440;
const RANGE = 4;
const MARGIN = 20;
const SPAN = SIZE - 2 * MARGIN;
const START: Point = { x: 2.3, y: 1.8 };
const SA_STEPS = 400;
const T0 = 15;
const T_FINAL = 0.005;
const STEP_SCALE = 0.5;
const STEPS_PER_TICK = 4;
const TICK_MS = 60;

function toPx(p: Point) {
  return {
    x: MARGIN + ((p.x + RANGE) / (2 * RANGE)) * SPAN,
    y: SIZE - MARGIN - ((p.y + RANGE) / (2 * RANGE)) * SPAN,
  };
}
function fromPx(px: number, py: number): Point {
  return {
    x: ((px - MARGIN) / SPAN) * 2 * RANGE - RANGE,
    y: ((SIZE - MARGIN - py) / SPAN) * 2 * RANGE - RANGE,
  };
}

const LOW = { r: 0xcd, g: 0xe2, b: 0xfb };
const HIGH = { r: 0x0d, g: 0x36, b: 0x6b };

function heatmapImageData(): ImageData {
  const data = new Uint8ClampedArray(SIZE * SIZE * 4);
  const maxVal = rastrigin(RANGE, RANGE) * 1.1;
  for (let py = 0; py < SIZE; py++) {
    for (let px = 0; px < SIZE; px++) {
      const { x, y } = fromPx(px, py);
      const v = rastrigin(x, y);
      const t = Math.min(1, Math.sqrt(v / maxVal));
      const idx = (py * SIZE + px) * 4;
      data[idx] = LOW.r + (HIGH.r - LOW.r) * t;
      data[idx + 1] = LOW.g + (HIGH.g - LOW.g) * t;
      data[idx + 2] = LOW.b + (HIGH.b - LOW.b) * t;
      data[idx + 3] = 255;
    }
  }
  return new ImageData(data, SIZE, SIZE);
}

export default function SimulatedAnnealingExplorer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageDataRef = useRef<ImageData | null>(null);
  const [seed, setSeed] = useState(1);
  const [step, setStep] = useState(0);

  const saHistory: SAStep[] = useMemo(
    () => runSimulatedAnnealing(START, SA_STEPS, T0, T_FINAL, STEP_SCALE, seed, RANGE - 0.15),
    [seed]
  );
  const gdPath = useMemo(() => runGradientDescent(START, 0.01, SA_STEPS), []);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const imageData = imageDataRef.current;
    if (!canvas || !ctx || !imageData) return;
    ctx.putImageData(imageData, 0, 0);

    const saSlice = saHistory.slice(0, step + 2);
    ctx.beginPath();
    ctx.strokeStyle = "#9085e9";
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.7;
    const sa0 = toPx(saSlice[0].point);
    ctx.moveTo(sa0.x, sa0.y);
    for (let i = 1; i < saSlice.length; i++) {
      const p = toPx(saSlice[i].point);
      ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;

    for (const s of saSlice) {
      if (s.acceptedWorse) {
        const p = toPx(s.point);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fillStyle = "#d03b3b";
        ctx.fill();
      }
    }
    const saCurrent = toPx(saSlice[saSlice.length - 1].point);
    ctx.beginPath();
    ctx.arc(saCurrent.x, saCurrent.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = "#9085e9";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();

    const gdSlice = gdPath.slice(0, step + 2);
    ctx.beginPath();
    ctx.strokeStyle = "#3987e5";
    ctx.lineWidth = 2;
    const gd0 = toPx(gdSlice[0]);
    ctx.moveTo(gd0.x, gd0.y);
    for (let i = 1; i < gdSlice.length; i++) {
      const p = toPx(gdSlice[i]);
      ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    const gdCurrent = toPx(gdSlice[gdSlice.length - 1]);
    ctx.beginPath();
    ctx.arc(gdCurrent.x, gdCurrent.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = "#3987e5";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();

    const start = toPx(START);
    ctx.beginPath();
    ctx.arc(start.x, start.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = "#0d0d0f";
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();
  }, [saHistory, gdPath, step]);

  useEffect(() => {
    imageDataRef.current = heatmapImageData();
    redraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    redraw();
  }, [redraw]);

  useEffect(() => {
    if (step >= SA_STEPS) return;
    const id = setTimeout(() => setStep((s) => Math.min(s + STEPS_PER_TICK, SA_STEPS)), TICK_MS);
    return () => clearTimeout(id);
  }, [step]);

  function reshuffle() {
    setSeed((s) => s + 1);
    setStep(0);
  }

  const saCurrent = saHistory[Math.min(step + 1, saHistory.length - 1)];
  const gdCurrent = gdPath[Math.min(step + 1, gdPath.length - 1)];
  const saValue = rastrigin(saCurrent.point.x, saCurrent.point.y);
  const gdValue = rastrigin(gdCurrent.x, gdCurrent.y);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-[380px_1fr]">
        <canvas ref={canvasRef} width={SIZE} height={SIZE} className="block" />
        <div className="flex flex-col justify-center gap-5">
          <p className="text-[13px] text-[var(--ink-secondary)]">
            Same start, same landscape. Gradient descent (blue) commits immediately and stops the moment it finds a
            downhill-only path. Simulated annealing (violet) sometimes accepts a worse move on purpose — those
            moves are marked in red — which is exactly what lets it walk back out of a bad basin while it&apos;s
            still &ldquo;hot.&rdquo;
          </p>
          <Formula tex="P(\text{accept}) = \exp\!\left(-\dfrac{\Delta}{T}\right)" block />
          <dl className="border border-[var(--hairline)]">
            <div className="flex items-center justify-between border-b border-[var(--hairline)] px-4 py-3">
              <dt className="flex items-center gap-2 text-[13px] text-[var(--ink-secondary)]">
                <span className="h-2 w-2 rounded-full" style={{ background: "#3987e5" }} />
                gradient descent
              </dt>
              <dd className="tabular font-mono text-[15px] text-[var(--ink-primary)]">{gdValue.toFixed(3)}</dd>
            </div>
            <div className="flex items-center justify-between border-b border-[var(--hairline)] px-4 py-3">
              <dt className="flex items-center gap-2 text-[13px] text-[var(--ink-secondary)]">
                <span className="h-2 w-2 rounded-full" style={{ background: "#9085e9" }} />
                simulated annealing
              </dt>
              <dd className="tabular font-mono text-[15px] text-[var(--ink-primary)]">{saValue.toFixed(3)}</dd>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <dt className="text-[13px] text-[var(--ink-secondary)]">temperature</dt>
              <dd className="tabular font-mono text-[15px] text-[var(--ink-primary)]">
                {saCurrent.temperature.toFixed(3)}
              </dd>
            </div>
          </dl>
          <button
            onClick={reshuffle}
            className="w-fit border border-[var(--hairline)] px-4 py-2 font-mono text-[13px] text-[var(--ink-primary)] transition-colors hover:bg-[var(--surface)]"
          >
            new seed
          </button>
          <p className="font-mono text-[11px] text-[var(--ink-muted)]">
            step {Math.min(step, SA_STEPS)} / {SA_STEPS} — lower is better, 0 is the true optimum
          </p>
        </div>
      </div>
    </div>
  );
}
