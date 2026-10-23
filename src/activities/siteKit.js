// Shared frame for the landmark activities in src/activities/: walking,
// leaving, retrying, one-time rewards and the bottom-dock panel. Each landmark
// subclasses SiteActivity in its own module, which main.js loads on first entry.
//
// A subclass describes itself with fields (title, room, controls, intro) and
// one way of bounding its court: `area` {minX, maxX, minZ, maxZ}, or `center`
// and `radius`, or neither to use the site's footprint in config.js. Hooks:
// build(group, site), reset(game), act(code, target, event), tick(dt, target),
// status(), prompt(target), resultText(outcome) and timeoutText().
import * as THREE from 'three';
import { FEATURES, SITES, CELL } from '../config.js';

const bodyGeometry = new THREE.CylinderGeometry(0.22, 0.3, 1.05, 6);
const headGeometry = new THREE.SphereGeometry(0.18, 6, 5);
const skin = new THREE.MeshLambertMaterial({ color: 0xb68b68 });
const robes = new Map();
const robe = (color) => robes.get(color) ?? robes.set(color, new THREE.MeshLambertMaterial({ color })).get(color);
// A landmark's first resolution weighs like a market errand: less than the
// aqueduct, harbour and forum (+3 / +4), since twelve sites now share the road.
export const SITE_GRACE = 2, SITE_PRIDE = 3;
const KEYS = ['Space', 'KeyE', 'KeyF', 'KeyH', 'KeyQ', 'KeyR', 'Escape'];

/** A floating name. `userData.setText` changes it later. */
export function makeLabel(group, text, x, y, z) {
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 64;
  const texture = new THREE.CanvasTexture(canvas);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture }));
  sprite.position.set(x, y, z); sprite.scale.set(2.4, 0.3, 1); group.add(sprite);
  sprite.userData.setText = (value) => {
    if (sprite.userData.text === value) return;
    sprite.userData.text = value;
    const c = canvas.getContext('2d'); c.clearRect(0, 0, 512, 64);
    c.fillStyle = '#20180fe6'; c.fillRect(0, 0, 512, 64);
    c.fillStyle = '#f3d276'; c.font = '24px monospace'; c.textAlign = 'center'; c.fillText(value, 256, 42);
    texture.needsUpdate = true;
  };
  sprite.userData.setText(text);
  (group.userData.labels ??= []).push(sprite);
  return sprite;
}

/** A figure whose name rides on it, for people who walk about the court. */
export function makePerson(level, group, { id, name, x, z, color }) {
  const figure = new THREE.Group(); figure.name = id; figure.position.set(x, 0, z);
  const body = new THREE.Mesh(bodyGeometry, robe(color)); body.position.y = 0.58;
  const head = new THREE.Mesh(headGeometry, skin); head.position.y = 1.3;
  figure.add(body, head); group.add(figure);
  const label = makeLabel(figure, name, 0, 1.9, 0);
  (group.userData.labels ??= []).push(label);
  return { id, name, x, z, figure, label };
}

function panel(parent) {
  let el = document.getElementById('site-activity-hud');
  if (el) return el;
  el = document.createElement('div'); el.id = 'site-activity-hud'; el.className = 'panel';
  el.style.cssText = 'display:none;top:72px;left:50%;transform:translateX(-50%);max-width:90%;text-align:center;font-size:11px;line-height:1.7;pointer-events:none';
  el.innerHTML = '<strong style="color:var(--gold)"></strong><div class="world-status"></div><div class="world-keys"></div>';
  (parent ?? document.getElementById('hud')).appendChild(el);
  return el;
}

export class SiteActivity {
  /** Seconds before an unfinished attempt closes on its own; null for none. */
  timeLimit = null;
  /** False when the subclass keeps its own `game.time`. */
  clock = true;
  /** True to list this site's people with the city's NPCs. */
  listPeople = false;
  controls = 'WASD walk · Q / Esc leave · R retry';

