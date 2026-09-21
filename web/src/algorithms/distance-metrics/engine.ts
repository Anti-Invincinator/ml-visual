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
