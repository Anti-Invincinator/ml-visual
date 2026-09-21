// Maze generation and graph search, implemented from scratch — no libraries.

export interface Cell {
  row: number;
  col: number;
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

export interface Maze {
  open: boolean[][]; // size x size, true = passable
  size: number;
}

/**
 * Recursive-backtracker maze generation — a randomized DFS over "rooms" that
 * carves a wall down whenever it steps into a new room. Produces a perfect maze
 * (a spanning tree: exactly one path between any two rooms), then knocks down a
 * fraction of the remaining walls to add loops — without loops, BFS and DFS would
 * always reconstruct the identical path (a tree has only one route between two
 * nodes), which would make them look far more alike than they actually are.
 */
export function generateMaze(rooms: number, seed: number, extraLoopFraction = 0.15): Maze {
  const size = 2 * rooms + 1;
  const open: boolean[][] = Array.from({ length: size }, () => new Array(size).fill(false));
  const rng = makeRng(seed);

  const roomCell = (r: number, c: number): [number, number] => [2 * r + 1, 2 * c + 1];

  const visited: boolean[][] = Array.from({ length: rooms }, () => new Array(rooms).fill(false));
  const stack: [number, number][] = [[0, 0]];
  visited[0][0] = true;
  const [sr, sc] = roomCell(0, 0);
  open[sr][sc] = true;

  const dirs: [number, number][] = [
    [0, 1],
    [1, 0],
    [0, -1],
    [-1, 0],
  ];

  while (stack.length > 0) {
    const [r, c] = stack[stack.length - 1];
    const options: [number, number, number, number][] = [];
    for (const [dr, dc] of dirs) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < rooms && nc >= 0 && nc < rooms && !visited[nr][nc]) {
        options.push([nr, nc, dr, dc]);
      }
    }
    if (options.length === 0) {
      stack.pop();
      continue;
    }
    const [nr, nc, dr, dc] = options[Math.floor(rng() * options.length)];
    const [cr, cc] = roomCell(r, c);
    open[cr + dr][cc + dc] = true;
    const [ncr, ncc] = roomCell(nr, nc);
    open[ncr][ncc] = true;
    visited[nr][nc] = true;
    stack.push([nr, nc]);
  }

  const wallCandidates: [number, number][] = [];
  for (let r = 0; r < rooms; r++) {
    for (let c = 0; c < rooms; c++) {
      const [cr, cc] = roomCell(r, c);
      if (c + 1 < rooms && !open[cr][cc + 1]) wallCandidates.push([cr, cc + 1]);
      if (r + 1 < rooms && !open[cr + 1][cc]) wallCandidates.push([cr + 1, cc]);
    }
  }
  for (let i = wallCandidates.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [wallCandidates[i], wallCandidates[j]] = [wallCandidates[j], wallCandidates[i]];
  }
  const numExtra = Math.floor(wallCandidates.length * extraLoopFraction);
  for (let i = 0; i < numExtra; i++) {
    const [wr, wc] = wallCandidates[i];
    open[wr][wc] = true;
  }

  return { open, size };
}

function neighbors(maze: Maze, cell: Cell): Cell[] {
  const result: Cell[] = [];
  for (const [dr, dc] of [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ] as const) {
    const row = cell.row + dr;
    const col = cell.col + dc;
    if (row >= 0 && row < maze.size && col >= 0 && col < maze.size && maze.open[row][col]) {
      result.push({ row, col });
    }
  }
  return result;
}

const key = (c: Cell) => `${c.row},${c.col}`;

function reconstructPath(cameFrom: Map<string, Cell>, start: Cell, goal: Cell): Cell[] | null {
  if (key(start) === key(goal)) return [start];
  if (!cameFrom.has(key(goal))) return null;
  const path: Cell[] = [goal];
  let cur = goal;
  while (key(cur) !== key(start)) {
    cur = cameFrom.get(key(cur))!;
    path.push(cur);
  }
  return path.reverse();
}

export interface SearchResult {
  visitedOrder: Cell[];
  path: Cell[] | null;
}

export function bfs(maze: Maze, start: Cell, goal: Cell): SearchResult {
  const queue: Cell[] = [start];
  const visitedOrder: Cell[] = [start];
  const cameFrom = new Map<string, Cell>();
  const seen = new Set<string>([key(start)]);

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (key(current) === key(goal)) break;
    for (const n of neighbors(maze, current)) {
      if (!seen.has(key(n))) {
        seen.add(key(n));
        cameFrom.set(key(n), current);
        visitedOrder.push(n);
        queue.push(n);
      }
    }
  }

  return { visitedOrder, path: reconstructPath(cameFrom, start, goal) };
}

export function dfs(maze: Maze, start: Cell, goal: Cell): SearchResult {
  const stack: Cell[] = [start];
  const visitedOrder: Cell[] = [];
  const cameFrom = new Map<string, Cell>();
  const seen = new Set<string>([key(start)]);

  while (stack.length > 0) {
    const current = stack.pop()!;
    visitedOrder.push(current);
    if (key(current) === key(goal)) break;
    for (const n of neighbors(maze, current)) {
      if (!seen.has(key(n))) {
        seen.add(key(n));
        cameFrom.set(key(n), current);
        stack.push(n);
      }
    }
  }

  return { visitedOrder, path: reconstructPath(cameFrom, start, goal) };
}
