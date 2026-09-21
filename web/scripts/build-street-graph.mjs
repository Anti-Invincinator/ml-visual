// One-time build tool: turns a raw OSM XML extract (from api.openstreetmap.org's
// /api/0.6/map endpoint) into a compact street graph for the graph-search page.
// Not part of the app bundle — run manually with `node scripts/build-street-graph.mjs`
// whenever the source extract or the road-type cost model changes.
//
// Real street network, not a procedural maze: West Village, Manhattan — chosen
// because its street grid genuinely breaks from the regular Manhattan grid
// (Bleecker, Christopher, Grove, Commerce, Barrow all run at odd angles), which
// makes the difference between search strategies visually obvious in a way a
// grid maze can't.

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAW_PATH = process.argv[2] ?? path.join(__dirname, "raw", "west-village.osm.xml");
const OUT_PATH = path.join(
  __dirname,
  "..",
  "src",
  "algorithms",
  "graph-search",
  "data",
  "street-graph.json"
);

// Road types we keep as traversable streets, and the speed (km/h) that models
// how "expensive" each is to travel — this is what makes Dijkstra/A* actually
// route differently from BFS/DFS instead of just re-deriving hop count.
const SPEED_KMH = {
  primary: 45,
  secondary: 35,
  tertiary: 30,
  unclassified: 28,
  residential: 25,
  living_street: 12,
  pedestrian: 8,
};

const xml = readFileSync(RAW_PATH, "utf-8");

function attr(tagText, name) {
  const m = tagText.match(new RegExp(`${name}="([^"]*)"`));
  return m ? m[1] : null;
}

// --- Parse <node id=".." lat=".." lon=".."/> -------------------------------
const nodes = new Map(); // id -> { lat, lon }
const nodeRe = /<node\b[^>]*\/?>/g;
for (const m of xml.matchAll(nodeRe)) {
  const tag = m[0];
  const id = attr(tag, "id");
  const lat = parseFloat(attr(tag, "lat"));
  const lon = parseFloat(attr(tag, "lon"));
  if (id && Number.isFinite(lat) && Number.isFinite(lon)) {
    nodes.set(id, { lat, lon });
  }
}

// --- Parse <way>...</way>, keep the ones tagged as a road we care about ----
const ways = [];
const wayRe = /<way\b[^>]*>([\s\S]*?)<\/way>/g;
for (const m of xml.matchAll(wayRe)) {
  const body = m[1];
  const highway = (body.match(/<tag\s+k="highway"\s+v="([^"]*)"/) ?? [])[1];
  if (!highway || !(highway in SPEED_KMH)) continue;
  const oneway = /<tag\s+k="oneway"\s+v="yes"/.test(body);
  const refs = [...body.matchAll(/<nd\s+ref="([^"]+)"/g)].map((r) => r[1]);
  if (refs.length < 2) continue;
  ways.push({ highway, oneway, refs });
}

console.log(`parsed ${nodes.size} nodes, ${ways.length} usable ways`);

// --- Fine-grained adjacency (every OSM node, every segment) ----------------
const fineAdj = new Map(); // id -> Map<neighborId, { distM, highway }>
function addFineEdge(a, b, highway) {
  const pa = nodes.get(a);
  const pb = nodes.get(b);
  if (!pa || !pb) return;
  const distM = haversine(pa.lat, pa.lon, pb.lat, pb.lon);
  if (!fineAdj.has(a)) fineAdj.set(a, new Map());
  fineAdj.get(a).set(b, { distM, highway });
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLon / 2);
  const a =
    s1 * s1 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * s2 * s2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

const wayCountForNode = new Map(); // id -> how many distinct ways touch it
for (const way of ways) {
  const seenInThisWay = new Set();
  for (const ref of way.refs) {
    if (!seenInThisWay.has(ref)) {
      wayCountForNode.set(ref, (wayCountForNode.get(ref) ?? 0) + 1);
      seenInThisWay.add(ref);
    }
  }
  for (let i = 0; i < way.refs.length - 1; i++) {
    const a = way.refs[i];
    const b = way.refs[i + 1];
    addFineEdge(a, b, way.highway);
    if (!way.oneway) addFineEdge(b, a, way.highway);
  }
}

// A node is a real intersection (a "junction") if more than one way touches
// it, or it's a dead end (only one fine-neighbor), or it's the endpoint of
// some way. Everything else is just a shape point describing a curve and
// collapses into the polyline of the edge that passes through it.
function isJunction(id) {
  const touchedByMultipleWays = (wayCountForNode.get(id) ?? 0) > 1;
  const neighborCount = fineAdj.get(id)?.size ?? 0;
  return touchedByMultipleWays || neighborCount !== 2;
}

const wayEndpoints = new Set();
for (const way of ways) {
  wayEndpoints.add(way.refs[0]);
  wayEndpoints.add(way.refs[way.refs.length - 1]);
}

