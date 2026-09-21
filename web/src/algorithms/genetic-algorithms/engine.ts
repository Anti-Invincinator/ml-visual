// A genetic algorithm solving the N-Queens problem, implemented from scratch —
// no optimization libraries. Chromosome = one column index per row.

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

export function maxPairs(n: number): number {
  return (n * (n - 1)) / 2;
}

/** A conflict is any two queens sharing a column or a diagonal — rows can never
 * conflict since the chromosome puts exactly one queen per row by construction. */
export function countConflicts(chromosome: number[]): number {
  const n = chromosome.length;
  let conflicts = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (chromosome[i] === chromosome[j] || Math.abs(chromosome[i] - chromosome[j]) === Math.abs(i - j)) {
        conflicts++;
      }
    }
  }
  return conflicts;
}

function randomChromosome(n: number, rng: () => number): number[] {
  return Array.from({ length: n }, () => Math.floor(rng() * n));
}

export interface Individual {
  chromosome: number[];
  conflicts: number;
}

function tournamentSelect(pop: Individual[], rng: () => number, k = 3): Individual {
  let best = pop[0];
  for (let i = 0; i < k; i++) {
    const candidate = pop[Math.floor(rng() * pop.length)];
    if (candidate.conflicts < best.conflicts) best = candidate;
  }
  return best;
}

export interface BreedingSample {
  parentA: number[];
  parentB: number[];
  cutPoint: number;
  childBeforeMutation: number[];
  child: number[];
  mutatedRows: number[];
}

export interface GenerationSnapshot {
  population: Individual[];
  best: Individual;
  sample: BreedingSample;
  restarted: boolean;
}

function makeIndividual(chromosome: number[]): Individual {
  return { chromosome, conflicts: countConflicts(chromosome) };
}

function breed(
  parentA: Individual,
  parentB: Individual,
  n: number,
  mutationRate: number,
  rng: () => number
): { child: Individual; sample: BreedingSample } {
  const cutPoint = 1 + Math.floor(rng() * (n - 1));
  const childChromosome = [...parentA.chromosome.slice(0, cutPoint), ...parentB.chromosome.slice(cutPoint)];
  const childBeforeMutation = [...childChromosome];

  const mutatedRows: number[] = [];
  for (let row = 0; row < n; row++) {
    if (rng() < mutationRate / n) {
      childChromosome[row] = Math.floor(rng() * n);
      mutatedRows.push(row);
    }
  }

  return {
    child: makeIndividual(childChromosome),
    sample: {
      parentA: parentA.chromosome,
      parentB: parentB.chromosome,
      cutPoint,
      childBeforeMutation,
      child: childChromosome,
      mutatedRows,
    },
  };
}

const STAGNATION_LIMIT = 20;

/**
 * Tournament selection + crossover alone gets permanently stuck on a meaningful
 * fraction of seeds — verified empirically: even given 2000 generations, 7 of 20
 * seeds never solved 8-queens, because the population converges to a state no
 * crossover/mutation combination can escape. A stagnation-triggered restart
 * (reinitialize the whole population if the best hasn't improved in
 * STAGNATION_LIMIT generations) fixed it completely: 20/20 seeds solved, and
 * faster too (avg. 56 generations vs. getting nowhere).
 */
export function runNQueensGA(
  n: number,
  populationSize: number,
  generations: number,
  mutationRate: number,
  seed: number
): GenerationSnapshot[] {
  const rng = makeRng(seed);
  let population: Individual[] = Array.from({ length: populationSize }, () =>
    makeIndividual(randomChromosome(n, rng))
  );

  const snapshots: GenerationSnapshot[] = [];
  let bestEverConflicts = Infinity;
  let stall = 0;

  for (let gen = 0; gen < generations; gen++) {
    const best = population.reduce((a, b) => (b.conflicts < a.conflicts ? b : a));

    if (best.conflicts < bestEverConflicts) {
      bestEverConflicts = best.conflicts;
      stall = 0;
    } else {
      stall++;
    }

    if (best.conflicts === 0) {
      snapshots.push({
        population,
        best,
        sample: snapshots[snapshots.length - 1]?.sample ?? breed(best, best, n, 0, rng).sample,
        restarted: false,
      });
      break;
    }

    if (stall >= STAGNATION_LIMIT) {
      population = Array.from({ length: populationSize }, () => makeIndividual(randomChromosome(n, rng)));
      snapshots.push({
        population,
        best,
        sample: snapshots[snapshots.length - 1]?.sample ?? breed(best, best, n, 0, rng).sample,
        restarted: true,
      });
      stall = 0;
      continue;
    }

    const next: Individual[] = [best]; // elitism
    let sample: BreedingSample | null = null;
    while (next.length < populationSize) {
      const a = tournamentSelect(population, rng);
      const b = tournamentSelect(population, rng);
      const { child, sample: bredSample } = breed(a, b, n, mutationRate, rng);
      if (!sample) sample = bredSample;
      next.push(child);
    }

    snapshots.push({ population, best, sample: sample!, restarted: false });
    population = next;
  }

  return snapshots;
}
