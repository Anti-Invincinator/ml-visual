// Gradient descent variants, implemented from scratch — no math/optimization libraries.

export interface Vec2 {
  x: number;
  y: number;
}

/** Deterministic PRNG (mulberry32) so noisy runs are reproducible from a seed. */
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

/** Standard-normal sample via the Box-Muller transform. */
export function gaussian(rng: () => number): number {
  const u1 = Math.max(rng(), 1e-12);
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

export function batchStep(w: Vec2, lr: number, gradFn: (w: Vec2) => Vec2): Vec2 {
  const g = gradFn(w);
  return { x: w.x - lr * g.x, y: w.y - lr * g.y };
}

export function momentumStep(
  w: Vec2,
  v: Vec2,
  lr: number,
  gradFn: (w: Vec2) => Vec2,
  beta = 0.85
): { w: Vec2; v: Vec2 } {
  const g = gradFn(w);
  const nv = { x: beta * v.x + g.x, y: beta * v.y + g.y };
  return { w: { x: w.x - lr * nv.x, y: w.y - lr * nv.y }, v: nv };
}

export function noisyStep(
  w: Vec2,
  lr: number,
  rng: () => number,
  gradFn: (w: Vec2) => Vec2,
  noiseScale = 1.2
): Vec2 {
  const g = gradFn(w);
  return {
    x: w.x - lr * (g.x + gaussian(rng) * noiseScale),
    y: w.y - lr * (g.y + gaussian(rng) * noiseScale),
  };
}

export interface LossSurface {
  key: string;
  label: string;
  tex: string;
  blurb: string;
  loss: (w: Vec2) => number;
  gradient: (w: Vec2) => Vec2;
  defaultStart: Vec2;
  defaultLr: number;
  lrRange: { min: number; max: number; step: number };
}

// --- Stage 1: elongated quadratic bowl -------------------------------------
// Steep along y, shallow along x, one global minimum — the textbook case for
// why a fixed learning rate and plain gradient descent struggle with
// anisotropic curvature, and why momentum helps.
const BOWL_CURVATURE_X = 1.0;
const BOWL_CURVATURE_Y = 8.0;

function bowlLoss(w: Vec2): number {
  return 0.5 * (BOWL_CURVATURE_X * w.x * w.x + BOWL_CURVATURE_Y * w.y * w.y);
}

function bowlGradient(w: Vec2): Vec2 {
  return { x: BOWL_CURVATURE_X * w.x, y: BOWL_CURVATURE_Y * w.y };
}

const bowlSurface: LossSurface = {
  key: "bowl",
  label: "Elongated bowl",
  tex: "L(w_1, w_2) = \\tfrac{1}{2}\\left(a\\,w_1^2 + b\\,w_2^2\\right)",
  blurb:
    "One basin, but steep in one direction and shallow in the other — real loss surfaces are rarely round, and that alone is enough to make a fixed learning rate a tradeoff.",
  loss: bowlLoss,
  gradient: bowlGradient,
  defaultStart: { x: 3.2, y: 3.2 },
  defaultLr: 0.2,
  lrRange: { min: 0.02, max: 0.24, step: 0.01 },
};

// --- Stage 2: local-minimum trap --------------------------------------------
// A tilted double well in x (two basins of different depth) crossed with a
// quadratic in y. Real training losses aren't convex bowls — they have
// shallow local minima that plain gradient descent can get stuck in, which
// momentum's accumulated velocity and SGD-style noise can sometimes carry a
// run past. Coefficients tuned (see scratch verification) so the shallow
// basin sits near x=+1.5, the deeper global basin near x=-2, separated by a
// barrier around x=0.5 — and so gradient magnitudes stay the same order as
// the bowl's, keeping one learning-rate slider meaningful across both stages.
const WELL_K = 0.06;
const WELL_A = 1.8;
const WELL_TILT = 0.35;
const WELL_CURVATURE_Y = 3.0;

function trapLoss(w: Vec2): number {
  const wellTerm = WELL_K * (w.x * w.x - WELL_A * WELL_A) ** 2 + WELL_TILT * w.x;
  return wellTerm + 0.5 * WELL_CURVATURE_Y * w.y * w.y;
}

function trapGradient(w: Vec2): Vec2 {
  const gx = 4 * WELL_K * w.x * (w.x * w.x - WELL_A * WELL_A) + WELL_TILT;
  return { x: gx, y: WELL_CURVATURE_Y * w.y };
}

const trapSurface: LossSurface = {
  key: "trap",
  label: "Local-minimum trap",
  tex: "L(w_1, w_2) = k\\left(w_1^2 - a^2\\right)^2 + c\\,w_1 + \\tfrac{1}{2}b\\,w_2^2",
  blurb:
    "Two basins of different depth. Plain batch descent falls into whichever one it's closest to and stops — it has no way to know a deeper one exists on the other side of the ridge.",
  loss: trapLoss,
  gradient: trapGradient,
  defaultStart: { x: 2.4, y: 2.6 },
  defaultLr: 0.18,
  lrRange: { min: 0.02, max: 0.24, step: 0.01 },
};

export const LOSS_SURFACES: LossSurface[] = [bowlSurface, trapSurface];
