import * as THREE from 'three';
import { FEATURES, SITES, CELL } from '../config.js';

// Shared by the landmark activities that live in src/activities/. Each site
// builds its props once, reuses these geometries, and updates only while active.
const bodyGeometry = new THREE.CylinderGeometry(0.22, 0.3, 1.05, 6);
const headGeometry = new THREE.SphereGeometry(0.18, 6, 5);
const skin = new THREE.MeshLambertMaterial({ color: 0xb68b68 });

function siteHud(parent) {
  let el = document.getElementById('site-activity-hud');
  if (el) return el;
  el = document.createElement('div'); el.id = 'site-activity-hud'; el.className = 'panel';
  el.style.cssText = 'display:none;top:72px;left:50%;transform:translateX(-50%);max-width:90%;text-align:center;font-size:11px;line-height:1.7;pointer-events:none';
  el.innerHTML = '<strong style="color:var(--gold)"></strong><div class="world-status"></div><div>WASD walk · Q / Esc leave · R retry</div>';
  parent.appendChild(el);
  return el;
}

export class SiteActivity {
  constructor({ id, room, title, level, player, branch, hud, parent, leave, onResult }) {
    Object.assign(this, { id, room, title, level, player, branch, hud, leave, onResult });
    this.keys = {}; this.active = null; this.site = null; this.game = null;
    this.el = siteHud(parent); this.statusEl = this.el.querySelector('.world-status');
    window.addEventListener('blur', () => { this.keys = {}; this.player.clearKeys(); });
  }
  label(group, text, x, y, z) {
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 64;
    const c = canvas.getContext('2d'); c.fillStyle = '#20180fe6'; c.fillRect(0, 0, 512, 64);
    c.fillStyle = '#f3d276'; c.font = '24px monospace'; c.textAlign = 'center'; c.fillText(text, 256, 42);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas) }));
    sprite.position.set(x, y, z); sprite.scale.set(2.4, 0.3, 1); group.add(sprite);
    (group.userData.labels ??= []).push(sprite);
    return sprite;
  }
  person(group, name, role, x, z, color, labelled = true) {
    const figure = new THREE.Group(); figure.position.set(x, 0, z);
    const body = new THREE.Mesh(bodyGeometry, new THREE.MeshLambertMaterial({ color })); body.position.y = 0.58;
    const head = new THREE.Mesh(headGeometry, skin); head.position.y = 1.3;
    figure.add(body, head); group.add(figure);
    const target = { name, role, x, z, figure };
    if (labelled) { target.tag = this.label(group, name, x, 1.9, z); }
    return target;
  }
  /** Move a person (and its floating name) to a point. */
  place(target, x, z) {
    target.x = x; target.z = z; target.figure.position.set(x, target.figure.position.y, z);
    target.tag?.position.set(x, target.tag.position.y, z);
  }
  start() {
    if (!this.site) {
      const group = new THREE.Group(); group.name = `world-activity-${this.id}`;
      this.level.featureGroups[this.id].add(group);
      this.site = { group, targets: [] }; this.build(this.site);
    }
    this.active = { id: this.id }; this.keys = {}; this.player.clearKeys();
    this.game = { time: 0, done: null }; this.reset(this.game);
    this.el.style.display = 'block'; this.el.querySelector('strong').textContent = this.title;
    this.update(0);
  }
  inArea() {
    const area = SITES.find(site => site.id === this.id)?.area;
    if (!area) return false;
    // The court and its road entrance count; walking on into the city releases it.
    const margin = 8, p = this.player.pos;
    return p.x >= area.x * CELL - margin && p.x <= (area.x + area.w) * CELL + margin
      && p.z >= area.y * CELL - margin && p.z <= (area.y + area.h) * CELL + margin;
  }
  nearest(range = 1.8) {
    return this.site.targets.reduce((best, t) => {
      if (t.hidden) return best;
      const distance = Math.hypot(this.player.pos.x - t.x, this.player.pos.z - t.z);
      return distance < (t.range ?? range) && (!best || distance < best.distance) ? { ...t, ref: t, distance } : best;
    }, null);
  }
  key(e, down) {
    if (!this.active) return;
    this.player.onKey(e, down);
    if (!this.inArea()) { this.close({ walkingAway: true }); return; }
    this.keys[e.code] = down;
    if (['Space', 'KeyE', 'KeyF', 'KeyQ', 'KeyR', 'Escape'].includes(e.code)) e.preventDefault();
    if (!down || e.repeat) return;
    if (e.code === 'KeyQ' || e.code === 'Escape') { this.close(); return; }
    if (e.code === 'KeyR') { this.start(); return; }
    if (this.game.done) return;
    this.act(e.code, this.nearest());
  }
  update(dt) {
    if (!this.active) return;
    if (FEATURES[this.id] === false) { this.close(); return; }
    if (document.hidden) { this.keys = {}; this.player.clearKeys(); return; }
    this.player.update(dt);
    if (!this.inArea()) { this.close({ walkingAway: true }); return; }
    for (const label of this.site.group.userData.labels ?? []) {
      const distance = Math.hypot(label.position.x - this.player.pos.x, label.position.z - this.player.pos.z);
      const scale = THREE.MathUtils.clamp(distance / 4, 0.2, 1);
      label.scale.set(2.4 * scale, 0.3 * scale, 1);
    }
    if (!this.game.done) this.game.time += dt;
    const target = this.nearest();
    this.tick(dt, target);
    this.statusEl.textContent = this.status();
    this.hud.showPrompt(this.game.done ? `${this.game.done.toUpperCase()} · R retry · Q / Esc return to the road` : this.prompt(target));
  }
  finish(outcome, text) {
    if (this.game.done) return;
    this.game.done = outcome; this.keys = {}; this.player.clearKeys();
    const key = `activity:${this.id}`, reward = outcome !== 'unfinished' && !this.branch.flags[key];
    if (reward) {
      this.branch.setFlag(key, outcome);
      if (outcome === 'humble') this.branch.addGrace(1); else this.branch.addPride(1);   // TODO balance
      this.branch.save(); this.onResult();
    }
    this.hud.message(`${text} ${outcome === 'unfinished' ? 'Meters unchanged.' : reward ? outcome === 'humble' ? '(+1 grace)' : '(+1 pride)' : 'Practice: meters unchanged.'}`, 7500);
  }
  close({ walkingAway = false } = {}) {
    this.keys = {};
    if (!walkingAway) this.player.clearKeys();
    this.active = null; this.el.style.display = 'none'; this.hud.hidePrompt();
    this.cleanup?.();
    if (walkingAway) this.hud.message('', 0);
    this.leave({ walkingAway });
  }
}
