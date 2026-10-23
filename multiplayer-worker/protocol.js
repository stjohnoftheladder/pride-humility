export const NEARBY_DISTANCE = 8;
export const CALL_LENGTH_MS = 90_000;
export function cleanName(value) {
  return typeof value === 'string' ? value.replace(/[<>\u0000-\u001f\u007f]/g, '').trim().slice(0, 24) || 'Pilgrim' : 'Pilgrim';
}
export function worldName(value) { return typeof value === 'string' && /^[a-z0-9][a-z0-9-]{0,39}$/.test(value) ? value : null; }
export function position(value, max, fallback) { return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(max, value)) : fallback; }
export function nearby(a, b) { return Math.hypot(a.x - b.x, a.z - b.z) <= NEARBY_DISTANCE; }
export function publicPeer(state) {
  return { id: state.id, name: state.name, x: state.x, z: state.z, yaw: state.yaw,
    available: state.available, busy: !!(state.inviteId || state.callId), updatedAt: state.lastSeen };
}
export function allowedOrigin(request, env) {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  if ((env.ALLOWED_ORIGINS ?? '').split(',').map(s => s.trim()).includes(origin)) return true;
  try { const url = new URL(origin); return url.protocol === 'https:' && url.hostname.endsWith('.pride-humility.pages.dev'); }
  catch { return false; }
}
