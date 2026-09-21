// A tiny 2-3-1 multilayer perceptron with manual backpropagation — no autograd, no ML libraries.

export interface NetworkParams {
  w1: number[][]; // hidden x 2
  b1: number[]; // hidden
  w2: number[]; // hidden -> output
  b2: number;
}

export const HIDDEN_SIZE = 3;

export const XOR_DATA: { input: [number, number]; label: number }[] = [
  { input: [0, 0], label: 0 },
  { input: [0, 1], label: 1 },
  { input: [1, 0], label: 1 },
  { input: [1, 1], label: 0 },
];

export function sigmoid(z: number): number {
  return 1 / (1 + Math.exp(-z));
}

/** Deterministic PRNG (mulberry32) so a given seed always trains the same way. */
function makeRng(seed: number) {
  let a = seed >>> 0;
  return function next(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function initNetwork(seed = 42): NetworkParams {
  const rng = makeRng(seed);
  const rand = () => rng() * 2 - 1; // uniform in [-1, 1]
  return {
    w1: Array.from({ length: HIDDEN_SIZE }, () => [rand(), rand()]),
    b1: Array.from({ length: HIDDEN_SIZE }, () => rand()),
    w2: Array.from({ length: HIDDEN_SIZE }, () => rand()),
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

export function meanSquaredError(
  params: NetworkParams,
  data: typeof XOR_DATA = XOR_DATA
): number {
  const total = data.reduce((sum, { input, label }) => {
    const { output } = forward(params, input);
    return sum + (output - label) ** 2;
  }, 0);
  return total / data.length;
}

/** One full-batch gradient-descent step, gradients derived by hand via the chain rule. */
export function trainStep(
  params: NetworkParams,
  lr: number,
  data: typeof XOR_DATA = XOR_DATA
): NetworkParams {
  const gw1 = params.w1.map(() => [0, 0]);
  const gb1 = params.b1.map(() => 0);
  const gw2 = params.w2.map(() => 0);
  let gb2 = 0;

  for (const { input, label } of data) {
    const { hidden, output } = forward(params, input);

    // d(MSE)/d(rawOutput) = 2(output - label) * sigmoid'(rawOutput), and
    // sigmoid'(z) = sigmoid(z) * (1 - sigmoid(z)) = output * (1 - output).
    const dLoss_dRaw = 2 * (output - label) * output * (1 - output);

    for (let i = 0; i < HIDDEN_SIZE; i++) {
      gw2[i] += dLoss_dRaw * hidden[i];
    }
    gb2 += dLoss_dRaw;

    for (let i = 0; i < HIDDEN_SIZE; i++) {
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
