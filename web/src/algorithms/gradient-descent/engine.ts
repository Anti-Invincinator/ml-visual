// Gradient descent variants, implemented from scratch — no math/optimization libraries.

export interface Vec2 {
  x: number;
  y: number;
}

// Elongated quadratic bowl: steep along y, shallow along x.
export const CURVATURE_X = 1.0;
export const CURVATURE_Y = 8.0;

export function loss(w: Vec2): number {
  return 0.5 * (CURVATURE_X * w.x * w.x + CURVATURE_Y * w.y * w.y);
}

export function gradient(w: Vec2): Vec2 {
  return { x: CURVATURE_X * w.x, y: CURVATURE_Y * w.y };
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

export function batchStep(w: Vec2, lr: number): Vec2 {
  const g = gradient(w);
  return { x: w.x - lr * g.x, y: w.y - lr * g.y };
}

export function momentumStep(w: Vec2, v: Vec2, lr: number, beta = 0.85): { w: Vec2; v: Vec2 } {
  const g = gradient(w);
  const nv = { x: beta * v.x + g.x, y: beta * v.y + g.y };
  return { w: { x: w.x - lr * nv.x, y: w.y - lr * nv.y }, v: nv };
}

export function noisyStep(w: Vec2, lr: number, rng: () => number, noiseScale = 1.2): Vec2 {
  const g = gradient(w);
  return {
    x: w.x - lr * (g.x + gaussian(rng) * noiseScale),
    y: w.y - lr * (g.y + gaussian(rng) * noiseScale),
  };
}
