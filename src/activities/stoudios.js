// Saint John of Stoudios: the scriptorium. Copy the exemplar with timed
// strokes. When the quill catches and blots, the ink is wet for a short time:
// hide the blot under gilding (pride) or show Brother Ioannikios and lift it
// as he teaches (humility). The repair stays visible on the finished page.
import * as THREE from 'three';
import { SiteActivity } from './siteKit.js';

const STROKES = [
  [40, 40, 216, 40], [216, 40, 216, 280], [216, 280, 40, 280], [40, 280, 40, 40],
  [128, 70, 128, 250], [70, 150, 186, 150], [82, 100, 174, 200], [174, 100, 82, 200],
];
const SLIP = 4;            // the vellum is rough here: the quill catches on this stroke
const BEAT = 1.2, WET = 10;
const DESK = { x: 66, z: 195 };

/** Where in the pulse the pilgrim is: 1 is the ring closing on the stroke. */
export function strokePhase(time) { return (time % BEAT) / BEAT; }
export function onStroke(time) { const p = strokePhase(time); return p >= 0.86 || p <= 0.06; }

export class StoudiosActivity extends SiteActivity {
  clock = false;
  listPeople = true;
  title = 'THE SCRIPTORIUM';
  room = 'Saint John of Stoudios';
  controls = 'WASD walk · Space lay a stroke as the ring closes · E ask / present · F gild over · Q / Esc leave · R retry';
  intro = 'Copy the exemplar onto the page. Lay each stroke as the ring closes on its start.';
  area = { minX: 54, maxX: 77, minZ: 182, maxZ: 208 };
  build(group) {
    const wood = this.level.mat.get('wood_floor');
    const desk = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1, 1), wood); desk.position.set(DESK.x, 0.5, DESK.z); group.add(desk);
    this.level.addCollider(DESK.x, DESK.z, 1.6, 1, 1, 'stoudios');
    this.canvas = document.createElement('canvas'); this.canvas.width = 256; this.canvas.height = 320;
    this.ink = this.canvas.getContext('2d');
    this.texture = new THREE.CanvasTexture(this.canvas);
    const page = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 1), new THREE.MeshBasicMaterial({ map: this.texture }));
    page.rotation.x = -Math.PI / 3; page.position.set(DESK.x, 1.25, DESK.z + 0.1); group.add(page);
    // the exemplar: the same pattern, finished, on its own stand
    const ex = document.createElement('canvas'); ex.width = 256; ex.height = 320;
    const c = ex.getContext('2d'); c.fillStyle = '#e8dcb8'; c.fillRect(0, 0, 256, 320);
    c.strokeStyle = '#2a1b10'; c.lineWidth = 7; c.lineCap = 'round';
    for (const [x0, y0, x1, y1] of STROKES) { c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); }
    const stand = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.4, 0.12), wood); stand.position.set(63.5, 0.7, 193.2); group.add(stand);
    const exemplar = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.88), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(ex) }));
    exemplar.position.set(63.5, 1.75, 193.25); group.add(exemplar);
    this.label(group, 'Exemplar', 63.5, 2.45, 193.2);
    this.label(group, 'Your page', DESK.x, 2.1, DESK.z);
    this.site.targets.push({ name: 'Your page', role: 'desk', x: DESK.x, z: DESK.z + 1.5 });
    this.site.targets.push({ ...this.person(this.site.group, 'Brother Ioannikios · Elder scribe', 'elder', 69.5, 192, 0x3f3a33), role: 'elder' });
  }
  reset() { return { time: 0, stroke: 0, laid: [], wobbles: 0, blot: null, revealed: false, repaired: false, hidden: false, page: [] }; }
  act(code, target) {
    const g = this.game;
    if (target?.role === 'desk' && code === 'Space') this.layStroke();
    else if (target?.role === 'desk' && code === 'KeyF' && g.blot?.wet && !g.revealed) {
      g.hidden = true; g.blot.wet = false; g.blot.gilded = true; g.laid.push(SLIP); g.stroke++; this.audio?._t(880, 0.15, 'triangle', 0.06);
      this.hud.message('You paint a gold flourish over the blot. From a step away the page looks flawless.', 5000);
    } else if (target?.role === 'elder' && code === 'KeyE') {
      if (g.blot?.wet && !g.revealed) {
        g.revealed = true;
        this.hud.message('Ioannikios: “Good that you showed me while it is wet. Tilt the knife, lift the ink, then lay the stroke again: Space at the page.”', 8000);
      } else if (g.stroke >= STROKES.length) this.finish(g.hidden ? 'proud' : 'humble');
      else this.hud.message('Ioannikios: “Watch the ring, not your hand. Lay the stroke as it closes.”', 4500);
    }
  }
  layStroke() {
    const g = this.game;
    if (g.stroke >= STROKES.length) { this.hud.message('The page is finished. Present it to Brother Ioannikios.', 3500); return; }
    if (g.blot?.wet) {
      if (!g.revealed) { this.hud.message('The blot is still wet. Scraping alone could tear the vellum.', 3500); return; }
      g.blot.wet = false; g.blot.repaired = true; g.repaired = true; g.laid.push(SLIP); g.stroke++;
      this.audio?._noise(0.2, 0.06, 2400);
      this.hud.message('The ink lifts. A pale, scraped patch remains under the new stroke.', 4500);
      return;
    }
    if (g.stroke === SLIP && !g.blot) {
      g.blot = { wet: true, left: WET, x: 128, y: 160 };
      this.audio?._t(150, 0.2, 'sawtooth', 0.08, 0, -60);
      this.hud.message('The quill catches on rough vellum and a blot spreads, glistening. The ink is still wet.', 6000);
      return;
    }
    if (onStroke(g.time)) { g.laid.push(g.stroke); g.stroke++; this.audio?._t(440 + g.stroke * 30, 0.08, 'triangle', 0.06); }
    else { g.wobbles++; g.page.push({ stroke: g.stroke, wobble: g.time }); this.audio?._t(200, 0.08, 'square', 0.04); }
  }
  tick(dt) {
    const g = this.game;
    if (g.done) { this.draw(); return; }
    g.time += dt;
    if (g.blot?.wet) {
      g.blot.left -= dt;
      if (g.blot.left <= 0) { g.blot.wet = false; g.blot.dried = true; this.draw(); this.finish('unfinished'); return; }
    }
    this.draw();
  }
  draw() {
    const g = this.game, c = this.ink;
    c.fillStyle = '#e8dcb8'; c.fillRect(0, 0, 256, 320);
    c.lineCap = 'round';
    // faint guide of what remains
    c.strokeStyle = '#b9a98266'; c.lineWidth = 2;
    for (let i = g.stroke; i < STROKES.length; i++) { const [x0, y0, x1, y1] = STROKES[i]; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke(); }
    if (g.blot?.repaired) { c.fillStyle = '#f4ecd4'; c.fillRect(g.blot.x - 26, g.blot.y - 34, 52, 68); }
    for (const w of g.page.slice(-3)) {
      const [x0, y0, x1, y1] = STROKES[w.stroke]; c.strokeStyle = '#5a463488'; c.lineWidth = 3; c.beginPath(); c.moveTo(x0, y0);
      c.quadraticCurveTo((x0 + x1) / 2 + Math.sin(w.wobble * 9) * 18, (y0 + y1) / 2 + Math.cos(w.wobble * 7) * 18, x1, y1); c.stroke();
    }
    for (const i of g.laid) {
      const [x0, y0, x1, y1] = STROKES[i];
      c.strokeStyle = i === SLIP && g.blot?.repaired ? '#4a2c1a' : '#2a1b10'; c.lineWidth = 7;
      c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
    }
    if (g.blot && !g.blot.repaired) {
      c.fillStyle = g.blot.gilded ? '#c9a23a' : g.blot.wet ? '#0a0604' : '#2b231c';
      c.beginPath(); c.ellipse(g.blot.x, g.blot.y, 22, 16, 0.4, 0, Math.PI * 2); c.fill();
      if (g.blot.wet) { c.fillStyle = `rgba(255,255,255,${0.15 + 0.35 * g.blot.left / WET})`; c.beginPath(); c.ellipse(g.blot.x - 6, g.blot.y - 5, 7, 4, 0.4, 0, Math.PI * 2); c.fill(); }
    }
    if (!g.done && g.stroke < STROKES.length && !g.blot?.wet) {
      const [x0, y0] = STROKES[g.stroke], p = strokePhase(g.time);
      c.strokeStyle = onStroke(g.time) ? '#b8860b' : '#7a2a1a'; c.lineWidth = 3;
      c.beginPath(); c.arc(x0, y0, 6 + 34 * (1 - p), 0, Math.PI * 2); c.stroke();
    }
    this.texture.needsUpdate = true;
  }
  status() {
    const g = this.game;
    const blot = g.blot?.wet ? ` · Wet blot: ${Math.ceil(g.blot.left)}s before it dries` : g.blot?.repaired ? ' · Repaired' : g.blot?.gilded ? ' · Gilded over' : '';
    return `Strokes ${Math.min(g.stroke, STROKES.length)}/${STROKES.length} · wavering strokes ${g.wobbles}${blot}`;
  }
  prompt(target) {
    const g = this.game;
    if (!target) return '';
    if (target.role === 'desk') {
      if (g.blot?.wet) return g.revealed ? 'Space · Lift the wet ink and lay the stroke again' : 'F · Gild over the blot · or show Brother Ioannikios';
      return g.stroke >= STROKES.length ? 'The page is finished · present it to Brother Ioannikios' : 'Space · Lay the stroke as the ring closes';
    }
    if (g.blot?.wet && !g.revealed) return 'E · Show Brother Ioannikios the blot';
    return g.stroke >= STROKES.length ? 'E · Present the page' : 'E · Ask Brother Ioannikios';
  }
  resultText(outcome) {
    if (outcome === 'humble') return 'Ioannikios turns the page to the light and points to the pale repair: “This is the honest part of the page.” He keeps it with the others.';
    if (outcome === 'proud') return 'Ioannikios praises a flawless page. Under the gold, the blot remains, and only you know it.';
    return 'The ink dried over the blot. The page is spoiled; take a fresh sheet and try again.';
  }
  details() { const g = this.game; return { stroke: g.stroke, wobbles: g.wobbles, revealed: g.revealed, repaired: g.repaired, hidden: g.hidden, blot: g.blot && { ...g.blot }, time: g.time }; }
}
export default StoudiosActivity;
