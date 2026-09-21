"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  aStar,
  bfs,
  dfs,
  dijkstra,
  greedyBestFirst,
  nearestNode,
  pathStats,
  streetGraph,
  type Graph,
  type SearchResult,
} from "./engine";

const WIDTH = 640;
const STEPS_PER_TICK = 4;
const TICK_MS = 30;

const ALGORITHMS = [
  { key: "bfs", label: "BFS", color: "#3987e5", run: bfs, costAware: false },
  { key: "dfs", label: "DFS", color: "#d95926", run: dfs, costAware: false },
  { key: "greedy", label: "Greedy", color: "#199e70", run: greedyBestFirst, costAware: false },
  { key: "astar", label: "A-star", color: "#9085e9", run: aStar, costAware: true },
  { key: "dijkstra", label: "Dijkstra", color: "#c98500", run: dijkstra, costAware: true },
] as const;

type AlgoKey = (typeof ALGORITHMS)[number]["key"];

// Equirectangular projection scaled to the extract's bounding box, with the
// longitude axis corrected by cos(latitude) so streets keep their real shape
// instead of stretching — without this, West Village's diagonal streets would
// render at the wrong angle.
function makeProjection(graph: Graph, width: number) {
  const { minLat, maxLat, minLon, maxLon } = graph.data.bounds;
  const midLatRad = ((minLat + maxLat) / 2) * (Math.PI / 180);
  const lonScale = Math.cos(midLatRad);
  const lonSpan = (maxLon - minLon) * lonScale;
  const latSpan = maxLat - minLat;
  const height = Math.round((width * latSpan) / lonSpan);

  function project(lat: number, lon: number): [number, number] {
    const x = ((lon - minLon) * lonScale) / lonSpan * width;
    const y = ((maxLat - lat) / latSpan) * height;
    return [Math.round(x * 100) / 100, Math.round(y * 100) / 100];
  }

  function unproject(x: number, y: number): [number, number] {
    const lon = (x / width) * lonSpan / lonScale + minLon;
    const lat = maxLat - (y / height) * latSpan;
    return [lat, lon];
  }

  return { width, height, project, unproject };
}

type Projection = ReturnType<typeof makeProjection>;

