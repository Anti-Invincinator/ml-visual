// Kernel SVM, trained from scratch — subgradient descent directly on the dual
// coefficients minimizing a regularized kernel hinge-loss objective. No QP
// solver, no SMO, no ML libraries.

export interface Point {
  x: number;
  y: number;
}

export interface LabeledPoint extends Point {
  label: 1 | -1;
}

export type Kernel = (a: Point, b: Point) => number;

export function linearKernel(a: Point, b: Point): number {
  return a.x * b.x + a.y * b.y;
}

export const RBF_GAMMA = 2.5;

export function rbfKernel(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.exp(-RBF_GAMMA * (dx * dx + dy * dy));
}

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

function gaussian(rng: () => number): number {
  const u1 = Math.max(rng(), 1e-12);
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/** Two concentric rings — not linearly separable, the point of the kernel trick. */
export function makeConcentricDataset(perClass = 24, seed = 11): LabeledPoint[] {
  const rng = makeRng(seed);
  const points: LabeledPoint[] = [];
  for (let i = 0; i < perClass; i++) {
    const theta = (2 * Math.PI * i) / perClass;
    const r = 0.35 + gaussian(rng) * 0.06;
    points.push({ x: r * Math.cos(theta), y: r * Math.sin(theta), label: -1 });
  }
  for (let i = 0; i < perClass; i++) {
    const theta = (2 * Math.PI * i) / perClass + 0.3;
    const r = 1.0 + gaussian(rng) * 0.08;
    points.push({ x: r * Math.cos(theta), y: r * Math.sin(theta), label: 1 });
  }
  return points;
}

export function kernelMatrix(points: Point[], kernel: Kernel): number[][] {
  const n = points.length;
  const K: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      const v = kernel(points[i], points[j]);
      K[i][j] = v;
      K[j][i] = v;
    }
  }
  return K;
}

export interface SvmModel {
  alpha: number[];
  b: number;
}

export function initModel(n: number): SvmModel {
  return { alpha: new Array(n).fill(0), b: 0 };
}

/**
 * f(x_i) for every training point, given the current model:
 * f(x_i) = sum_j alpha_j * y_j * K(x_i, x_j) + b
 */
function decisionValues(K: number[][], y: number[], model: SvmModel): number[] {
  const n = y.length;
  const ay = model.alpha.map((a, j) => a * y[j]);
  const f = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    let sum = model.b;
    const Ki = K[i];
    for (let j = 0; j < n; j++) sum += Ki[j] * ay[j];
    f[i] = sum;
  }
  return f;
}

/**
 * One full-batch subgradient-descent step on
 *   J(alpha) = (lambda/2) * alpha^T (Y K Y) alpha + (1/n) * sum_i hinge(y_i * f(x_i))
 * derived by hand (see the notebook for the full derivation).
 */
export function trainStep(
  K: number[][],
  y: number[],
  model: SvmModel,
  lr: number,
  lambda: number
): SvmModel {
  const n = y.length;
  const f = decisionValues(K, y, model);
  const margin = f.map((fi, i) => fi * y[i]);
  const mask: number[] = margin.map((m) => (m < 1 ? 1 : 0));

  const ay = model.alpha.map((a, j) => a * y[j]);
  const my = mask.map((m, j) => m * y[j]);

  const newAlpha = model.alpha.map((a, j) => {
    let regTerm = 0;
    let hingeTerm = 0;
    const Kj = K[j];
    for (let i = 0; i < n; i++) {
      regTerm += Kj[i] * ay[i];
      hingeTerm += Kj[i] * my[i];
    }
    const grad = lambda * y[j] * regTerm - (y[j] * hingeTerm) / n;
    return a - lr * grad;
  });

  const gradB = -mask.reduce((sum, m, i) => sum + m * y[i], 0) / n;
  const newB = model.b - lr * gradB;

  return { alpha: newAlpha, b: newB };
}

export function hingeLoss(K: number[][], y: number[], model: SvmModel, lambda: number): number {
  const n = y.length;
  const f = decisionValues(K, y, model);
  const hinge = f.reduce((sum, fi, i) => sum + Math.max(0, 1 - fi * y[i]), 0) / n;
  const ay = model.alpha.map((a, j) => a * y[j]);
  let reg = 0;
  for (let i = 0; i < n; i++) {
    const Ki = K[i];
    for (let j = 0; j < n; j++) reg += ay[i] * Ki[j] * ay[j];
  }
  return hinge + (lambda / 2) * reg;
}

export function supportVectorMask(K: number[][], y: number[], model: SvmModel): boolean[] {
  const f = decisionValues(K, y, model);
  return f.map((fi, i) => fi * y[i] < 1.02);
}

export function decisionValueAt(
  point: Point,
  trainPoints: Point[],
  y: number[],
  kernel: Kernel,
  model: SvmModel
): number {
  let sum = model.b;
  for (let j = 0; j < trainPoints.length; j++) {
    sum += model.alpha[j] * y[j] * kernel(point, trainPoints[j]);
  }
  return sum;
}
