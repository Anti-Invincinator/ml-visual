// Distance metrics, implemented from scratch — no math/geometry libraries.

export interface Vec2 {
  x: number;
  y: number;
}

export function euclideanDistance(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function manhattanDistance(a: Vec2, b: Vec2): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export function chebyshevDistance(a: Vec2, b: Vec2): number {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

export function minkowskiDistance(a: Vec2, b: Vec2, p: number): number {
  if (!Number.isFinite(p)) return chebyshevDistance(a, b);
  const dx = Math.abs(a.x - b.x);
  const dy = Math.abs(a.y - b.y);
  return Math.pow(Math.pow(dx, p) + Math.pow(dy, p), 1 / p);
}

export function magnitude(v: Vec2): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

export function cosineSimilarity(a: Vec2, b: Vec2): number {
  const denom = magnitude(a) * magnitude(b);
  if (denom === 0) return 0;
  return (a.x * b.x + a.y * b.y) / denom;
}

export function cosineDistance(a: Vec2, b: Vec2): number {
  return 1 - cosineSimilarity(a, b);
}

/**
 * Points on the boundary {v : minkowskiDistance(v, origin, p) === 1},
 * sampled by direction and solved for radius directly from the formula.
 */
export function minkowskiUnitBall(p: number, samples = 200): Vec2[] {
  const points: Vec2[] = [];
  for (let i = 0; i <= samples; i++) {
    const theta = (2 * Math.PI * i) / samples;
    const dir: Vec2 = { x: Math.cos(theta), y: Math.sin(theta) };
    const pNorm = Number.isFinite(p)
      ? Math.pow(Math.pow(Math.abs(dir.x), p) + Math.pow(Math.abs(dir.y), p), 1 / p)
      : Math.max(Math.abs(dir.x), Math.abs(dir.y));
    const r = pNorm === 0 ? 0 : 1 / pNorm;
    points.push({ x: dir.x * r, y: dir.y * r });
  }
  return points;
}

// --- Mahalanobis distance: distance that accounts for how the data is spread ---

export interface Covariance {
  varX: number;
  varY: number;
  covXY: number;
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

function gaussianSample(rng: () => number): number {
  const u1 = Math.max(rng(), 1e-12);
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/** A correlated point cloud — y tracks x with noise, so the "natural" spread of
 * the data is a diagonal ellipse, not a circle. */
export function makeCorrelatedCloud(count = 70, seed = 3): Vec2[] {
  const rng = makeRng(seed);
  const points: Vec2[] = [];
  for (let i = 0; i < count; i++) {
    const x = gaussianSample(rng) * 1.5;
    const y = 0.8 * x + gaussianSample(rng) * 0.6;
    points.push({ x, y });
  }
  return points;
}

export function mean(points: Vec2[]): Vec2 {
  const n = points.length;
  return {
    x: points.reduce((s, p) => s + p.x, 0) / n,
    y: points.reduce((s, p) => s + p.y, 0) / n,
  };
}

export function covariance(points: Vec2[], m: Vec2): Covariance {
  const n = points.length;
  let varX = 0;
  let varY = 0;
  let covXY = 0;
  for (const p of points) {
    const dx = p.x - m.x;
    const dy = p.y - m.y;
    varX += dx * dx;
    varY += dy * dy;
    covXY += dx * dy;
  }
  return { varX: varX / (n - 1), varY: varY / (n - 1), covXY: covXY / (n - 1) };
}

/** Mahalanobis distance from point to mean: sqrt((p-mean)^T * Cov^-1 * (p-mean)),
 * with the 2x2 inverse written out directly (no linear-algebra library). */
export function mahalanobisDistance(point: Vec2, m: Vec2, cov: Covariance): number {
  const det = cov.varX * cov.varY - cov.covXY * cov.covXY;
  const invA = cov.varY / det;
  const invB = -cov.covXY / det;
  const invD = cov.varX / det;
  const dx = point.x - m.x;
  const dy = point.y - m.y;
  const value = dx * dx * invA + 2 * dx * dy * invB + dy * dy * invD;
  return Math.sqrt(Math.max(0, value));
}

interface Eigen2x2 {
  l1: number;
  l2: number;
  v1: Vec2;
  v2: Vec2;
}

/** Closed-form eigenvalues/eigenvectors of a symmetric 2x2 matrix [[a,b],[b,d]] —
 * used to draw the Mahalanobis ellipse aligned with the data's principal axes. */
function eigen2x2(a: number, b: number, d: number): Eigen2x2 {
  const trace = a + d;
  const det = a * d - b * b;
  const disc = Math.sqrt(Math.max(0, (trace / 2) ** 2 - det));
  const l1 = trace / 2 + disc;
  const l2 = trace / 2 - disc;

  function eigenvector(lambda: number): Vec2 {
    if (Math.abs(b) > 1e-9) {
      const vx = b;
      const vy = lambda - a;
      const len = Math.hypot(vx, vy);
      return { x: vx / len, y: vy / len };
    }
    return a >= d ? { x: 1, y: 0 } : { x: 0, y: 1 };
  }

  return { l1, l2, v1: eigenvector(l1), v2: eigenvector(l2) };
}

/** Points on the ellipse {v : mahalanobisDistance(v, mean, cov) === r} — the
 * semi-axes are r*sqrt(eigenvalue), aligned with the covariance eigenvectors. */
export function mahalanobisEllipse(m: Vec2, cov: Covariance, r: number, samples = 100): Vec2[] {
  const { l1, l2, v1, v2 } = eigen2x2(cov.varX, cov.covXY, cov.varY);
  const a = r * Math.sqrt(Math.max(0, l1));
  const b = r * Math.sqrt(Math.max(0, l2));
  const points: Vec2[] = [];
  for (let i = 0; i <= samples; i++) {
    const theta = (2 * Math.PI * i) / samples;
    const cx = a * Math.cos(theta);
    const cy = b * Math.sin(theta);
    points.push({
      x: m.x + cx * v1.x + cy * v2.x,
      y: m.y + cx * v1.y + cy * v2.y,
    });
  }
  return points;
}
