// Game-wide constants, the pilgrimage map, and the byzantine palette.
// Layout, north to south: the gate court -> the main road running south -> the
// bottom spine, which opens west onto the Tempter's chamber and east onto the
// Brother's cell -> the Ladder chamber (Pride boss + Ladder gate) -> the chapel
// (confession + elder) at the foot of the road.
//
// REVIEW NOTE (map restructure): walking the road south from the court, the
// Ladder chamber turns off at y98 and the chapel is not reached until y108, so
// the Ladder gate can fire before the elder and the confession. In the older
// U-shaped map the chapel came first. Left as laid out here; swapping the two
// chambers is a separate call.

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
// The road runs the length of the city: the gate court sits at rows 2-6 and
// the chapel at the far south of the map.
export const MAP_H = 128;

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
// Feature flags — work in progress, shipped ON.
//
// A dev takes an addition out of the world by setting its flag to false here
// and reloading. The flag is read once, at map-build time, so it decides what is
// carved into the grid, what geometry is built and what blocks the pilgrim, all
// from this one place. The ?debug build also flips these live (see the feature
// keys in main.js) for walking the alternatives side by side; a live flip shows
// and hides the addition and stops it blocking, while the ground plan it
// claimed stays carved until the next reload.
export const FEATURES = {
  // three candidate sites for the one port (see HARBOURS)
  harbourWest: true,
  harbourEast: true,
  harbourSouth: true,
  // the monumental quarter around Hagia Sophia (see SITES)
  augustaion: true,
  milion: true,
  chalke: true,
  zeuxippus: true,
  cistern: true,
  hagiaEirene: true,
};

// ---------------------------------------------------------------------------
// The Port of Theodosius — the harbour wing.
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
//
// Where a wing sits is entirely its own block: the sea wall band it claims, the
// quay, the sea, and which of the quay's ends the water wraps. level.js derives
// every mesh, collider and prop position from it (props by fraction of the
// quay's width), so a wing can be sited anywhere without touching the geometry
// code.
//
// Three candidate sites are built at once for now, so they can be walked and
// compared side by side rather than argued about on paper; each is behind its
// own flag. West and east hang off the bottom spine on either side of the road
// (the road becomes a causeway between their two seas); south sits at the foot
// of the road, in the rows the long map otherwise leaves empty below the chapel.
// Data first, then the two lists the rest of the code reads: what is BUILT
// (filtered by the flags) and what the HUD INDEX lists (everything, so a dev can
// see what is switched off).
const WING_DATA = [
  {
    id: 'harbourWest',
    label: 'WEST',                          // wayfinding: "THE PORT · WEST"
    quay: { x: 2, y: 21, w: 13, h: 5 },     // walkable waterfront -> cells x2..14
    wall: { x0: 0, x1: 14, y: 20 },         // the crenellated sea wall band
    gateX: 14,                              // the sea gate through the wall
    stairY0: 14,                            // the stair down from the bottom spine
    sea: { x0: 0, x1: 14, y0: 26, y1: 30 }, // open water beyond the quay
    wrap: { west: 2, east: 0 },             // cells of water wrapping each quay end
    note: 'The city’s grain came ashore at a quay like this one, under the sea wall’s towers — the Horrea Theodosiana stood by the harbour, which is why the walk is dressed with cargo rather than with an encounter. Built from the sketch of the walled harbour, read as a plan. This site hangs off the bottom spine west of the road.',
  },
  {
    id: 'harbourEast',
    label: 'EAST',
    quay: { x: 20, y: 21, w: 12, h: 5 },    // -> cells x20..31
    wall: { x0: 20, x1: 33, y: 20 },
    gateX: 20,
    stairY0: 14,
    sea: { x0: 20, x1: 33, y0: 26, y1: 30 },
    wrap: { west: 0, east: 2 },
    note: 'The same harbour, sited east of the road: with the west site built too, the road runs out between two seas, a quay and a sea wall on either hand. The grain quays, the Horrea and the moored ships are the city’s, not this corner’s.',
  },
  {
    id: 'harbourSouth',
    label: 'SOUTH',
    quay: { x: 2, y: 116, w: 30, h: 5 },        // -> cells x2..31, at the road's foot
    wall: { x0: 0, x1: 33, y: 115 },
    gateX: 20,                                  // the stair drops from the chapel
    stairY0: 114,
    sea: { x0: 0, x1: 33, y0: 121, y1: 127 },   // water to the map's edge
    wrap: { west: 2, east: 2 },
    note: 'The same harbour at the foot of the road, in the rows the long map otherwise leaves empty below the chapel, with the sea running to the map’s edge — the widest of the three sites, and the one that keeps the wing at the size it was drawn.',
  },
];

