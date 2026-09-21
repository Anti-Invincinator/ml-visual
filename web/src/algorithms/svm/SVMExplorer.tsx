"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Formula } from "@/components/formula";
import {
  decisionValueAt,
  hingeLoss,
  initModel,
  kernelMatrix,
  linearKernel,
  makeConcentricDataset,
  rbfKernel,
  supportVectorMask,
  trainStep,
  type Kernel,
  type LabeledPoint,
  type SvmModel,
} from "./engine";

const GRID = 100;
const MARGIN = 8;
const SPAN = GRID - 2 * MARGIN;
const DATA_RANGE = 1.5;
const DISPLAY_SIZE = 280;

const TOTAL_EPOCHS = 450;
const SNAPSHOTS = 15;
const EPOCHS_PER_SNAPSHOT = TOTAL_EPOCHS / SNAPSHOTS;
const LAMBDA = 0.05;
const LR = 0.6;
const STEP_MS = 160;

function toPx(x: number, y: number) {
  return {
    x: MARGIN + ((x + DATA_RANGE) / (2 * DATA_RANGE)) * SPAN,
    y: GRID - MARGIN - ((y + DATA_RANGE) / (2 * DATA_RANGE)) * SPAN,
  };
}
function fromPx(px: number): number {
  return ((px - MARGIN) / SPAN) * 2 * DATA_RANGE - DATA_RANGE;
}

// Diverging blue↔red pair with a neutral gray midpoint — decision value has a sign,
// not a magnitude, so diverging (not sequential) is the correct encoding.
const BLUE = { r: 0x39, g: 0x87, b: 0xe5 };
const RED = { r: 0xd0, g: 0x3b, b: 0x3b };
const NEUTRAL = { r: 0x38, g: 0x38, b: 0x35 };

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function colorForValue(f: number): [number, number, number] {
  const t = Math.tanh(f * 0.8); // -1..1
  if (t < 0) {
    const k = 1 + t; // 0..1 as t goes -1..0
    return [lerp(BLUE.r, NEUTRAL.r, k), lerp(BLUE.g, NEUTRAL.g, k), lerp(BLUE.b, NEUTRAL.b, k)];
  }
  const k = t; // 0..1 as t goes 0..1
  return [lerp(NEUTRAL.r, RED.r, k), lerp(NEUTRAL.g, RED.g, k), lerp(NEUTRAL.b, RED.b, k)];
}

function heatmapFor(data: LabeledPoint[], y: number[], kernel: Kernel, model: SvmModel): ImageData {
  const pixels = new Uint8ClampedArray(GRID * GRID * 4);
  for (let py = 0; py < GRID; py++) {
    const yVal = ((GRID - MARGIN - py) / SPAN) * 2 * DATA_RANGE - DATA_RANGE;
    for (let px = 0; px < GRID; px++) {
      const xVal = fromPx(px);
      const idx = (py * GRID + px) * 4;
      const f = decisionValueAt({ x: xVal, y: yVal }, data, y, kernel, model);
      const [r, g, b] = colorForValue(f);
      pixels[idx] = r;
      pixels[idx + 1] = g;
      pixels[idx + 2] = b;
      pixels[idx + 3] = 255;
    }
  }
  return new ImageData(pixels, GRID, GRID);
}

interface Trajectory {
  models: SvmModel[];
  losses: number[];
}

function buildTrajectory(K: number[][], y: number[]): Trajectory {
  let model = initModel(y.length);
  const models: SvmModel[] = [model];
  const losses: number[] = [hingeLoss(K, y, model, LAMBDA)];
  for (let epoch = 0; epoch < TOTAL_EPOCHS; epoch++) {
    model = trainStep(K, y, model, LR, LAMBDA);
    if ((epoch + 1) % EPOCHS_PER_SNAPSHOT === 0) {
      models.push(model);
      losses.push(hingeLoss(K, y, model, LAMBDA));
    }
  }
  return { models, losses };
}

