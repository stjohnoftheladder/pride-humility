// Lightweight entry points remain in the exploration bundle.
export const ACTIVITY_STOPS = [
  { id: 'aqueduct', label: 'Operate the water gates', x: 36, z: 84 },
  { id: 'harbour', label: 'Take the grain cart', x: 61.5, z: 354 },
  { id: 'forumConstantine', label: 'Hear the witnesses', x: 35, z: 157.5 },
  // Landmarks with their own module load it on first entry.
  { id: 'mosaicPeristyle', label: 'Set the mosaic floor', x: 64, z: 264, load: () => import('./activities/mosaicPeristyle.js') },
  { id: 'milion', label: 'Guide the travelers', x: 59, z: 318, load: () => import('./activities/milion.js') },
];
export function nearbyActivity(pos, features) {
  return ACTIVITY_STOPS.find(a => features[a.id] !== false && Math.hypot(pos.x - a.x, pos.z - a.z) < 3.2) ?? null;
}
