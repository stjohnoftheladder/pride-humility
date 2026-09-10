// Game-wide constants, the pilgrimage map, and the byzantine palette.
// Layout: gate court -> chapel (confession/elder) -> U-turn along the bottom
// spine -> Tempter chamber -> Brother's cell -> Ladder chamber (Pride boss).

export const CELL = 3;            // world units per grid cell
export const WALL_H = 7;          // wall / ceiling height
export const VIEW_H = 1.62;       // eye height
export const PLAYER_R = 0.45;
export const GRAVITY = 24;
export const WALK_SPEED = 5.2;
export const RUN_SPEED = 8.4;
export const ACCEL = 60;
export const FRICTION = 12;

export const MAP_W = 34;
// The map grew south when the Port of Theodosius was added: rows 0-19 are the
// city, row 20 is the sea wall, rows 21-25 the quay, rows 26-30 the open sea.
export const MAP_H = 31;

// Byzantine Parchment Pixel palette (from byzantine/DESIGN-HANDOFF.md)
export const PALETTE = {
  bg: 0x120d07,
  surface: 0x1a140d,
  gold: 0xf3d276,
  goldDim: 0xc4a46c,
  text: 0xe8dcc8,
  accent: 0x8b6914,
  nightSky: 0x0a0812,
};

// Branch meters
export const PRIDE_MAX = 100;
export const GRACE_MAX = 100;
export const PLAYER_HP_MAX = 20;

// ---------------------------------------------------------------------------
// The Port of Theodosius — the harbour wing, off the bottom spine.
//
// Blueprint: `public/assets/design/port-theodosius-sketch.svg`, the sketch of the
// walled harbour — the seaward wall with its crenellated towers, a quay with
// bollards and grain cargo, lateen-rigged ships moored at the mole, and the
// great dome rising behind the wall. The sketch is an elevation, so it is read
// here as a plan: wall to the north, quay in front of it, sea to the south.
//
// The city's grain came ashore at this kind of quay (the Horrea Theodosiana
// stood by the harbour), which is why the walk is dressed with cargo rather
// than with an encounter — the wing carries atmosphere, not a threshold.
export const HARBOUR = {
  quay: { x: 2, y: 21, w: 30, h: 5 },   // walkable waterfront (grid cells)
  wallY: 20,                            // the crenellated sea wall band
  gateX: 14,                            // the sea gate through the wall
  stairY0: 14,                          // the stair down from the bottom spine
  sea: { y0: 26, y1: 30 },              // open water south of the quay
  wrapX: 2,                             // water wraps this many cells at each end
};

// ---------------------------------------------------------------------------
// Level builder
const F = '.';   // stone floor
const W = '#';   // wall
const SEA = 'W'; // open water (not walkable, rendered as sea)

function makeGrid(w, h, fill) {
  return Array.from({ length: h }, () => Array(w).fill(fill));
}

function carveRoom(g, x, y, w, h) {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) g[j][i] = F;
}

function carveRow(g, y, x0, x1) {
  for (let i = Math.min(x0, x1); i <= Math.max(x0, x1); i++) g[y][i] = F;
}

function carveCol(g, x, y0, y1) {
  for (let j = Math.min(y0, y1); j <= Math.max(y0, y1); j++) g[j][x] = F;
}

