// Lightweight entry points remain in the exploration bundle.
export const ACTIVITY_STOPS = [
  { id: 'aqueduct', label: 'Operate the water gates', x: 36, z: 84 },
  { id: 'harbour', label: 'Take the grain cart', x: 61.5, z: 354 },
  { id: 'forumConstantine', label: 'Hear the witnesses', x: 35, z: 157.5 },
  { id: 'pantokrator', label: 'Serve in the hospital', x: 62, z: 120 },
  { id: 'stoudios', label: 'Copy in the scriptorium', x: 62, z: 199 },
  { id: 'hagiaEirene', label: 'Sing with the choir', x: 90, z: 322 },
  { id: 'cistern', label: 'Carry the lamp below', x: 44.5, z: 291 },
  { id: 'zeuxippus', label: 'Prepare the warm basin', x: 44, z: 312.2 },
];
export function nearbyActivity(pos, features) {
  return ACTIVITY_STOPS.find(a => features[a.id] !== false && Math.hypot(pos.x - a.x, pos.z - a.z) < 3.2) ?? null;
}