// ---------------------------------------------------------------------------
// The monumental quarter around Hagia Sophia — what actually stood there, each
// an addition with its own flag. Same pattern as the wings: data plus a `kind`
// the level builder knows how to raise.
//
// In the map the church is a dome band at x28..32 y103, rising over the Ladder
// chamber, with the chapel (elder and altar) at x12..22 y108..113 and the road
// at x15..19. So the quarter sits at the pilgrimage's climax: the courts are
// carved out of the wall mass either side of the road, and the monuments stand
// in it, where the pilgrim arrives.
const SITE_DATA = [
  {
    id: 'augustaion',
    label: 'THE AUGUSTAION',
    short: 'AUGUSTAION',   // the mini-map's short form
    kind: 'court',
    area: { x: 20, y: 105, w: 13, h: 3 },       // east of the road, before the chapel
    note: 'The marble square in front of Hagia Sophia and the forecourt of the Great Palace: the ceremonial heart of the city, paved by Justinian, where emperors were acclaimed and where the Mese — the avenue this road stands in for — began. Here it is the open court east of the road just before the chapel, so the last stretch of the walk opens into a square instead of a corridor.',
  },
  {
    id: 'milion',
    label: 'THE MILION',
    short: 'MILION',   // the mini-map's short form
    kind: 'tetrapylon',
    at: { x: 20, y: 105, w: 2, h: 2 },          // the square's road edge
    note: 'Mile zero of the empire: a domed tetrapylon of four arches from which every road distance in Byzantium was measured, raised by Constantine over an older milestone and set about with statues of Constantine, Helena and the city’s fortune, with Justinian’s clock beside it. It stands where the pilgrim’s road meets the square — the point from which the road is measured.',
  },
  {
    id: 'chalke',
    label: 'THE CHALKE',
    short: 'CHALKE',   // the mini-map's short form
    kind: 'gate',
    at: { x: 24, y: 108 },                      // the palace frontage, south of the square
    note: 'The Chalke, the Brazen House: the monumental bronze gate of the Great Palace, built by Anastasius and rebuilt by Justinian as a domed hall, its interior revetted in marble and mosaic. Above its doors hung the icon of Christ Chalkites, whose removal by Leo III about 726 was the first public act of iconoclasm and whose restoration ended it. The gate stays shut — the palace is not the pilgrim’s — but the icon looks out over the square.',
  },
  {
    id: 'zeuxippus',
    label: 'THE BATHS OF ZEUXIPPUS',
    short: 'ZEUXIPPUS',   // the mini-map's short form
    kind: 'peristyle',
    area: { x: 2, y: 100, w: 13, h: 7 },        // west of the road, across from the square
    note: 'The Baths of Zeuxippus, between the square and the Hippodrome: a bath complex of Severus’s founding, enlarged by Constantine and famed for some seventy bronze statues of gods, heroes, poets and statesmen, catalogued in verse about the year 500. They burned in the Nika riot of 532 — the riot that destroyed the old church, and that Justinian answered with this one. Later the courts held a prison and a silk workshop. Here a peristyle of columns and standing figures, west of the road.',
  },
  {
    id: 'cistern',
    label: 'THE BASILICA CISTERN',
    short: 'CISTERN',   // the mini-map's short form
    kind: 'cistern',
    area: { x: 2, y: 93, w: 12, h: 6 },         // west of the road, north of the baths
    water: { x: 3, y: 94, w: 10, h: 4 },        // the sunken water, leaving a dry rim
    neck: { x: 14, y: 96, w: 1, h: 2 },         // the passage in from the road
    note: 'The Basilica Cistern, dug under the Basilica — the stoa that held the law courts, the library and the university — west of the Milion, to keep the city’s summer water: about 336 columns in twelve rows carrying a brick vault, two Gorgon heads reused as column bases among them. Here a sunken court of columns standing in water, with a dry rim to walk.',
  },
  {
    id: 'hagiaEirene',
    label: 'HAGIA EIRENE',
    short: 'HAGIA EIRENE',   // the mini-map's short form
    kind: 'domeBand',
    band: { x: 28, y: 104, w: 5 },              // sharing its wall with the Sophia band
    note: 'Hagia Eirene, the church of Holy Peace: the city’s other great church, sharing an outer wall with Hagia Sophia and the patriarchate, old before either was rebuilt — Justinian raised both again after the Nika fire, and this is the one that still stands in Istanbul. A second, smaller dome on the band along the church’s flank.',
  },
];

