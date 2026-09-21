// Graph search on a real street network, implemented from scratch — no
// pathfinding or geo libraries. The graph itself (nodes, edges, distances,
// per-road-type travel-time costs) is pre-built once from real OpenStreetMap
// data by scripts/build-street-graph.mjs and shipped as static JSON; this
// module only implements the search algorithms that walk it.

import streetGraphData from "./data/street-graph.json";

export interface StreetEdge {
  a: number;
  b: number;
  distM: number;
  cost: number; // seconds of travel time, modeled from road type + distance
  highway: string;
  points: [number, number][]; // [lat, lon] polyline, a to b
}

export interface StreetGraphData {
  place: string;
  attribution: string;
  bounds: { minLat: number; maxLat: number; minLon: number; maxLon: number };
  nodes: [number, number][]; // [lat, lon]
  edges: StreetEdge[];
}

interface AdjEntry {
  to: number;
  distM: number;
  cost: number;
  highway: string;
}

export interface Graph {
  data: StreetGraphData;
  adjacency: AdjEntry[][];
  edgeLookup: Map<string, StreetEdge>;
}

const pairKey = (a: number, b: number) => (a < b ? `${a}|${b}` : `${b}|${a}`);

export function buildGraph(data: StreetGraphData): Graph {
  const adjacency: AdjEntry[][] = data.nodes.map(() => []);
  const edgeLookup = new Map<string, StreetEdge>();
  for (const e of data.edges) {
    adjacency[e.a].push({ to: e.b, distM: e.distM, cost: e.cost, highway: e.highway });
    adjacency[e.b].push({ to: e.a, distM: e.distM, cost: e.cost, highway: e.highway });
    edgeLookup.set(pairKey(e.a, e.b), e);
  }
  return { data, adjacency, edgeLookup };
}

export const streetGraph = buildGraph(streetGraphData as StreetGraphData);

// The fastest road speed the cost model uses (see build-street-graph.mjs) —
// straight-line distance divided by this speed can never overestimate real
// travel time, which is what keeps A*'s heuristic admissible.
const MAX_SPEED_KMH = 45;

function haversineMeters(a: [number, number], b: [number, number]): number {
  const R = 6371000;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLon = ((b[1] - a[1]) * Math.PI) / 180;
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLon / 2);
  const h =
    s1 * s1 +
    Math.cos((a[0] * Math.PI) / 180) * Math.cos((b[0] * Math.PI) / 180) * s2 * s2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function heuristicSeconds(graph: Graph, nodeId: number, goalId: number): number {
  const distM = haversineMeters(graph.data.nodes[nodeId], graph.data.nodes[goalId]);
  return (distM / 1000 / MAX_SPEED_KMH) * 3600;
}

export interface SearchResult {
  visitedOrder: number[];
  /** The edge (parent -> node) used to reach visitedOrder[i], null at i=0 (the start).
   * Lets the UI light up streets as they're discovered, not just nodes. */
  edgesOrder: (number | null)[];
  path: number[] | null;
}

export function bfs(graph: Graph, start: number, goal: number): SearchResult {
  const queue: number[] = [start];
  const visitedOrder: number[] = [start];
  const edgesOrder: (number | null)[] = [null];
  const cameFrom = new Map<number, number>();
  const seen = new Set<number>([start]);

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === goal) break;
    for (const { to } of graph.adjacency[current]) {
      if (!seen.has(to)) {
        seen.add(to);
        cameFrom.set(to, current);
        visitedOrder.push(to);
        edgesOrder.push(current);
        queue.push(to);
      }
    }
  }

  return { visitedOrder, edgesOrder, path: reconstructPath(cameFrom, start, goal) };
}

export function dfs(graph: Graph, start: number, goal: number): SearchResult {
  const stack: number[] = [start];
  const visitedOrder: number[] = [];
  const edgesOrder: (number | null)[] = [];
  const cameFrom = new Map<number, number>();
  const seen = new Set<number>([start]);

  while (stack.length > 0) {
    const current = stack.pop()!;
    visitedOrder.push(current);
    edgesOrder.push(cameFrom.get(current) ?? null);
    if (current === goal) break;
    for (const { to } of graph.adjacency[current]) {
      if (!seen.has(to)) {
        seen.add(to);
        cameFrom.set(to, current);
        stack.push(to);
      }
    }
  }

  return { visitedOrder, edgesOrder, path: reconstructPath(cameFrom, start, goal) };
}