function buildLevelGrid() {
  const g = makeGrid(MAP_W, MAP_H, W);

  // --- rooms ---------------------------------------------------------------
  const court   = { x: 2, y: 2, w: 10, h: 5 };   // gate court (open sky)
  const chapel  = { x: 15, y: 2, w: 12, h: 6 };  // confession + elder
  const tempter = { x: 2, y: 14, w: 11, h: 5 };  // encounter 1
  const brother = { x: 15, y: 14, w: 10, h: 5 }; // encounter 2
  const ladder  = { x: 27, y: 14, w: 5, h: 5 };  // encounter 3 + Ladder gate

  for (const r of [court, chapel, tempter, brother, ladder]) carveRoom(g, r.x, r.y, r.w, r.h);

  // --- corridors (a gentle U) ----------------------------------------------
  carveRow(g, 4, 12, 14);          // court -> chapel
  carveCol(g, 20, 8, 13);          // chapel -> bottom spine
  carveRow(g, 13, 2, 31);          // bottom spine (tempter -> brother -> ladder)
  carveCol(g, 7, 7, 12);           // court -> bottom spine (left leg)

  // --- the Port of Theodosius (harbour wing, south of the spine) ------------
  // The stair drops from the bottom spine at the gap between the Tempter's
  // chamber and the Brother's cell, pierces the sea wall at the gate, and
  // opens onto the quay. Water fills the band beyond it and wraps both ends,
  // so the quay reads as a mole standing out into the Marmara.
  const { quay, wallY, gateX, stairY0, sea, wrapX } = HARBOUR;
  carveRoom(g, quay.x, quay.y, quay.w, quay.h);
  carveCol(g, gateX, stairY0, wallY);   // the stair + the sea gate
  for (let j = sea.y0; j <= sea.y1; j++) for (let i = 0; i < MAP_W; i++) g[j][i] = SEA;
  for (let j = quay.y; j < quay.y + quay.h; j++) {
    for (let i = 0; i < wrapX; i++) { g[j][i] = SEA; g[j][MAP_W - 1 - i] = SEA; }
  }

  // --- wood floors in chapel, brother's cell --------------------------------
  for (const [rx, ry, rw, rh] of [[chapel.x, chapel.y, chapel.w, chapel.h], [brother.x, brother.y, brother.w, brother.h]]) {
    for (let j = ry; j < ry + rh; j++) for (let i = rx; i < rx + rw; i++) if (g[j][i] === F) g[j][i] = '_';
  }

  const cells = new Map(); // 'i,j' -> tile
  const floorTiles = new Set(['.', '_']);
  const add = (x, y, t) => {
    if (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H) return;
    if (!floorTiles.has(g[y][x])) return;
    g[y][x] = t;
    cells.set(`${x},${y}`, t);
  };

  // --- key spots (placed first so decor can't claim their cells) ------------------
  add(6, 4, 'S');            // pilgrim start
  add(18, 5, 'E');           // elder (NPC)
  add(25, 4, 'A');           // confession altar
  add(7, 14, 'K');           // encounter 1 trigger (Tempter)
  add(20, 14, 'B');          // encounter 2 trigger (Brother)
  add(29, 14, 'P');          // encounter 3 trigger (Demon of Pride)
  add(30, 18, 'L');          // Ladder gate (goal)

  // --- icons / columns -----------------------------------------------------------
  // (no candles — the street is open air in daylight)

  // icons (banners) in chapel + court
  add(2, 2, 'V'); add(2, 6, 'V'); add(15, 2, 'V'); add(26, 2, 'V'); add(27, 14, 'V');
  add(15, 6, 'V'); add(26, 6, 'V'); add(30, 18, 'V');

  // columns
  add(5, 4, 'c'); add(18, 4, 'c'); add(28, 16, 'c'); add(31, 16, 'c');

  // fountain in the gate court + pews in the chapel
  add(9, 4, 'F');
  add(16, 3, 'w'); add(17, 3, 'w'); add(21, 3, 'w'); add(22, 3, 'w');
  add(16, 6, 'w'); add(17, 6, 'w');

  return { grid: g, cells, rooms: { court, chapel, tempter, brother, ladder, harbour: quay, seagate: { x: gateX, y: stairY0, w: 1, h: wallY - stairY0 + 1 } } };
}

export const LEVEL = buildLevelGrid();

export function validateLevel() {
  const problems = [];
  const { grid } = LEVEL;
  for (let j = 0; j < MAP_H; j++) if (grid[j].length !== MAP_W) problems.push(`row ${j} width ${grid[j].length}`);
  const counts = {};
  for (const row of grid) for (const t of row) counts[t] = (counts[t] || 0) + 1;
  for (const t of ['S', 'E', 'A', 'K', 'B', 'P', 'L']) if (!counts[t]) problems.push(`missing ${t}`);
  return { ok: problems.length === 0, problems, counts };
}