export const HARBOURS = WING_DATA.filter((wing) => FEATURES[wing.id]);
export const SITES = SITE_DATA.filter((site) => FEATURES[site.id]);

/** Every addition a dev can switch off, in HUD index order — the port's three
 *  candidate sites first, then the monuments of the quarter — each carrying the
 *  explanation the index shows. */
export const ADDITIONS = [
  ...WING_DATA.map((w) => ({ id: w.id, label: `THE PORT · ${w.label}`, note: w.note })),
  ...SITE_DATA.map((s) => ({ id: s.id, label: s.label, note: s.note })),
];

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
  const court    = { x: 2, y: 2, w: 10, h: 5 };            // gate court (open sky)
  const chapel   = { x: 12, y: MAP_H - 20, w: 11, h: 6 };  // confession + elder, at the road's foot
  const mainroad = { x: 15, y: 2, w: 5, h: chapel.y - 2 }; // the road from the court south to the chapel
  const tempter  = { x: 2, y: 14, w: 11, h: 5 };           // encounter 1
  const brother  = { x: mainroad.x + mainroad.w + 1, y: 14, w: 10, h: 5 }; // encounter 2
  const ladder   = { x: 27, y: chapel.y - 10, w: 5, h: 5 }; // encounter 3 + Ladder gate

  for (const r of [court, chapel, tempter, brother, ladder, mainroad]) carveRoom(g, r.x, r.y, r.w, r.h);

  // --- corridors ------------------------------------------------------------
  carveRow(g, 4, 12, 14);                                     // court -> the road
  carveRow(g, 13, 2, 31);                                     // bottom spine (tempter -> brother -> ladder)
  carveRow(g, ladder.y, mainroad.x + mainroad.w, ladder.x);   // the road -> Ladder chamber

  // --- the Port of Theodosius (every enabled wing) --------------------------
  // Each wing is carved from its own block: the quay walkable, the stair down
  // from the road through the sea gate to it, water filling the band beyond,
  // and any quay end flagged in `wrap` turned to water too — so a quay can read
  // as a mole standing out into the Marmara rather than as a walled pond.
  for (const wing of HARBOURS) {
    const { quay, wall, gateX, stairY0, sea, wrap } = wing;
    carveRoom(g, quay.x, quay.y, quay.w, quay.h);
    carveCol(g, gateX, stairY0, wall.y);   // the stair + the sea gate
    for (let j = sea.y0; j <= sea.y1; j++) for (let i = sea.x0; i <= sea.x1; i++) g[j][i] = SEA;
    for (let j = quay.y; j < quay.y + quay.h; j++) {
      for (let i = 0; i < wrap.west; i++) g[j][i] = SEA;
      for (let i = 0; i < wrap.east; i++) g[j][MAP_W - 1 - i] = SEA;
    }
  }

  // --- the monumental quarter around Hagia Sophia ---------------------------
  // The courts are carved walkable out of the wall mass; the cistern keeps a dry
  // rim round its water and a neck through to the road. The monuments that stand
  // in the mass (the Milion, the Chalke, Hagia Eirene's dome) carve nothing.
  for (const site of SITES) {
    if (site.area) carveRoom(g, site.area.x, site.area.y, site.area.w, site.area.h);
    if (site.water) {
      for (let j = site.water.y; j < site.water.y + site.water.h; j++) {
        for (let i = site.water.x; i < site.water.x + site.water.w; i++) g[j][i] = SEA;
      }
    }
    if (site.neck) carveRoom(g, site.neck.x, site.neck.y, site.neck.w, site.neck.h);
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
  add(court.x + 2, court.y + 3, 'S');                          // pilgrim start
  add(chapel.x + 2, chapel.y + chapel.h / 2 - 1, 'E');         // elder (NPC)
  add(chapel.x + 5, chapel.y + 5, 'A');                        // confession altar
  add(tempter.x + 5, tempter.y + 1, 'K');                      // encounter 1 trigger (Tempter)
  add(brother.x + 4, brother.y + 1, 'B');                      // encounter 2 trigger (Brother)
  add(ladder.x + 2, ladder.y + 2, 'P');                        // encounter 3 trigger (Demon of Pride)
  add(ladder.x + 2, ladder.y + 4, 'L');                        // Ladder gate (goal)

  // --- icons / columns -----------------------------------------------------------
  // decor codes
  const icon     = 'V';
  const pew      = 'w';
  const column   = 'c';
  const fountain = 'F';
  // (no candles — the street is open air in daylight)

  // columns
  add(18, 4, column);
  add(28, 16, column);

  // court decor
  add(court.x + 0, court.y + 0, icon);
  add(court.x + 0, court.y + 4, icon);
  add(court.x + 3, court.y + 2, column);
  add(court.x + 7, court.y + 2, fountain);

  // chapel decor
  add(chapel.x + 2, chapel.y + 1, pew);
  add(chapel.x + 3, chapel.y + 1, pew);
  add(chapel.x + 7, chapel.y + 1, pew);
  add(chapel.x + 8, chapel.y + 1, pew);
  add(chapel.x + 2, chapel.y + 3, pew);
  add(chapel.x + 3, chapel.y + 3, pew);
  add(chapel.x + 7, chapel.y + 3, pew);
  add(chapel.x + 8, chapel.y + 3, pew);

  return {
    grid: g,
    cells,
    // The harbour wings are not rooms: read them from HARBOURS, which carries
    // each wing's quay, band, gate and sea together.
    rooms: { court, chapel, tempter, brother, ladder, mainroad },
  };
}

