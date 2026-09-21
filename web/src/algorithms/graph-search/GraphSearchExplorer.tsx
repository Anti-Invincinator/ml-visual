"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { bfs, dfs, generateMaze, type Cell, type Maze, type SearchResult } from "./engine";

const ROOMS = 10;
const CELL_PX = 16;
const EXTRA_LOOPS = 0.15;
const STEPS_PER_TICK = 3;
const TICK_MS = 40;

const START: Cell = { row: 1, col: 1 };

function drawMaze(
  canvas: HTMLCanvasElement,
  maze: Maze,
  result: SearchResult,
  goal: Cell,
  step: number,
  accentColor: string
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const size = maze.size * CELL_PX;
  ctx.clearRect(0, 0, size, size);

  for (let r = 0; r < maze.size; r++) {
    for (let c = 0; c < maze.size; c++) {
      ctx.fillStyle = maze.open[r][c] ? "#15151a" : "#050505";
      ctx.fillRect(c * CELL_PX, r * CELL_PX, CELL_PX - 1, CELL_PX - 1);
    }
  }

  const visitedCount = Math.min(step, result.visitedOrder.length);
  ctx.fillStyle = accentColor;
  ctx.globalAlpha = 0.55;
  for (let i = 0; i < visitedCount; i++) {
    const cell = result.visitedOrder[i];
    ctx.fillRect(cell.col * CELL_PX, cell.row * CELL_PX, CELL_PX - 1, CELL_PX - 1);
  }
  ctx.globalAlpha = 1;

  const finished = visitedCount >= result.visitedOrder.length;
  if (finished && result.path) {
    ctx.fillStyle = "#ffffff";
    for (const cell of result.path) {
      ctx.fillRect(cell.col * CELL_PX + 3, cell.row * CELL_PX + 3, CELL_PX - 7, CELL_PX - 7);
    }
  }

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(START.col * CELL_PX, START.row * CELL_PX, CELL_PX - 1, CELL_PX - 1);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.strokeRect(goal.col * CELL_PX + 1, goal.row * CELL_PX + 1, CELL_PX - 3, CELL_PX - 3);
}

function Panel({
  title,
  maze,
  result,
  goal,
  step,
  accentColor,
}: {
  title: string;
  maze: Maze;
  result: SearchResult;
  goal: Cell;
  step: number;
  accentColor: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pixelSize = maze.size * CELL_PX;

  useEffect(() => {
    if (canvasRef.current) drawMaze(canvasRef.current, maze, result, goal, step, accentColor);
  }, [maze, result, goal, step, accentColor]);

  const visitedCount = Math.min(step, result.visitedOrder.length);
  const finished = visitedCount >= result.visitedOrder.length;

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h3 className="font-mono text-[13px] text-[var(--ink-primary)]">{title}</h3>
        <span className="tabular font-mono text-[12px] text-[var(--ink-muted)]">
          {visitedCount} visited{finished && result.path ? ` · path ${result.path.length}` : ""}
        </span>
      </div>
      <canvas ref={canvasRef} width={pixelSize} height={pixelSize} className="mt-2 block" />
    </div>
  );
}

export default function GraphSearchExplorer() {
  const [seed, setSeed] = useState(1);
  const [step, setStep] = useState(0);

  const maze = useMemo(() => generateMaze(ROOMS, seed, EXTRA_LOOPS), [seed]);
  const goal: Cell = useMemo(() => ({ row: maze.size - 2, col: maze.size - 2 }), [maze]);
  const bfsResult = useMemo(() => bfs(maze, START, goal), [maze, goal]);
  const dfsResult = useMemo(() => dfs(maze, START, goal), [maze, goal]);

  const maxSteps = Math.max(bfsResult.visitedOrder.length, dfsResult.visitedOrder.length);

  useEffect(() => {
    if (step >= maxSteps) return;
    const id = setTimeout(() => setStep((s) => Math.min(s + STEPS_PER_TICK, maxSteps)), TICK_MS);
    return () => clearTimeout(id);
  }, [step, maxSteps]);

  function reshuffle() {
    setSeed((s) => s + 1);
    setStep(0);
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="text-[13px] text-[var(--ink-secondary)]">
        Same maze, same start and goal — the only difference is the frontier: BFS pulls from a queue (explore
        everything one step away before anything two steps away), DFS pulls from a stack (commit to one corridor
        as deep as it goes before backtracking). Filled cells are visited, in exploration order; white cells are
        the final path once each one reaches the goal.
      </p>
      <div className="grid grid-cols-1 gap-10 sm:grid-cols-2">
        <Panel title="breadth-first search" maze={maze} result={bfsResult} goal={goal} step={step} accentColor="#3987e5" />
        <Panel title="depth-first search" maze={maze} result={dfsResult} goal={goal} step={step} accentColor="#d95926" />
      </div>
      <button
        onClick={reshuffle}
        className="w-fit border border-[var(--hairline)] px-4 py-2 font-mono text-[13px] text-[var(--ink-primary)] transition-colors hover:bg-[var(--surface)]"
      >
        new maze
      </button>
    </div>
  );
}