interface FrontierEntry {
  node: number;
  priority: number;
}

/** Linear-scan extract-min — a real priority queue (binary heap) would be
 * faster, but this graph tops out in the hundreds of nodes, so O(n) per pop
 * is fine and this is far simpler to get right from scratch. */
function popMin(frontier: FrontierEntry[]): FrontierEntry {
  let bestIdx = 0;
  for (let i = 1; i < frontier.length; i++) {
    if (frontier[i].priority < frontier[bestIdx].priority) bestIdx = i;
  }
  return frontier.splice(bestIdx, 1)[0];
}

/**
 * Greedy Best-First, Dijkstra, and A* are all the same algorithm — expand the
 * frontier node with the lowest priority, relax neighbors, repeat — differing
 * only in how priority is computed from the cost-so-far (g) and the node itself:
 *   Greedy:   priority = h(n)          — ignores accumulated cost entirely
 *   Dijkstra: priority = g(n)          — ignores the heuristic entirely
 *   A*:       priority = g(n) + h(n)   — both, which is what makes it optimal
 *                                          *and* efficient
 */
function weightedSearch(
  graph: Graph,
  start: number,
  goal: number,
  priorityFn: (g: number, node: number) => number
): SearchResult {
  const gScore = new Map<number, number>([[start, 0]]);
  const cameFrom = new Map<number, number>();
  const visitedOrder: number[] = [];
  const edgesOrder: (number | null)[] = [];
  const closed = new Set<number>();
  const frontier: FrontierEntry[] = [{ node: start, priority: priorityFn(0, start) }];

  while (frontier.length > 0) {
    const { node: current } = popMin(frontier);
    if (closed.has(current)) continue;
    closed.add(current);
    visitedOrder.push(current);
    edgesOrder.push(cameFrom.get(current) ?? null);
    if (current === goal) break;

    const currentG = gScore.get(current)!;
    for (const { to, cost } of graph.adjacency[current]) {
      const tentativeG = currentG + cost;
      if (tentativeG < (gScore.get(to) ?? Infinity)) {
        gScore.set(to, tentativeG);
        cameFrom.set(to, current);
        frontier.push({ node: to, priority: priorityFn(tentativeG, to) });
      }
    }
  }

  return { visitedOrder, edgesOrder, path: reconstructPath(cameFrom, start, goal) };
}

export function greedyBestFirst(graph: Graph, start: number, goal: number): SearchResult {
  return weightedSearch(graph, start, goal, (_g, node) => heuristicSeconds(graph, node, goal));
}

export function dijkstra(graph: Graph, start: number, goal: number): SearchResult {
  return weightedSearch(graph, start, goal, (g) => g);
}

export function aStar(graph: Graph, start: number, goal: number): SearchResult {
  return weightedSearch(graph, start, goal, (g, node) => g + heuristicSeconds(graph, node, goal));
}

export interface PathStats {
  seconds: number;
  meters: number;
}

export function pathStats(graph: Graph, path: number[] | null): PathStats {
  if (!path) return { seconds: 0, meters: 0 };
  let seconds = 0;
  let meters = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const edge = graph.edgeLookup.get(pairKey(path[i], path[i + 1]));
    if (!edge) continue;
    seconds += edge.cost;
    meters += edge.distM;
  }
  return { seconds, meters };
}

function reconstructPath(cameFrom: Map<number, number>, start: number, goal: number): number[] | null {
  if (start === goal) return [start];
  if (!cameFrom.has(goal)) return null;
  const path: number[] = [goal];
  let cur = goal;
  while (cur !== start) {
    cur = cameFrom.get(cur)!;
    path.push(cur);
  }
  return path.reverse();
}

export function nearestNode(graph: Graph, lat: number, lon: number): number {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < graph.data.nodes.length; i++) {
    const d = haversineMeters([lat, lon], graph.data.nodes[i]);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}
