// Lightweight entry points remain in the exploration bundle. Each stop names
// the module that plays it, imported only on first entry; the harbour cart is
// part of the main bundle and has no module to load.
const location = () => import('./activities.js');
const palace = () => import('./activities/palace.js');
export const ACTIVITY_STOPS = [
  { id: 'aqueduct', label: 'Operate the water gates', x: 36, z: 84, load: location },
  { id: 'harbour', label: 'Take the grain cart', x: 61.5, z: 354 },
  { id: 'forumConstantine', label: 'Hear the witnesses', x: 35, z: 157.5, load: location },
  { id: 'pantokrator', label: 'Serve in the hospital', x: 62, z: 120, load: () => import('./activities/pantokrator.js') },
  { id: 'stoudios', label: 'Copy in the scriptorium', x: 62, z: 199, load: () => import('./activities/stoudios.js') },
  { id: 'hagiaEirene', label: 'Sing with the choir', x: 90, z: 322, load: () => import('./activities/hagiaEirene.js') },
  { id: 'cistern', label: 'Carry the lamp below', x: 44.5, z: 291, load: () => import('./activities/cistern.js') },
  { id: 'zeuxippus', label: 'Prepare the warm basin', x: 44, z: 312.2, load: () => import('./activities/zeuxippus.js') },
  { id: 'mosaicPeristyle', label: 'Set the mosaic floor', x: 64, z: 264, load: () => import('./activities/mosaicPeristyle.js') },
  { id: 'milion', label: 'Guide the travelers', x: 59, z: 318, load: () => import('./activities/milion.js') },
  { id: 'augustaion', label: 'Join the procession', x: 66, z: 322.5, load: palace },
  { id: 'chalke', label: 'Carry a sealed petition', x: 73.5, z: 322.8, load: palace },
];
export function nearbyActivity(pos, features) {
  return ACTIVITY_STOPS.find(a => features[a.id] !== false && Math.hypot(pos.x - a.x, pos.z - a.z) < 3.2) ?? null;
}
