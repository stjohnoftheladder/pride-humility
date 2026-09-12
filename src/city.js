// City layout — the Byzantine street built from Corey's outline map
// (public/assets/design/corey.map.png, B&W line art).
//
// The map reads as: the pilgrim's house at one end -> a street lined with
// buildings -> Hagia Sophia (dome + tall towers) at the other. We keep the
// gameplay grid (rooms, corridors, triggers, colliders) exactly as-is and
// dress the wall bands so the whole walk reads as an open-air Byzantine
// street: house at the start, buildings along the way, Hagia Sophia rising
// above the Ladder chamber at the destination.
//
// Coordinates are grid cells on the level map (CELL = 3 world units).
// Every listed cell is a WALL cell (never a walkable floor cell), so the
// structures never block the route or add colliders.

import { LEVEL } from './config.js';

// The dome is anchored to the Ladder chamber rather than to a fixed row, so
// moving the destination along the road moves Hagia Sophia with it.
const { ladder } = LEVEL.rooms;

export const HOUSE = { x: 4, y: 0, w: 6, h: 2 };   // nobleman's house, north of the Gate Court
export const HAGIA = { x: ladder.x + 1, y: ladder.y + ladder.h, w: 5, h: 1 }; // dome band, south of the Ladder chamber
export const HAGIA_MINARETS = [
  { x: ladder.x + 1.5, z: HAGIA.y + 0.5 }, // west corner of the south band
  { x: ladder.x + 5.5, z: HAGIA.y + 0.5 }, // east corner of the south band
  { x: ladder.x + 5.5, z: ladder.y + 1.5 }, // east band, upper
  { x: ladder.x + 6.5, z: ladder.y + 3.5 }, // east band, lower
];

// Wall cells that get a small dome roofline instead of a flat cornice
// (mirrors the dome-topped blocks scattered along the street in the map).
// Drawn for the older U-shaped layout: the cells just north of the spine
// (y12-19) still sit on the tempter/brother street, but the higher ones are now
// plain city fabric beside the main road. A cell that lands on the road is
// ignored, and roofKind() dresses the rest of the wall band procedurally.
export const DOME_CELLS = [
  [8, 1], [10, 1],      // above the court, near the house
  [17, 1], [24, 1],     // city roofs north of the spine
  [25, 8], [22, 9],     // city roofs between the court and the spine
  [13, 8], [26, 12],    // corridor-side buildings
  [3, 12], [22, 12],    // dome-topped buildings above the spine
  [1, 16], [33, 16],    // side towers on the tempter/brother street
  [11, 19], [25, 19],   // small domes south of that street
];

// Tall slender tower cells (minaret-like corner towers along the route).
export const TOWER_CELLS = [
  [13, 1], [26, 1],     // city towers north of the spine
  [1, 9], [33, 9],      // flanking the spine corridor
  [12, 12], [21, 12],   // spine corners
  [1, 19], [33, 14],    // street corners
];

// Deterministic roof kind for any wall cell (used when a cell isn't special).
export function roofKind(x, z) {
  const n = (x * 31 + z * 17) % 10;
  if (n === 0) return 'dome';        // ~10% small domes
  if (n === 1) return 'tower';       // ~10% short towers
  return 'cornice';                  // flat Byzantine roofline with gold trim
}
