// K-means clustering (Lloyd's algorithm), implemented from scratch — no ML libraries.

export interface Point {
  x: number;
  y: number;
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

/** Three Gaussian blobs — the "true" clusters an ideal init would find. */
export function makeBlobs(perCluster = 25, seed = 5): Point[] {
  const rng = makeRng(seed);
  const centers: Point[] = [
    { x: -1.1, y: 0.7 },
    { x: 1.2, y: 0.8 },
    { x: 0.05, y: -1.2 },
  ];
  const points: Point[] = [];
  for (const c of centers) {
    for (let i = 0; i < perCluster; i++) {
      points.push({ x: c.x + gaussian(rng) * 0.32, y: c.y + gaussian(rng) * 0.32 });
    }
  }
  return points;
}

function squaredDistance(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

export function randomInit(points: Point[], k: number, seed: number): Point[] {
  const rng = makeRng(seed);
  const indices = points.map((_, i) => i);
  // Fisher-Yates shuffle, then take the first k — sampling without replacement.
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices.slice(0, k).map((i) => ({ ...points[i] }));
}

/** k-means++: each new centroid is picked with probability proportional to its
 * squared distance from the nearest centroid already chosen — spreads centroids
 * out instead of letting them cluster randomly close together. */
export function kmeansPlusPlusInit(points: Point[], k: number, seed: number): Point[] {
  const rng = makeRng(seed);
  const centroids: Point[] = [{ ...points[Math.floor(rng() * points.length)] }];

  while (centroids.length < k) {
    const distances = points.map((p) => Math.min(...centroids.map((c) => squaredDistance(p, c))));
    const total = distances.reduce((a, b) => a + b, 0);
    let threshold = rng() * total;
    let chosen = points[points.length - 1];
    for (let i = 0; i < points.length; i++) {
      threshold -= distances[i];
      if (threshold <= 0) {
        chosen = points[i];
        break;
      }
    }
    centroids.push({ ...chosen });
  }
  return centroids;
}

export function assignClusters(points: Point[], centroids: Point[]): number[] {
  return points.map((p) => {
    let best = 0;
    let bestDist = Infinity;
    centroids.forEach((c, i) => {
      const d = squaredDistance(p, c);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    return best;
  });
}

export function computeCentroids(points: Point[], assignments: number[], previous: Point[]): Point[] {
  return previous.map((prevCentroid, k) => {
    const members = points.filter((_, i) => assignments[i] === k);
    if (members.length === 0) return prevCentroid; // empty cluster — leave it stranded, don't crash
    const x = members.reduce((sum, p) => sum + p.x, 0) / members.length;
    const y = members.reduce((sum, p) => sum + p.y, 0) / members.length;
    return { x, y };
  });
}

export function inertia(points: Point[], assignments: number[], centroids: Point[]): number {
  return points.reduce((sum, p, i) => sum + squaredDistance(p, centroids[assignments[i]]), 0);
}

export interface Snapshot {
  centroids: Point[];
  assignments: number[];
  inertia: number;
}

export function buildTrajectory(points: Point[], initCentroids: Point[], maxIterations = 10): Snapshot[] {
  let centroids = initCentroids.map((c) => ({ ...c }));
  let assignments = assignClusters(points, centroids);
  const snapshots: Snapshot[] = [{ centroids, assignments, inertia: inertia(points, assignments, centroids) }];

  for (let iter = 0; iter < maxIterations; iter++) {
    const nextCentroids = computeCentroids(points, assignments, centroids);
    const nextAssignments = assignClusters(points, nextCentroids);
    const moved = nextCentroids.some((c, i) => squaredDistance(c, centroids[i]) > 1e-8);
    centroids = nextCentroids;
    assignments = nextAssignments;
    snapshots.push({ centroids, assignments, inertia: inertia(points, assignments, centroids) });
    if (!moved) break;
  }
  return snapshots;
}
