"use client";

import { useEffect, useMemo, useState } from "react";
import { Formula } from "@/components/formula";
import { maxPairs, runNQueensGA, type BreedingSample } from "./engine";

const POP_SIZE = 100;
const MAX_GENERATIONS = 300;
const MUTATION_RATE = 1.5;
const TICK_MS = 110;
const BOARD_PX = 352;

const PARENT_A_COLOR = "#3987e5";
const PARENT_B_COLOR = "#d95926";
const MUTATION_COLOR = "#9085e9";

function conflictPairs(chromosome: number[]): [number, number][] {
  const pairs: [number, number][] = [];
  for (let i = 0; i < chromosome.length; i++) {
    for (let j = i + 1; j < chromosome.length; j++) {
      if (chromosome[i] === chromosome[j] || Math.abs(chromosome[i] - chromosome[j]) === Math.abs(i - j)) {
        pairs.push([i, j]);
      }
    }
  }
  return pairs;
}

function Board({ n, chromosome }: { n: number; chromosome: number[] }) {
  const cell = BOARD_PX / n;
  const conflicts = conflictPairs(chromosome);
  const center = (row: number, col: number) => ({ x: col * cell + cell / 2, y: row * cell + cell / 2 });

  return (
    <svg viewBox={`0 0 ${BOARD_PX} ${BOARD_PX}`} width={BOARD_PX} height={BOARD_PX} className="block">
      {Array.from({ length: n }, (_, row) =>
        Array.from({ length: n }, (_, col) => (
          <rect
            key={`${row}-${col}`}
            x={col * cell}
            y={row * cell}
            width={cell}
            height={cell}
            fill={(row + col) % 2 === 0 ? "var(--surface)" : "var(--surface-raised)"}
          />
        ))
      )}
      {conflicts.map(([i, j], idx) => {
        const p0 = center(i, chromosome[i]);
        const p1 = center(j, chromosome[j]);
        return <line key={idx} x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y} stroke="var(--status-critical)" strokeWidth={2} opacity={0.85} />;
      })}
      {chromosome.map((col, row) => {
        const p = center(row, col);
        return (
          <text
            key={row}
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={cell * 0.62}
            fill="#ffffff"
          >
            ♛
          </text>
        );
      })}
    </svg>
  );
}

function GeneChip({
  value,
  origin,
  mutated,
}: {
  value: number;
  origin: "a" | "b" | null;
  mutated: boolean;
}) {
  const bg = origin === "a" ? PARENT_A_COLOR : origin === "b" ? PARENT_B_COLOR : "var(--surface)";
  return (
    <div
      className="relative flex h-7 w-7 items-center justify-center rounded font-mono text-[13px] text-white"
      style={{ background: bg, boxShadow: mutated ? `0 0 0 2px ${MUTATION_COLOR}` : undefined }}
    >
      {value}
    </div>
  );
}

function GeneticsPanel({ sample }: { sample: BreedingSample }) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="mb-1 font-mono text-[13px] text-[var(--ink-muted)]">parent A</p>
        <div className="flex gap-1">
          {sample.parentA.map((v, i) => (
            <GeneChip key={i} value={v} origin="a" mutated={false} />
          ))}
        </div>
      </div>
      <div>
        <p className="mb-1 font-mono text-[13px] text-[var(--ink-muted)]">parent B</p>
        <div className="flex gap-1">
          {sample.parentB.map((v, i) => (
            <GeneChip key={i} value={v} origin="b" mutated={false} />
          ))}
        </div>
      </div>
      <div>
        <p className="mb-1 font-mono text-[13px] text-[var(--ink-muted)]">
          child — crossover at row {sample.cutPoint}, mutated rows: {sample.mutatedRows.length ? sample.mutatedRows.join(", ") : "none"}
        </p>
        <div className="flex gap-1">
          {sample.child.map((v, i) => (
            <GeneChip key={i} value={v} origin={i < sample.cutPoint ? "a" : "b"} mutated={sample.mutatedRows.includes(i)} />
          ))}
        </div>
      </div>
      <p className="font-mono text-[13px] text-[var(--ink-muted)]">
        <span style={{ color: PARENT_A_COLOR }}>■</span> from parent A &nbsp;
        <span style={{ color: PARENT_B_COLOR }}>■</span> from parent B &nbsp;
        <span style={{ color: MUTATION_COLOR }}>◻</span> mutated after crossover
      </p>
    </div>
  );
}

