// A tiny multilayer perceptron with manual backpropagation — no autograd, no ML libraries.

export interface NetworkParams {
  w1: number[][]; // hidden x 2
  b1: number[]; // hidden
  w2: number[]; // hidden -> output
  b2: number;
}

export interface DataPoint {
  input: [number, number];
  label: number;
}

export const XOR_DATA: DataPoint[] = [
  { input: [0, 0], label: 0 },
  { input: [0, 1], label: 1 },
  { input: [1, 0], label: 1 },
  { input: [1, 1], label: 0 },
];

/** Two concentric rings, centered at (0.5, 0.5) — not linearly separable, and
 * needs real hidden-layer capacity (a handful of hyperplane folds isn't enough
 * to trace a ring) in a way XOR's four points don't really demand. */
function makeConcentricCircles(n: number, seed: number): DataPoint[] {
  const rng = makeRng(seed);
  const data: DataPoint[] = [];
  for (let i = 0; i < n; i++) {
    const inner = i % 2 === 0;
    const angle = rng() * 2 * Math.PI;
    const r = inner ? 0.08 + rng() * 0.14 : 0.3 + rng() * 0.18;
    data.push({
      input: [0.5 + r * Math.cos(angle), 0.5 + r * Math.sin(angle)],
      label: inner ? 1 : 0,
    });
  }
  return data;
}

export const CIRCLES_DATA: DataPoint[] = makeConcentricCircles(120, 1);

export interface Problem {
  key: string;
  label: string;
  data: DataPoint[];
  hiddenSize: number;
  epochs: number;
  defaultLr: number;
  lrRange: { min: number; max: number; step: number };
  blurb: string;
  pointRadius: number;
}

export const PROBLEMS: Problem[] = [
  {
    key: "xor",
    label: "XOR",
    data: XOR_DATA,
    hiddenSize: 3,
    epochs: 3000,
    defaultLr: 4,
    lrRange: { min: 0.5, max: 8, step: 0.5 },
    blurb:
      "XOR isn't linearly separable — no single straight line divides the two classes. Four points, three hidden units, one bent boundary.",
    pointRadius: 7,
  },
  {
    key: "circles",
    label: "Concentric circles",
    data: CIRCLES_DATA,
    hiddenSize: 8,
    epochs: 3000,
    defaultLr: 3,
    lrRange: { min: 0.5, max: 6, step: 0.5 },
    blurb:
      "One class ringed entirely inside the other — no straight line, and no small number of them, separates this. It takes real hidden-layer capacity to trace a closed curve.",
    pointRadius: 3,
  },
];

export function sigmoid(z: number): number {
  return 1 / (1 + Math.exp(-z));
}

/** Deterministic PRNG (mulberry32) so a given seed always trains the same way. */
export function makeRng(seed: number) {
  let a = seed >>> 0;
  return function next(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function initNetwork(seed: number, hiddenSize: number): NetworkParams {
  const rng = makeRng(seed);
  const rand = () => rng() * 2 - 1; // uniform in [-1, 1]
  return {
    w1: Array.from({ length: hiddenSize }, () => [rand(), rand()]),
    b1: Array.from({ length: hiddenSize }, () => rand()),
    w2: Array.from({ length: hiddenSize }, () => rand()),
    b2: rand(),
  };
}

export interface ForwardResult {
  hidden: number[];
  output: number;
}

export function forward(params: NetworkParams, input: [number, number]): ForwardResult {
  const hidden = params.w1.map((w, i) =>
    sigmoid(w[0] * input[0] + w[1] * input[1] + params.b1[i])
  );
  const raw = hidden.reduce((sum, h, i) => sum + h * params.w2[i], params.b2);
  return { hidden, output: sigmoid(raw) };
}

export function meanSquaredError(params: NetworkParams, data: DataPoint[]): number {
  const total = data.reduce((sum, { input, label }) => {
    const { output } = forward(params, input);
    return sum + (output - label) ** 2;
  }, 0);
  return total / data.length;
}

/** One full-batch gradient-descent step, gradients derived by hand via the chain rule. */
export function trainStep(params: NetworkParams, lr: number, data: DataPoint[]): NetworkParams {
  const hiddenSize = params.w1.length;
  const gw1 = params.w1.map(() => [0, 0]);
  const gb1 = params.b1.map(() => 0);
  const gw2 = params.w2.map(() => 0);
  let gb2 = 0;

  for (const { input, label } of data) {
    const { hidden, output } = forward(params, input);

    // d(MSE)/d(rawOutput) = 2(output - label) * sigmoid'(rawOutput), and
    // sigmoid'(z) = sigmoid(z) * (1 - sigmoid(z)) = output * (1 - output).
    const dLoss_dRaw = 2 * (output - label) * output * (1 - output);

    for (let i = 0; i < hiddenSize; i++) {
      gw2[i] += dLoss_dRaw * hidden[i];
    }
    gb2 += dLoss_dRaw;

    for (let i = 0; i < hiddenSize; i++) {
      const dLoss_dHidden = dLoss_dRaw * params.w2[i];
      const dHidden_dRaw = hidden[i] * (1 - hidden[i]);
      const dLoss_dHiddenRaw = dLoss_dHidden * dHidden_dRaw;
      gw1[i][0] += dLoss_dHiddenRaw * input[0];
      gw1[i][1] += dLoss_dHiddenRaw * input[1];
      gb1[i] += dLoss_dHiddenRaw;
    }
  }

  const n = data.length;
  return {
    w1: params.w1.map((w, i) => [w[0] - (lr * gw1[i][0]) / n, w[1] - (lr * gw1[i][1]) / n]),
    b1: params.b1.map((b, i) => b - (lr * gb1[i]) / n),
    w2: params.w2.map((w, i) => w - (lr * gw2[i]) / n),
    b2: params.b2 - (lr * gb2) / n,
  };
}