function draw(
  canvas: HTMLCanvasElement,
  graph: Graph,
  proj: Projection,
  result: SearchResult,
  start: number,
  goal: number,
  step: number,
  accentColor: string
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, proj.width, proj.height);

  // Base street network, dim.
  ctx.strokeStyle = "#201f22";
  ctx.lineWidth = 1.5;
  for (const edge of graph.data.edges) {
    ctx.beginPath();
    edge.points.forEach(([lat, lon], i) => {
      const [x, y] = proj.project(lat, lon);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }

  // Discovered edges, revealed progressively as the algorithm explores.
  const shown = Math.min(step, result.visitedOrder.length);
  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.6;
  for (let i = 1; i < shown; i++) {
    const parent = result.edgesOrder[i];
    if (parent === null) continue;
    const child = result.visitedOrder[i];
    const edge = graph.edgeLookup.get(parent < child ? `${parent}|${child}` : `${child}|${parent}`);
    if (!edge) continue;
    ctx.beginPath();
    edge.points.forEach(([lat, lon], j) => {
      const [x, y] = proj.project(lat, lon);
      if (j === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Final path, once the animation has caught up.
  const finished = shown >= result.visitedOrder.length;
  if (finished && result.path) {
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3.5;
    ctx.shadowColor = "#ffffff";
    ctx.shadowBlur = 6;
    for (let i = 0; i < result.path.length - 1; i++) {
      const a = result.path[i];
      const b = result.path[i + 1];
      const edge = graph.edgeLookup.get(a < b ? `${a}|${b}` : `${b}|${a}`);
      if (!edge) continue;
      ctx.beginPath();
      edge.points.forEach(([lat, lon], j) => {
        const [x, y] = proj.project(lat, lon);
        if (j === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
  }

  const [sx, sy] = proj.project(...graph.data.nodes[start]);
  const [gx, gy] = proj.project(...graph.data.nodes[goal]);

  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(sx, sy, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(gx, gy, 6, 0, Math.PI * 2);
  ctx.stroke();
}

export default function GraphSearchExplorer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const graph = streetGraph;
  const proj = useMemo(() => makeProjection(graph, WIDTH), [graph]);

  const defaultStart = useMemo(() => nearestNode(graph, graph.data.bounds.minLat + 0.001, graph.data.bounds.minLon + 0.001), [graph]);
  const defaultGoal = useMemo(() => nearestNode(graph, graph.data.bounds.maxLat - 0.001, graph.data.bounds.maxLon - 0.001), [graph]);

  const [algo, setAlgo] = useState<AlgoKey>("bfs");
  const [start, setStart] = useState(defaultStart);
  const [goal, setGoal] = useState(defaultGoal);
  const [placing, setPlacing] = useState<"start" | "goal" | null>(null);
  const [step, setStep] = useState(0);

  const active = ALGORITHMS.find((a) => a.key === algo)!;
  const result = useMemo(() => active.run(graph, start, goal), [graph, start, goal, active]);

  useEffect(() => {
    if (step >= result.visitedOrder.length) return;
    const id = setTimeout(() => setStep((s) => Math.min(s + STEPS_PER_TICK, result.visitedOrder.length)), TICK_MS);
    return () => clearTimeout(id);
  }, [step, result]);

  useEffect(() => {
    if (canvasRef.current) draw(canvasRef.current, graph, proj, result, start, goal, step, active.color);
  }, [graph, proj, result, start, goal, step, active.color]);

  function handleCanvasClick(evt: React.PointerEvent<HTMLCanvasElement>) {
    if (!placing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((evt.clientX - rect.left) / rect.width) * proj.width;
    const y = ((evt.clientY - rect.top) / rect.height) * proj.height;
    const [lat, lon] = proj.unproject(x, y);
    const node = nearestNode(graph, lat, lon);
    if (placing === "start") setStart(node);
    else setGoal(node);
    setPlacing(null);
    setStep(0);
  }

  function selectAlgo(key: AlgoKey) {
    setAlgo(key);
    setStep(0);
  }

  const visitedCount = Math.min(step, result.visitedOrder.length);
  const finished = visitedCount >= result.visitedOrder.length;
  const stats = finished ? pathStats(graph, result.path) : null;

  return (
    <div className="flex flex-col gap-6">
      <p className="text-[15px] text-[var(--ink-secondary)]">
        This is the real street network of {graph.data.place} — every intersection and block face is
        an actual OpenStreetMap node. Each street&apos;s cost is modeled as travel time (distance ÷ a
        speed that depends on road type), so a cost-aware algorithm genuinely prefers a longer stretch
        of avenue over a short cut down a slow residential block, exactly like a real routing engine.
      </p>

      <div className="flex flex-wrap gap-2">
        {ALGORITHMS.map((a) => (
          <button
            key={a.key}
            onClick={() => selectAlgo(a.key)}
            className={`border px-3 py-1.5 font-mono text-[14px] transition-colors ${
              algo === a.key ? "text-white" : "border-[var(--hairline)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
            }`}
            style={algo === a.key ? { borderColor: a.color, color: a.color } : undefined}
          >
            {a.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-[auto_1fr]">
        <div>
          <canvas
            ref={canvasRef}
            width={proj.width}
            height={proj.height}
            onPointerDown={handleCanvasClick}
            className={placing ? "cursor-crosshair" : ""}
            style={{ maxWidth: "100%", height: "auto" }}
          />
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => setPlacing(placing === "start" ? null : "start")}
              className={`border px-3 py-1.5 font-mono text-[14px] transition-colors ${
                placing === "start" ? "border-[var(--accent)] text-[var(--accent)]" : "border-[var(--hairline)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
              }`}
            >
              {placing === "start" ? "click the map…" : "set start"}
            </button>
            <button
              onClick={() => setPlacing(placing === "goal" ? null : "goal")}
              className={`border px-3 py-1.5 font-mono text-[14px] transition-colors ${
                placing === "goal" ? "border-[var(--accent)] text-[var(--accent)]" : "border-[var(--hairline)] text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
              }`}
            >
              {placing === "goal" ? "click the map…" : "set goal"}
            </button>
          </div>
          <p className="mt-2 font-mono text-[12px] text-[var(--ink-muted)]">{graph.data.attribution}</p>
        </div>

        <div className="flex flex-col justify-center gap-3">
          <dl className="border border-[var(--hairline)]">
            <div className="flex items-center justify-between border-b border-[var(--hairline)] px-4 py-3">
              <dt className="text-[15px] text-[var(--ink-secondary)]">intersections visited</dt>
              <dd className="tabular font-mono text-[17px] text-[var(--ink-primary)]">{visitedCount}</dd>
            </div>
            <div className="flex items-center justify-between border-b border-[var(--hairline)] px-4 py-3">
              <dt className="text-[15px] text-[var(--ink-secondary)]">route distance</dt>
              <dd className="tabular font-mono text-[17px] text-[var(--ink-primary)]">
                {stats ? `${(stats.meters / 1000).toFixed(2)} km` : result.path === null && finished ? "no path" : "—"}
              </dd>
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <dt className="flex items-center gap-2 text-[15px] text-[var(--ink-secondary)]">
                travel time
                {active.costAware && (
                  <span className="text-[12px] text-[var(--status-good)]">optimal</span>
                )}
              </dt>
              <dd className="tabular font-mono text-[17px] text-[var(--ink-primary)]">
                {stats ? `${Math.round(stats.seconds)}s` : "—"}
              </dd>
            </div>
          </dl>
          <p className="font-mono text-[13px] text-[var(--ink-muted)]">
            {active.costAware
              ? "This algorithm accounts for real travel time — it will take a longer route down a faster street if that's actually quicker."
              : active.key === "greedy"
                ? "Greedy only chases straight-line distance to the goal — it will walk down a slow residential block if that looks closest on the map."
                : "This algorithm counts intersections, not time — it has no idea some streets are faster than others."}
          </p>
        </div>
      </div>
    </div>
  );
}