function KernelPanel({
  title,
  tex,
  data,
  y,
  kernel,
  K,
  trajectory,
  untrainedModel,
  step,
}: {
  title: string;
  tex: string;
  data: LabeledPoint[];
  y: number[];
  kernel: Kernel;
  K: number[][];
  trajectory: Trajectory | null;
  untrainedModel: SvmModel;
  step: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<ImageData[] | null>(null);
  const model = trajectory ? trajectory.models[Math.min(step, trajectory.models.length - 1)] : untrainedModel;

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    const images = imagesRef.current;
    if (!canvas || !ctx || !images) return;
    ctx.putImageData(images[Math.min(step, images.length - 1)], 0, 0);

    const svMask = supportVectorMask(K, y, model);
    data.forEach((p, i) => {
      const px = toPx(p.x, p.y);
      const isSv = svMask[i];
      ctx.beginPath();
      ctx.arc(px.x, px.y, isSv ? 4 : 2.5, 0, Math.PI * 2);
      ctx.fillStyle = p.label === 1 ? "#e66767" : "#3987e5";
      ctx.fill();
      ctx.lineWidth = isSv ? 1.5 : 1;
      ctx.strokeStyle = "#ffffff";
      ctx.stroke();
    });
  }, [data, y, K, model, step]);

  // The heavy part (training + rendering per-snapshot heatmaps) only runs once
  // "train" is clicked — before that, a single cheap heatmap of the untrained model.
  useEffect(() => {
    imagesRef.current = trajectory
      ? trajectory.models.map((m) => heatmapFor(data, y, kernel, m))
      : [heatmapFor(data, y, kernel, untrainedModel)];
    redraw();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trajectory]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  const svCount = supportVectorMask(K, y, model).filter(Boolean).length;
  const correct = data.filter((p) => {
    const f = decisionValueAt(p, data, y, kernel, model);
    return Math.sign(f) === p.label || (Math.sign(f) === 0 && p.label === 1);
  }).length;

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h3 className="font-mono text-[15px] text-[var(--ink-primary)]">{title}</h3>
        <span className="tabular font-mono text-[14px] text-[var(--ink-muted)]">
          {correct}/{data.length} correct · {svCount} support vectors
        </span>
      </div>
      <div className="mt-1 text-[var(--ink-muted)]">
        <Formula tex={tex} />
      </div>
      <canvas
        ref={canvasRef}
        width={GRID}
        height={GRID}
        style={{ width: DISPLAY_SIZE, height: DISPLAY_SIZE }}
        className="mt-2 block"
      />
    </div>
  );
}

export default function SVMExplorer() {
  const [step, setStep] = useState(0);
  const [linearTrajectory, setLinearTrajectory] = useState<Trajectory | null>(null);
  const [rbfTrajectory, setRbfTrajectory] = useState<Trajectory | null>(null);

  const data = useMemo(() => makeConcentricDataset(24, 11), []);
  const y = useMemo(() => data.map((p) => p.label), [data]);

  const linearK = useMemo(() => kernelMatrix(data, linearKernel), [data]);
  const rbfK = useMemo(() => kernelMatrix(data, rbfKernel), [data]);
  const untrainedModel = useMemo(() => initModel(y.length), [y.length]);

  useEffect(() => {
    if (!linearTrajectory) return;
    if (step >= SNAPSHOTS) return;
    const id = setTimeout(() => setStep((s) => s + 1), STEP_MS);
    return () => clearTimeout(id);
  }, [step, linearTrajectory]);

  function handleTrainClick() {
    if (!linearTrajectory) {
      setLinearTrajectory(buildTrajectory(linearK, y));
      setRbfTrajectory(buildTrajectory(rbfK, y));
    }
    setStep(0);
  }

  const buttonLabel = !linearTrajectory ? "train both" : step < SNAPSHOTS ? "training…" : "replay";

  return (
    <div className="flex flex-col gap-6">
      <p className="text-[15px] text-[var(--ink-secondary)]">
        Two rings, not linearly separable — no straight line can split them. Both models train on the exact same
        points, same regularization, same learning rate. Only the kernel changes.
      </p>
      <Formula tex="f(x) = \sum_j \alpha_j y_j K(x_j, x) + b" block />
      <div className="grid grid-cols-1 gap-10 sm:grid-cols-2">
        <KernelPanel
          title="linear kernel"
          tex="K(a,b) = a \cdot b"
          data={data}
          y={y}
          kernel={linearKernel}
          K={linearK}
          trajectory={linearTrajectory}
          untrainedModel={untrainedModel}
          step={step}
        />
        <KernelPanel
          title="RBF kernel"
          tex="K(a,b) = \exp(-\gamma \lVert a-b \rVert^2)"
          data={data}
          y={y}
          kernel={rbfKernel}
          K={rbfK}
          trajectory={rbfTrajectory}
          untrainedModel={untrainedModel}
          step={step}
        />
      </div>
      <button
        onClick={handleTrainClick}
        className="w-fit border border-[var(--hairline)] px-4 py-2 font-mono text-[15px] text-[var(--ink-primary)] transition-colors hover:bg-[var(--surface)]"
      >
        {buttonLabel}
      </button>
    </div>
  );
}
