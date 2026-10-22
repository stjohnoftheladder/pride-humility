import * as THREE from 'three';
import { FEATURES } from '../config.js';

// Shared by the Mosaic Peristyle and Milion activities: a walkable court with
// labeled figures, a bottom-dock HUD, and one saved first outcome per site.
const bodyGeometry = new THREE.CylinderGeometry(0.22, 0.3, 1.05, 6);
const headGeometry = new THREE.SphereGeometry(0.18, 6, 5);
const skin = new THREE.MeshLambertMaterial({ color: 0xb68b68 });
const robes = new Map();
const robe = (color) => robes.get(color) ?? robes.set(color, new THREE.MeshLambertMaterial({ color })).get(color);

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

export function makePerson(level, group, { id, name, x, z, color }) {
  const figure = new THREE.Group(); figure.name = id; figure.position.set(x, 0, z);
  const body = new THREE.Mesh(bodyGeometry, robe(color)); body.position.y = 0.58;
  const head = new THREE.Mesh(headGeometry, skin); head.position.y = 1.3;
  figure.add(body, head); group.add(figure);
  const label = makeLabel(figure, name, 0, 1.9, 0);
  (group.userData.labels ??= []).push(label);
  return { id, name, x, z, figure, label };
}

export class WorldActivity {
  constructor({ level, player, branch, hud, leave, onResult }, { hudId, title, controls, center, radius }) {
    Object.assign(this, { level, player, branch, hud, leave, onResult, center, radius, title });
    this.keys = {}; this.active = null; this.game = null; this.built = false;
    this.el = document.createElement('div'); this.el.id = hudId; this.el.className = 'panel';
    this.el.style.cssText = 'display:none;text-align:center;font-size:11px;line-height:1.7;pointer-events:none';
    this.el.innerHTML = `<strong style="color:var(--gold)">${title}</strong><div class="world-status"></div><div>${controls}</div>`;
    document.getElementById('hud').appendChild(this.el);
    this.statusEl = this.el.querySelector('.world-status');
    window.addEventListener('blur', () => { this.keys = {}; });
  }
  start(def) {
    if (!this.built) { this.build(); this.built = true; }
    this.active = def; this.keys = {}; this.player.clearKeys();
    this.game = { time: 0, done: null, ...this.newGame() };
    this.el.style.display = 'block';
    this.hud.message(this.intro(), 7000);
    this.update(0);
  }
  inArea() { return Math.hypot(this.player.pos.x - this.center.x, this.player.pos.z - this.center.z) < this.radius; }
  nearest(targets, reach = 1.6) {
    let best = null;
    for (const t of targets) {
      const d = Math.hypot(this.player.pos.x - t.x, this.player.pos.z - t.z);
      if (d < reach && (!best || d < best.d)) best = { t, d };
    }
    return best?.t ?? null;
  }
  key(e, down) {
    if (!this.active) return;
    this.player.onKey(e, down);
    if (!this.inArea()) { this.close({ walkingAway: true }); return; }
    this.keys[e.code] = down;
    if (['Space', 'KeyE', 'KeyF', 'KeyH', 'KeyQ', 'KeyR', 'Escape'].includes(e.code)) e.preventDefault();
    if (!down || e.repeat) return;
    if (e.code === 'KeyQ' || e.code === 'Escape') { this.close(); return; }
    if (e.code === 'KeyR') { this.start(this.active); return; }
    if (!this.game.done) this.act(e.code);
  }
  update(dt) {
    if (!this.active) return;
    if (FEATURES[this.active.id] === false) { this.close(); return; }
    if (document.hidden) { this.keys = {}; this.player.clearKeys(); return; }
    this.player.update(dt);
    if (!this.inArea()) { this.close({ walkingAway: true }); return; }
    for (const label of this.group.userData.labels ?? []) {
      const world = label.getWorldPosition(label.userData.world ??= new THREE.Vector3());
      const scale = THREE.MathUtils.clamp(Math.hypot(world.x - this.player.pos.x, world.z - this.player.pos.z) / 4, 0.25, 1);
      label.scale.set(2.4 * scale, 0.3 * scale, 1);
    }
    if (!this.game.done) {
      this.game.time += dt;
      if (this.game.time >= 120) this.finish('unfinished', this.timeoutText());
    }
    this.tick(dt);
    this.statusEl.textContent = this.status();
    this.hud.showPrompt(this.game.done ? `${this.game.done.toUpperCase()} · R retry · Q / Esc return to the road` : this.prompt());
  }
  finish(outcome, text) {
    if (this.game.done) return;
    this.game.done = outcome; this.keys = {};
    const key = `activity:${this.active.id}`, reward = outcome !== 'unfinished' && !this.branch.flags[key];
    if (reward) {
      this.branch.setFlag(key, outcome);
      if (outcome === 'humble') this.branch.addGrace(1); else this.branch.addPride(1); // TODO balance
      this.branch.save(); this.onResult();
    }
    this.hud.message(`${text} ${outcome === 'unfinished' ? 'Meters unchanged.' : reward ? outcome === 'humble' ? '(+1 grace)' : '(+1 pride)' : 'Practice: meters unchanged.'}`, 8000);
  }
  close({ walkingAway = false } = {}) {
    this.keys = {};
    if (!walkingAway) this.player.clearKeys();
    this.active = null; this.el.style.display = 'none'; this.hud.hidePrompt();
    if (walkingAway) this.hud.message('', 0);
    this.leave({ walkingAway });
  }
}