function isGraphNode(id) {
  return isJunction(id) || wayEndpoints.has(id);
}

// --- Walk each fine edge out from every graph node to build simplified,
//     junction-to-junction edges with the full polyline preserved for
//     rendering. ------------------------------------------------------------
const visitedDirected = new Set(); // `${a}->${b}` fine steps already folded into an edge
const graphNodeIds = new Set([...fineAdj.keys()].filter(isGraphNode));

const edgesByPair = new Map(); // `${a}|${b}` (sorted) -> best edge, to dedupe parallel ways

function walkFrom(startId, firstNeighbor, highway) {
  const points = [nodes.get(startId)];
  let distM = 0;
  let prev = startId;
  let cur = firstNeighbor;
  let curHighway = highway;
  while (true) {
    const step = fineAdj.get(prev)?.get(cur);
    if (!step) return null;
    visitedDirected.add(`${prev}->${cur}`);
    distM += step.distM;
    points.push(nodes.get(cur));
    if (isGraphNode(cur)) {
      return { endId: cur, distM, points, highway: curHighway };
    }
    // continue through the shape point — it has exactly one "onward" neighbor
    const nextOptions = [...(fineAdj.get(cur)?.entries() ?? [])].filter(
      ([nid]) => nid !== prev
    );
    if (nextOptions.length !== 1) return null; // malformed / dead shape point, bail
    const [nextId, nextStep] = nextOptions[0];
    prev = cur;
    cur = nextId;
    curHighway = nextStep.highway;
  }
}

for (const a of graphNodeIds) {
  for (const [b, step] of fineAdj.get(a) ?? []) {
    if (visitedDirected.has(`${a}->${b}`)) continue;
    const walked = walkFrom(a, b, step.highway);
    if (!walked) continue;
    const key = a < walked.endId ? `${a}|${walked.endId}` : `${walked.endId}|${a}`;
    const existing = edgesByPair.get(key);
    // keep the shortest parallel connection if OSM has duplicate ways
    if (!existing || walked.distM < existing.distM) {
      edgesByPair.set(key, { a, b: walked.endId, distM: walked.distM, points: walked.points, highway: walked.highway });
    }
  }
}

// --- Keep only the largest connected component (search needs full reachability) ---
const adjacency = new Map();
for (const id of graphNodeIds) adjacency.set(id, []);
for (const e of edgesByPair.values()) {
  adjacency.get(e.a)?.push(e.b);
  adjacency.get(e.b)?.push(e.a);
}

function largestComponent() {
  const seen = new Set();
  let best = new Set();
  for (const start of graphNodeIds) {
    if (seen.has(start)) continue;
    const comp = new Set([start]);
    const stack = [start];
    seen.add(start);
    while (stack.length) {
      const cur = stack.pop();
      for (const nb of adjacency.get(cur) ?? []) {
        if (!seen.has(nb)) {
          seen.add(nb);
          comp.add(nb);
          stack.push(nb);
        }
      }
    }
    if (comp.size > best.size) best = comp;
  }
  return best;
}

const keepIds = largestComponent();

// --- Emit compact output -----------------------------------------------
const idList = [...keepIds];
const idIndex = new Map(idList.map((id, i) => [id, i]));

const outNodes = idList.map((id) => {
  const n = nodes.get(id);
  return [Math.round(n.lat * 1e6) / 1e6, Math.round(n.lon * 1e6) / 1e6];
});

const outEdges = [];
for (const e of edgesByPair.values()) {
  if (!keepIds.has(e.a) || !keepIds.has(e.b)) continue;
  const speed = SPEED_KMH[e.highway] ?? 20;
  const timeCost = e.distM / 1000 / speed; // hours — the "cost" for Dijkstra/A*
  outEdges.push({
    a: idIndex.get(e.a),
    b: idIndex.get(e.b),
    distM: Math.round(e.distM * 10) / 10,
    cost: Math.round(timeCost * 3600 * 100) / 100, // seconds, 2dp — travel time
    highway: e.highway,
    points: e.points.map((p) => [Math.round(p.lat * 1e6) / 1e6, Math.round(p.lon * 1e6) / 1e6]),
  });
}

const lats = outNodes.map((n) => n[0]);
const lons = outNodes.map((n) => n[1]);

const output = {
  place: "West Village, Manhattan, NYC",
  attribution: "© OpenStreetMap contributors, ODbL",
  bounds: { minLat: Math.min(...lats), maxLat: Math.max(...lats), minLon: Math.min(...lons), maxLon: Math.max(...lons) },
  nodes: outNodes, // [lat, lon][]
  edges: outEdges,
};

writeFileSync(OUT_PATH, JSON.stringify(output));
console.log(`wrote ${outNodes.length} nodes, ${outEdges.length} edges -> ${OUT_PATH}`);
console.log(`file size: ${(JSON.stringify(output).length / 1024).toFixed(1)} KB`);