  constructor({ level, player, branch, parent, hud, audio, leave, onResult }, config = {}) {
    Object.assign(this, { level, player, branch, hud, audio, leave, onResult }, config);
    this.keys = {}; this.active = null; this.site = null; this.game = null;
    this.el = panel(parent); this.statusEl = this.el.querySelector('.world-status');
    window.addEventListener('blur', () => { this.keys = {}; this.player.clearKeys(); });
  }
  // --- subclass hooks -------------------------------------------------------
  build(_group, _site) {}
  reset(_game) {}
  act(_code, _target, _event) {}
  tick(_dt, _target) {}
  status() { return ''; }
  prompt(_target) { return ''; }
  resultText(_outcome) { return ''; }
  timeoutText() { return 'Time ran out before the work was done. Try again.'; }
  details() { return {}; }
  // --- helpers ----------------------------------------------------------------
  label(group, text, x, y, z) { return makeLabel(group, text, x, y, z); }
  /** A standing figure with its name floating above (not attached, so the figure can lie down). */
  person(group, name, role, x, z, color, labelled = true) {
    const figure = new THREE.Group(); figure.position.set(x, 0, z);
    const body = new THREE.Mesh(bodyGeometry, robe(color)); body.position.y = 0.58;
    const head = new THREE.Mesh(headGeometry, skin); head.position.y = 1.3;
    figure.add(body, head); group.add(figure);
    const target = { name, role, x, z, figure };
    if (labelled) target.tag = this.label(group, name, x, 1.9, z);
    if (this.listPeople) this.level.npcs.push({ id: `activity-${role}`, name, role: 'witness', x, z });
    return target;
  }
  /** Move a person (and its floating name) to a point. */
  place(target, x, z) {
    target.x = x; target.z = z; target.figure.position.set(x, target.figure.position.y, z);
    target.tag?.position.set(x, target.tag.position.y, z);
  }
  /** The nearest target in reach, as a copy carrying `ref` and `distance`. */
  nearest(reach = 1.8, targets = this.site.targets) {
    return targets.reduce((best, t) => {
      if (t.hidden) return best;
      const distance = Math.hypot(this.player.pos.x - t.x, this.player.pos.z - t.z);
      return distance < (t.range ?? reach) && (!best || distance < best.distance) ? { ...t, ref: t, distance } : best;
    }, null);
  }
  inArea() {
    const p = this.player.pos;
    if (this.area) { const a = this.area; return p.x >= a.minX && p.x <= a.maxX && p.z >= a.minZ && p.z <= a.maxZ; }
    if (this.center) return Math.hypot(p.x - this.center.x, p.z - this.center.z) < this.radius;
    const area = SITES.find(site => site.id === this.active.id)?.area;
    if (!area) return false;
    // The court and its road entrance count; walking on into the city releases it.
    const margin = 8;
    return p.x >= area.x * CELL - margin && p.x <= (area.x + area.w) * CELL + margin
      && p.z >= area.y * CELL - margin && p.z <= (area.y + area.h) * CELL + margin;
  }
  // --- lifecycle --------------------------------------------------------------
  start(def) {
    this.active = { id: def.id }; this.keys = {}; this.player.clearKeys();
    if (!this.site) {
      const group = new THREE.Group(); group.name = `world-activity-${def.id}`;
      this.level.featureGroups[def.id].add(group);
      this.site = { group, targets: [] };
      this.build(group, this.site);
    }
    this.game = { time: 0, done: null };
    Object.assign(this.game, this.reset(this.game));
    this.el.style.display = 'block';
    this.el.querySelector('strong').textContent = this.title;
    this.el.querySelector('.world-keys').textContent = this.controls;
    const intro = typeof this.intro === 'function' ? this.intro() : this.intro;
    if (intro) this.hud.message(intro, 7000);
    this.update(0);
  }
  key(e, down) {
    if (!this.active) return;
    this.player.onKey(e, down);
    if (!this.inArea()) { this.close({ walkingAway: true }); return; }
    this.keys[e.code] = down;
    if (KEYS.includes(e.code)) e.preventDefault?.();
    if (!down || e.repeat) return;
    if (e.code === 'KeyQ' || e.code === 'Escape') { this.close(); return; }
    if (e.code === 'KeyR') { this.start(this.active); return; }
    if (this.game.done) return;
    this.act(e.code, this.nearest(), e);
  }
  update(dt) {
    if (!this.active) return;
    if (FEATURES[this.active.id] === false) { this.close(); return; }
    if (document.hidden) { this.keys = {}; this.player.clearKeys(); return; }
    this.player.update(dt);
    if (!this.inArea()) { this.close({ walkingAway: true }); return; }
    for (const label of this.site.group.userData.labels ?? []) {
      const world = label.getWorldPosition(label.userData.world ??= new THREE.Vector3());
      const scale = THREE.MathUtils.clamp(Math.hypot(world.x - this.player.pos.x, world.z - this.player.pos.z) / 4, 0.2, 1);
      label.scale.set(2.4 * scale, 0.3 * scale, 1);
    }
    if (!this.game.done && this.clock) {
      this.game.time += dt;
      if (this.timeLimit && this.game.time >= this.timeLimit) this.finish('unfinished', this.timeoutText());
    }
    const target = this.nearest();
    this.tick(dt, target);
    if (!this.active) return;
    this.statusEl.textContent = this.status();
    this.hud.showPrompt(this.game.done
      ? `${this.game.done.toUpperCase()} · R retry · Q / Esc return to the road`
      : this.prompt(target) || 'Walk to a labeled place · Q / Esc leave');
  }
  finish(outcome, text = this.resultText(outcome)) {
    if (this.game.done) return;
    this.game.done = outcome; this.keys = {}; this.player.clearKeys();
    const key = `activity:${this.active.id}`, reward = outcome !== 'unfinished' && !this.branch.flags[key];
    if (reward) {
      this.branch.setFlag(key, outcome);
      if (outcome === 'humble') this.branch.addGrace(SITE_GRACE); else this.branch.addPride(SITE_PRIDE);
      this.branch.save(); this.onResult();
    }
    const tail = outcome === 'unfinished' ? 'Meters unchanged.' : reward ? outcome === 'humble' ? `(+${SITE_GRACE} grace)` : `(+${SITE_PRIDE} pride)` : 'Practice: meters unchanged.';
    this.hud.message(`${text} ${tail}`, 8000);
  }
  close({ walkingAway = false } = {}) {
    this.keys = {};
    if (!walkingAway) this.player.clearKeys();
    this.active = null; this.el.style.display = 'none'; this.hud.hidePrompt();
    this.cleanup?.();
    if (walkingAway) this.hud.message('', 0);
    this.leave({ walkingAway });
  }
  snapshot() {
    if (!this.active) return null;
    return { id: this.active.id, outcome: this.game.done, ...this.details() };
  }
}
