// A CART-style binary decision tree, implemented from scratch — no ML libraries.

export interface LabeledPoint {
  x: number;
  y: number;
  label: 0 | 1;
}

export type TreeNode =
  | { type: "leaf"; prediction: 0 | 1 }
  | { type: "split"; featureIndex: 0 | 1; threshold: number; left: TreeNode; right: TreeNode };

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

/** Four overlapping blobs in a checkerboard pattern — the same shape XOR needs a
 * hidden layer for, solved here by axis-aligned splits instead. */
export function makeCheckerboardDataset(perQuadrant = 25, seed = 3, spread = 0.55): LabeledPoint[] {
  const rng = makeRng(seed);
  const quadrants: { cx: number; cy: number; label: 0 | 1 }[] = [
    { cx: 0.7, cy: 0.7, label: 0 },
    { cx: -0.7, cy: -0.7, label: 0 },
    { cx: 0.7, cy: -0.7, label: 1 },
    { cx: -0.7, cy: 0.7, label: 1 },
  ];
  const points: LabeledPoint[] = [];
  for (const q of quadrants) {
    for (let i = 0; i < perQuadrant; i++) {
      points.push({ x: q.cx + gaussian(rng) * spread, y: q.cy + gaussian(rng) * spread, label: q.label });
    }
  }
  for (let i = points.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [points[i], points[j]] = [points[j], points[i]];
  }
  return points;
}

export function splitDataset(points: LabeledPoint[], trainFraction = 0.7) {
  const cut = Math.floor(points.length * trainFraction);
  return { train: points.slice(0, cut), test: points.slice(cut) };
}

export function giniImpurity(labels: (0 | 1)[]): number {
  if (labels.length === 0) return 0;
  const p1 = labels.filter((l) => l === 1).length / labels.length;
  const p0 = 1 - p1;
  return 1 - p0 * p0 - p1 * p1;
}

function featureValue(p: LabeledPoint, featureIndex: 0 | 1): number {
  return featureIndex === 0 ? p.x : p.y;
}

interface Split {
  featureIndex: 0 | 1;
  threshold: number;
  weightedGini: number;
}

/** Greedy search over every candidate threshold on both features — the split that
 * minimizes the size-weighted Gini impurity of the two resulting groups wins. */
function bestSplit(points: LabeledPoint[]): Split | null {
  let best: Split | null = null;
  for (const featureIndex of [0, 1] as const) {
    const sorted = [...points].sort((a, b) => featureValue(a, featureIndex) - featureValue(b, featureIndex));
    for (let i = 1; i < sorted.length; i++) {
      const prev = featureValue(sorted[i - 1], featureIndex);
      const curr = featureValue(sorted[i], featureIndex);
      if (curr === prev) continue;
      const threshold = (prev + curr) / 2;
      const left = points.filter((p) => featureValue(p, featureIndex) < threshold);
      const right = points.filter((p) => featureValue(p, featureIndex) >= threshold);
      if (left.length === 0 || right.length === 0) continue;
      const weightedGini =
        (left.length * giniImpurity(left.map((p) => p.label)) +
          right.length * giniImpurity(right.map((p) => p.label))) /
        points.length;
      if (!best || weightedGini < best.weightedGini) {
        best = { featureIndex, threshold, weightedGini };
      }
    }
  }
  return best;
}

function majorityLabel(points: LabeledPoint[]): 0 | 1 {
  const ones = points.filter((p) => p.label === 1).length;
  return ones >= points.length - ones ? 1 : 0;
}

export function buildTree(points: LabeledPoint[], maxDepth: number, depth = 0): TreeNode {
  const labels = points.map((p) => p.label);
  if (depth >= maxDepth || giniImpurity(labels) === 0 || points.length < 4) {
    return { type: "leaf", prediction: majorityLabel(points) };
  }
  const split = bestSplit(points);
  if (!split) return { type: "leaf", prediction: majorityLabel(points) };

  const left = points.filter((p) => featureValue(p, split.featureIndex) < split.threshold);
  const right = points.filter((p) => featureValue(p, split.featureIndex) >= split.threshold);
  return {
    type: "split",
    featureIndex: split.featureIndex,
    threshold: split.threshold,
    left: buildTree(left, maxDepth, depth + 1),
    right: buildTree(right, maxDepth, depth + 1),
  };
}

export function predict(node: TreeNode, point: { x: number; y: number }): 0 | 1 {
  if (node.type === "leaf") return node.prediction;
  const value = node.featureIndex === 0 ? point.x : point.y;
  return value < node.threshold ? predict(node.left, point) : predict(node.right, point);
}

export function accuracy(node: TreeNode, points: LabeledPoint[]): number {
  if (points.length === 0) return 0;
  const correct = points.filter((p) => predict(node, p) === p.label).length;
  return correct / points.length;
}