export const LEVEL = buildLevelGrid();

export function validateLevel() {
  const problems = [];
  const { grid } = LEVEL;
  for (let j = 0; j < MAP_H; j++) if (grid[j].length !== MAP_W) problems.push(`row ${j} width ${grid[j].length}`);
  const counts = {};
  for (const row of grid) for (const t of row) counts[t] = (counts[t] || 0) + 1;
  for (const t of ['S', 'E', 'A', 'K', 'B', 'P', 'L']) if (!counts[t]) problems.push(`missing ${t}`);

  // Every key spot must be walkable from the pilgrim's start. The map is long
  // and its links are single cells, so a room moved along the road can strand a
  // threshold (or the Ladder chamber) without any other symptom.
  const passable = (x, y) => x >= 0 && y >= 0 && x < MAP_W && y < MAP_H
    && grid[y][x] !== W && grid[y][x] !== SEA;
  let start = null;
  for (let y = 0; y < MAP_H && !start; y++) {
    for (let x = 0; x < MAP_W; x++) if (grid[y][x] === 'S') { start = { x, y }; break; }
  }
  if (start) {
    const seen = new Set([`${start.x},${start.y}`]);
    const queue = [start];
    while (queue.length) {
      const { x, y } = queue.pop();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy, key = `${nx},${ny}`;
        if (!seen.has(key) && passable(nx, ny)) { seen.add(key); queue.push({ x: nx, y: ny }); }
      }
    }
    for (const [key, tile] of LEVEL.cells) {
      if (!seen.has(key)) problems.push(`${tile} at ${key} is walled off from the start`);
    }
  }

  return { ok: problems.length === 0, problems, counts };
}
