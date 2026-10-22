// Shared frame for the Pantokrator, Stoudios and Hagia Eirene activities:
// walking, leaving, retrying, one-time rewards and the bottom-dock panel.
// Each landmark subclasses SiteActivity in its own module.
import * as THREE from 'three';
import { FEATURES } from '../config.js';

const bodyGeometry = new THREE.CylinderGeometry(0.22, 0.3, 1.05, 6);
const headGeometry = new THREE.SphereGeometry(0.18, 6, 5);
const skin = new THREE.MeshLambertMaterial({ color: 0xb68b68 });

function panel(parent) {
  let el = document.getElementById('landmark-hud');
  if (el) return el;
  el = document.createElement('div'); el.id = 'landmark-hud'; el.className = 'panel';
  el.style.cssText = 'display:none;top:72px;left:50%;transform:translateX(-50%);max-width:90%;text-align:center;font-size:11px;line-height:1.7;pointer-events:none';
  el.innerHTML = '<strong style="color:var(--gold)"></strong><div class="world-status"></div><div class="world-keys"></div>';
  parent.appendChild(el);
  return el;
}

export class SiteActivity {
  constructor({ level, player, branch, parent, hud, audio, leave, onResult }) {
    Object.assign(this, { level, player, branch, hud, audio, leave, onResult });
    this.keys = {}; this.active = null; this.site = null; this.game = null;
    this.el = panel(parent);
    window.addEventListener('blur', () => { this.keys = {}; this.player.clearKeys(); });
  }
  // --- subclass hooks -------------------------------------------------------
  build(_group) {}
  reset() { return {}; }
  interact(_code, _target) {}
  tick(_dt, _target) {}
  status() { return ''; }
  prompt(_target) { return ''; }
  resultText(_outcome) { return ''; }
  // --- helpers ----------------------------------------------------------------
  label(group, text, x, y, z) {
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 64;
    const c = canvas.getContext('2d'); c.fillStyle = '#20180fe6'; c.fillRect(0, 0, 512, 64);
    c.fillStyle = '#f3d276'; c.font = '24px monospace'; c.textAlign = 'center'; c.fillText(text, 256, 42);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas) }));
    sprite.position.set(x, y, z); sprite.scale.set(2.4, 0.3, 1); group.add(sprite);
    (group.userData.labels ??= []).push(sprite);
    return sprite;
  }
  person(group, name, role, x, z, color) {
    const figure = new THREE.Group(); figure.position.set(x, 0, z);
    const body = new THREE.Mesh(bodyGeometry, new THREE.MeshLambertMaterial({ color })); body.position.y = 0.58;
    const head = new THREE.Mesh(headGeometry, skin); head.position.y = 1.3;
    figure.add(body, head); group.add(figure); this.label(group, name, x, 1.9, z);
    this.level.npcs.push({ id: `activity-${role}`, name, role: 'witness', x, z });
    return { name, role, x, z, figure };
  }
  // --- lifecycle --------------------------------------------------------------
  start(def) {
    this.active = def; this.keys = {}; this.player.clearKeys();
    if (!this.site) {
      const group = new THREE.Group(); group.name = `world-activity-${def.id}`;
      this.level.featureGroups[def.id].add(group);
      this.site = { group, targets: [] };
      this.build(group);
    }
    this.game = { done: null, ...this.reset() };
    this.el.style.display = 'block';
    this.el.querySelector('strong').textContent = this.title;
    this.el.querySelector('.world-keys').textContent = this.controls;
    this.hud.message(this.intro, 7000);
    this.update(0);
  }
  inArea() {
    const a = this.area, p = this.player.pos;
    return p.x >= a.minX && p.x <= a.maxX && p.z >= a.minZ && p.z <= a.maxZ;
  }
  nearest(reach = 1.8) {
    return this.site.targets.reduce((best, t) => {
      const distance = Math.hypot(this.player.pos.x - t.x, this.player.pos.z - t.z);
      return distance < reach && (!best || distance < best.distance) ? { ...t, distance, ref: t } : best;
    }, null);
  }
  key(e, down) {
    if (!this.active) return;
    this.player.onKey(e, down);
    if (!this.inArea()) { this.close({ walkingAway: true }); return; }
    this.keys[e.code] = down;
    if (['Space', 'KeyE', 'KeyF', 'KeyH', 'KeyQ', 'KeyR', 'Escape'].includes(e.code)) e.preventDefault?.();
    if (!down || e.repeat) return;
    if (e.code === 'KeyQ' || e.code === 'Escape') { this.close(); return; }
    if (e.code === 'KeyR') { this.start(this.active); return; }
    if (this.game.done) return;
    const target = this.nearest();
    this.interact(e.code, target?.ref ?? null, e);
  }
  update(dt) {
    if (!this.active) return;
    if (FEATURES[this.active.id] === false) { this.close(); return; }
    if (document.hidden) { this.keys = {}; this.player.clearKeys(); return; }
    this.player.update(dt);
    if (!this.inArea()) { this.close({ walkingAway: true }); return; }
    for (const label of this.site.group.userData.labels ?? []) {
      const distance = Math.hypot(label.position.x - this.player.pos.x, label.position.z - this.player.pos.z);
      const scale = THREE.MathUtils.clamp(distance / 4, 0.2, 1);
      label.scale.set(2.4 * scale, 0.3 * scale, 1);
    }
    const target = this.nearest()?.ref ?? null;
    this.tick(dt, target);
    if (!this.active) return;
    this.el.querySelector('.world-status').textContent = this.status();
    this.hud.showPrompt(this.game.done
      ? `${this.game.done.toUpperCase()} · R retry · Q / Esc return to the road`
      : this.prompt(target) || 'Walk to a labeled place · Q / Esc leave');
  }
  finish(outcome) {
    if (this.game.done) return;
    this.game.done = outcome; this.keys = {}; this.player.clearKeys();
    const key = `activity:${this.active.id}`, reward = outcome !== 'unfinished' && !this.branch.flags[key];
    if (reward) {
      this.branch.setFlag(key, outcome);
      if (outcome === 'humble') this.branch.addGrace(1); else this.branch.addPride(1); // TODO balance
      this.branch.save(); this.onResult(this.active.id);
    }
    const tail = outcome === 'unfinished' ? 'Meters unchanged.' : reward ? outcome === 'humble' ? '(+1 grace)' : '(+1 pride)' : 'Practice: meters unchanged.';
    this.hud.message(`${this.resultText(outcome)} ${tail}`, 8000);
  }
  close({ walkingAway = false } = {}) {
    this.keys = {};
    if (!walkingAway) this.player.clearKeys();
    this.active = null; this.el.style.display = 'none'; this.hud.hidePrompt();
    if (walkingAway) this.hud.message('', 0);
    this.leave({ walkingAway });
  }
  snapshot() {
    if (!this.active) return null;
    return { id: this.active.id, outcome: this.game.done, ...this.details() };
  }
  details() { return {}; }
}
