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
// Coordinates are grid cells on the 34x22 level map (CELL = 3 world units).
// Every listed cell is a WALL cell (never a walkable floor cell), so the
// structures never block the route or add colliders.

export const HOUSE = { x: 4, y: 0, w: 6, h: 2 };   // nobleman's house, north of the Gate Court
export const HAGIA = { x: 28, y: 19, w: 5, h: 1 }; // dome band, south of the Ladder chamber
export const HAGIA_MINARETS = [
  { x: 28.5, z: 19.5 }, // west corner of the south band
  { x: 32.5, z: 19.5 }, // east corner of the south band
  { x: 32.5, z: 15.5 }, // east band, upper
  { x: 33.5, z: 17.5 }, // east band, lower
];

// Wall cells that get a small dome roofline instead of a flat cornice
// (mirrors the dome-topped blocks scattered along the street in the map).
export const DOME_CELLS = [
  [8, 1], [10, 1],      // above the court, near the house
  [17, 1], [24, 1],     // above the chapel
  [25, 8], [22, 9],     // along the east wall of the chapel->spine leg
  [13, 8], [26, 12],    // corridor-side buildings
  [3, 12], [16, 12], [22, 12], // dome-topped buildings above the spine
  [1, 16], [33, 16],    // side towers on the bottom street
  [11, 19], [19, 19], [25, 19], // small domes on the south edge
];

// Tall slender tower cells (minaret-like corner towers along the route).
export const TOWER_CELLS = [
  [13, 1], [26, 1],     // flanking the chapel
  [1, 9], [33, 9],      // flanking the spine corridor
  [12, 12], [21, 12],   // spine corners
  [1, 19], [33, 14],    // bottom street corners
];

// Deterministic roof kind for any wall cell (used when a cell isn't special).
export function roofKind(x, z) {
  const n = (x * 31 + z * 17) % 10;
  if (n === 0) return 'dome';        // ~10% small domes
  if (n === 1) return 'tower';       // ~10% short towers
  return 'cornice';                  // flat Byzantine roofline with gold trim
}