export default function GeneticAlgorithmExplorer() {
  const [n, setN] = useState<4 | 8>(8);
  const [seed, setSeed] = useState(0);
  const [step, setStep] = useState(0);

  const snapshots = useMemo(() => runNQueensGA(n, POP_SIZE, MAX_GENERATIONS, MUTATION_RATE, seed), [n, seed]);

  useEffect(() => {
    if (step >= snapshots.length - 1) return;
    const id = setTimeout(() => setStep((s) => s + 1), TICK_MS);
    return () => clearTimeout(id);
  }, [step, snapshots.length]);

  function reshuffle() {
    setSeed((s) => s + 1);
    setStep(0);
  }

  function changeN(newN: 4 | 8) {
    setN(newN);
    setStep(0);
  }

  const current = snapshots[Math.min(step, snapshots.length - 1)];
  const solved = current.best.conflicts === 0;
  const mp = maxPairs(n);

  return (
    <div className="flex flex-col gap-10">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-[352px_1fr]">
        <div>
          <Board n={n} chromosome={current.best.chromosome} />
          <div className="mt-3 flex gap-2">
            {([4, 8] as const).map((size) => (
              <button
                key={size}
                onClick={() => changeN(size)}
                className={`border px-3 py-1.5 font-mono text-[14px] transition-colors ${
                  n === size
                    ? "border-[var(--accent)] text-[var(--accent)]"
                    : "border-[var(--hairline)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
                }`}
              >
                {size}-queens
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col justify-center gap-4">
          <p className="text-[15px] text-[var(--ink-secondary)]">
            Place {n} queens on a {n}×{n} board so none attack another — no two in the same column, no two on the
            same diagonal (rows are free: each queen owns one row by construction). Red lines mark every pair still
            attacking each other.
          </p>
          <div>
            <p className="mb-1 font-mono text-[14px] text-[var(--ink-secondary)]">fitness (pairs not attacking)</p>
            <Formula tex="f = \binom{n}{2} - \text{conflicts}" />
            <p className="tabular font-mono text-[15px] text-[var(--ink-primary)]">
              {mp} − {current.best.conflicts} = {mp - current.best.conflicts} / {mp}
              {solved && <span className="ml-2 text-[var(--status-good)]">solved</span>}
            </p>
          </div>
          <p className="font-mono text-[14px] text-[var(--ink-muted)]">
            generation {Math.min(step, snapshots.length - 1)}
            {solved ? " (converged)" : ` / ${MAX_GENERATIONS}`}
            {current.restarted && (
              <span className="ml-2 text-[var(--accent-secondary)]">— stuck, population restarted</span>
            )}
          </p>
          <button
            onClick={reshuffle}
            className="w-fit border border-[var(--hairline)] px-4 py-2 font-mono text-[15px] text-[var(--ink-primary)] transition-colors hover:bg-[var(--surface)]"
          >
            new seed
          </button>
        </div>
      </div>

      <div>
        <h3 className="text-[17px] font-medium text-[var(--ink-primary)]">The genetics, made visible</h3>
        <p className="mt-1 max-w-xl text-[15px] text-[var(--ink-secondary)]">
          Each chromosome is just an array — one column index per row. One representative breeding event from this
          generation: two parents chosen by tournament, spliced at a random cut point, then mutated.
        </p>
        <div className="mt-4">
          <GeneticsPanel sample={current.sample} />
        </div>
      </div>
    </div>
  );
}
