// Simulated annealing, implemented from scratch — no optimization libraries.
// Compared against plain gradient descent from the same starting point.

export interface Point {
  x: number;
  y: number;
}

// Rastrigin function — same multi-modal benchmark used in the genetic-algorithms module.
const A = 10;
export function rastrigin(x: number, y: number): number {
  return 2 * A + (x * x - A * Math.cos(2 * Math.PI * x)) + (y * y - A * Math.cos(2 * Math.PI * y));
}

export function rastriginGradient(x: number, y: number): Point {
  return {
    x: 2 * x + 2 * Math.PI * A * Math.sin(2 * Math.PI * x),
    y: 2 * y + 2 * Math.PI * A * Math.sin(2 * Math.PI * y),
  };
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

export function runGradientDescent(start: Point, lr: number, steps: number): Point[] {
  const path: Point[] = [start];
  let p = { ...start };
  for (let i = 0; i < steps; i++) {
    const g = rastriginGradient(p.x, p.y);
    p = { x: p.x - lr * g.x, y: p.y - lr * g.y };
    path.push(p);
  }
  return path;
}

export interface SAStep {
  point: Point;
  temperature: number;
  acceptedWorse: boolean;
}

/**
 * Metropolis acceptance: always take a downhill move; take an uphill move with
 * probability exp(-delta / temperature), so worse moves get rarer as it cools.
 * Temperature decays smoothly from t0 to tFinal over the full run (geometric in
 * log-space) rather than a fixed per-step multiplier, so it never "freezes" early
 * regardless of how many steps are requested.
 */
export function runSimulatedAnnealing(
  start: Point,
  steps: number,
  t0: number,
  tFinal: number,
  stepScale: number,
  seed: number,
  bound: number
): SAStep[] {
  const rng = makeRng(seed);
  const coolingRate = Math.pow(tFinal / t0, 1 / steps);
  const clamp = (v: number) => Math.max(-bound, Math.min(bound, v));

  let current = { ...start };
  let currentVal = rastrigin(current.x, current.y);
  let temperature = t0;

  const history: SAStep[] = [{ point: current, temperature, acceptedWorse: false }];

  for (let i = 0; i < steps; i++) {
    // An unbounded random walk will eventually wander past any fixed viewport —
    // clamp proposals to the visible domain (a standard constrained-SA technique).
    const proposal: Point = {
      x: clamp(current.x + gaussian(rng) * stepScale),
      y: clamp(current.y + gaussian(rng) * stepScale),
    };
    const proposalVal = rastrigin(proposal.x, proposal.y);
    const delta = proposalVal - currentVal;
    let acceptedWorse = false;

    if (delta < 0 || rng() < Math.exp(-delta / temperature)) {
      if (delta >= 0) acceptedWorse = true;
      current = proposal;
      currentVal = proposalVal;
    }

    temperature *= coolingRate;
    history.push({ point: current, temperature, acceptedWorse });
  }

  return history;
}
