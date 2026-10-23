import * as THREE from 'three';
import { SITE_GRACE, SITE_PRIDE } from './siteKit.js';
import { FEATURES, SITES, CELL } from '../config.js';
import { ACTIVITY_STOPS } from '../activitySites.js';
export const ACTIVITIES = ACTIVITY_STOPS.filter(a => a.id === 'augustaion' || a.id === 'chalke');

// The procession walks the north lane of the Augustaion, clear of the Milion
// and the colonnade on the spine; the Chalke queue waits before the bronze doors.
const LANE_Z = 317, START_X = 69, END_X = 95;
const WALKERS = [
  { name: 'Sergios · Cross bearer', speed: 1.15, color: 0x7a2f2a },
  { name: 'Agathe', speed: 1.05, color: 0x52746e },
  { name: 'Gerontios · Elder', speed: 0.55, color: 0x6d6488, slow: true },
  { name: 'Ioannes', speed: 1.05, color: 0x948366 },
  { name: 'Maria · Carrying a child', speed: 0.65, color: 0x58769c, slow: true },
  { name: 'Petros', speed: 1.05, color: 0xa65c43 },
];
const BYSTANDERS = [74, 79, 84, 89].map((x, i) => ({ x, name: ['A water seller', 'Two gossiping clerks', 'A boy with a hoop', 'A guard at ease'][i] }));
const GATE_X = 73.5, QUEUE_Z = 321.6, FRONT_X = 75.6, STEP = 1.6;
const PETITIONERS = [
  { name: 'Nikolaos · Baker', color: 0xa65c43, line: '“A licence to bake for the night market. The seal is ready.”' },
  { name: 'Stephanos · Mason', color: 0x948366, line: '“Wages owed for the cistern repairs. I have the foreman’s tally.”' },
  { name: 'Eirene · Widow', color: 0x6d6488, neglected: true, line: '“My husband’s pension stopped in spring. I cannot write, and each time the clerk calls the next name.”' },
  { name: 'Kosmas · Ferryman', color: 0x52746e, line: '“The harbour toll was charged twice. I only ask for the second coin.”' },
  { name: 'Thekla · Weaver', color: 0x58769c, line: '“Permission to sell at the Forum on feast days.”' },
];

/** Augustaion procession and Chalke petition queue, built once per site on first entry. */
export class PalaceActivities {
  constructor({ level, player, branch, parent, hud, leave, onResult }) {
    Object.assign(this, { level, player, branch, hud, leave, onResult });
    this.keys = {}; this.active = null; this.sites = new Map();
    this.el = document.createElement('div'); this.el.id = 'palace-activity-hud'; this.el.className = 'panel';
    this.el.style.cssText = 'display:none;top:72px;left:50%;transform:translateX(-50%);max-width:90%;text-align:center;font-size:11px;line-height:1.7;pointer-events:none';
    this.el.innerHTML = '<strong style="color:var(--gold)"></strong><div class="world-status"></div><div>WASD walk · E interact · Q / Esc leave · R retry</div>';
    parent.appendChild(this.el);
    this.statusEl = this.el.querySelector('.world-status');
    this.bodyGeometry = new THREE.CylinderGeometry(0.22, 0.3, 1.05, 6);
    this.headGeometry = new THREE.SphereGeometry(0.18, 6, 5);
    this.dummy = new THREE.Object3D();
    window.addEventListener('blur', () => { this.keys = {}; this.player.clearKeys(); });
  }
  label(group, text) {
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 64;
    const c = canvas.getContext('2d'); c.fillStyle = '#20180fe6'; c.fillRect(0, 0, 512, 64);
    c.fillStyle = '#f3d276'; c.font = '24px monospace'; c.textAlign = 'center'; c.fillText(text, 256, 42);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas) }));
    sprite.scale.set(2.4, 0.3, 1); group.add(sprite);
    return sprite;
  }
  /** One instanced body and head mesh per site, as the road market does. */
  crowd(group, figures) {
    const bodies = new THREE.InstancedMesh(this.bodyGeometry, new THREE.MeshLambertMaterial(), figures.length);
    const heads = new THREE.InstancedMesh(this.headGeometry, new THREE.MeshLambertMaterial({ color: 0xb68b68 }), figures.length);
    figures.forEach((f, i) => { bodies.setColorAt(i, new THREE.Color(f.color)); f.label = this.label(group, f.name); });
    group.add(bodies, heads);
    return { bodies, heads, figures };
  }
  place(crowd) {
    const d = this.dummy;
    crowd.figures.forEach((f, i) => {
      const hidden = f.hidden ? 0.0001 : 1;
      d.position.set(f.x, 0.58, f.z); d.rotation.set(f.tilt ?? 0, 0, 0); d.scale.setScalar(hidden); d.updateMatrix(); crowd.bodies.setMatrixAt(i, d.matrix);
      d.position.set(f.x, 1.3, f.z + (f.tilt ?? 0) * 0.7); d.updateMatrix(); crowd.heads.setMatrixAt(i, d.matrix);
      f.label.visible = !f.hidden;
      const distance = Math.hypot(f.x - this.player.pos.x, f.z - this.player.pos.z);
      const scale = THREE.MathUtils.clamp(distance / 4, 0.2, 1);
      f.label.position.set(f.x, 1.9, f.z); f.label.scale.set(2.4 * scale, 0.3 * scale, 1);
    });
    crowd.bodies.instanceMatrix.needsUpdate = true; crowd.heads.instanceMatrix.needsUpdate = true;
  }
  build(id) {
    if (this.sites.has(id)) return this.sites.get(id);
    const group = new THREE.Group(); group.name = `world-activity-${id}`; this.level.featureGroups[id].add(group);
    const gold = this.level.mat.get('gold');
    const site = { group };
    if (id === 'augustaion') {
      site.walkers = WALKERS.map(w => ({ ...w, role: 'walker' }));
      site.bystanders = BYSTANDERS.map(b => ({ ...b, role: 'bystander', color: 0x777347 }));
      site.crowd = this.crowd(group, [...site.walkers, ...site.bystanders]);
      site.cross = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.9, 0.08), gold); group.add(site.cross);
      site.bar = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.07, 0.07), gold); group.add(site.bar);
      // The procession ends at a gold threshold before the palace end of the court.
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.4, 0.07, 4, 24), gold); ring.rotation.x = Math.PI / 2; ring.position.set(END_X, 0.16, LANE_Z); group.add(ring);
    } else {
      site.clerk = { name: 'Basileios · Gate clerk', role: 'clerk', x: GATE_X, z: QUEUE_Z - 0.2, color: 0x2f4a3a };
      site.petitioners = PETITIONERS.map(p => ({ ...p, role: 'petitioner' }));
      site.crowd = this.crowd(group, [site.clerk, ...site.petitioners]);
      site.slot = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.6, 20), gold); site.slot.rotation.x = -Math.PI / 2; group.add(site.slot);
      site.scroll = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.4, 6), new THREE.MeshLambertMaterial({ color: 0xe8dcb5 }));
      site.scroll.rotation.z = Math.PI / 2; group.add(site.scroll);
    }
    this.sites.set(id, site); return site;
  }
  start(def) {
    this.active = def; this.site = this.build(def.id); this.keys = {}; this.player.clearKeys();
    this.game = { time: 0, done: null, pushed: false, paced: false, heard: new Set(), helped: false, jumped: false, served: 0, timer: 0 };
    const s = this.site;
    if (def.id === 'augustaion') {
      s.walkers.forEach((w, i) => Object.assign(w, { x: START_X - i * 1.3, z: LANE_Z, tilt: 0 }));
      s.bystanders.forEach(b => Object.assign(b, { z: LANE_Z + (b.x % 2 ? 0.3 : -0.3), aside: false, target: LANE_Z, tilt: 0 }));
    } else {
      s.petitioners.forEach((p, i) => Object.assign(p, { x: FRONT_X + i * STEP, z: QUEUE_Z, hidden: false, aside: false }));
    }
    this.el.style.display = 'block';
    this.el.querySelector('strong').textContent = def.id === 'augustaion' ? 'THE PROCESSION' : 'THE SEALED PETITION';
    this.hud.message(def.id === 'augustaion'
      ? 'A small procession crosses the square to the palace. Open a way through the crowd and keep the group together.'
      : 'You carry a sealed petition. Take your place at the gold ring and wait your turn.', 7000);
    this.update(0);
  }
  inArea() {
    if (!this.active) return false;
    const area = SITES.find(site => site.id === 'augustaion')?.area;
    if (!area) return false;
    const margin = 8;
    return this.player.pos.x >= area.x * CELL - margin && this.player.pos.x <= (area.x + area.w) * CELL + margin
      && this.player.pos.z >= area.y * CELL - margin && this.player.pos.z <= (area.y + area.h) * CELL + margin;
  }
  targets() {
    const s = this.site;
    if (this.active.id === 'augustaion') return [...s.bystanders.filter(b => !b.aside), s.walkers[0]];
    return [s.clerk, ...s.petitioners.filter(p => !p.hidden)];
  }
  nearest() {
    return this.targets().reduce((best, t) => {
      const distance = Math.hypot(this.player.pos.x - t.x, this.player.pos.z - t.z);
      return distance < 1.8 && (!best || distance < best.distance) ? Object.assign(t, { distance }) : best;
    }, null);
  }
  slotX() { return FRONT_X + Math.max(0, PETITIONERS.length - this.game.served) * STEP; }
  key(e, down) {
    if (!this.active) return;
    this.player.onKey(e, down);
    if (!this.inArea()) { this.close({ walkingAway: true }); return; }
    this.keys[e.code] = down;
    if (['Space','KeyE','KeyF','KeyH','KeyQ','KeyR','Escape'].includes(e.code)) e.preventDefault();
    if (!down || e.repeat) return;
    if (e.code === 'KeyQ' || e.code === 'Escape') { this.close(); return; }
    if (e.code === 'KeyR') { this.start(this.active); return; }
    const g = this.game; if (g.done) return;
    // The clerk answers F even with a petitioner standing closer at the front.
    const clerk = this.site.clerk, nearClerk = clerk && Math.hypot(this.player.pos.x - clerk.x, this.player.pos.z - clerk.z) < 1.8;
    const t = e.code === 'KeyF' && nearClerk ? clerk : this.nearest(); if (!t) return;
    if (this.active.id === 'augustaion') {
      if (t.role === 'bystander' && e.code === 'KeyE') { t.aside = true; t.target = LANE_Z - 1.6; this.hud.message(`${t.name} steps back to the colonnade side with a nod.`, 3500); }
      else if (t.role === 'bystander' && e.code === 'KeyF') {
        // Shoving clears the whole lane at once and puts you at the head.
        g.pushed = true;
        for (const b of this.site.bystanders) Object.assign(b, { aside: true, target: LANE_Z - 2, tilt: 0.45 });
        this.hud.message('You shove through and stride ahead of the cross. People stumble out of your way.', 4500);
      } else if (t.role === 'walker' && e.code === 'KeyE') {
        g.paced = true; this.hud.message('Sergios: “Yes. We walk at Gerontios’s pace, and Maria’s.” He slows the cross.', 5000);
      }
    } else if (t.role === 'clerk') {
      if (e.code === 'KeyF' && g.served < PETITIONERS.length) {
        g.jumped = true;
        this.hud.message('“The Magistros knows my family.” The clerk takes your seal ahead of everyone. The line turns to watch.', 5000);
        this.finish('proud');
      } else if (e.code === 'KeyE') {
        if (g.served < PETITIONERS.length) this.hud.message('Basileios: “Wait your turn, please. Names are called in order.”', 4000);
        else if (Math.hypot(this.player.pos.x - this.slotX(), this.player.pos.z - QUEUE_Z) > 2.2) this.hud.message('Stand at the front of the line to present your petition.', 4000);
        else this.finish(g.helped ? 'humble' : 'unfinished');
      }
    } else if (e.code === 'KeyE') {
      g.heard.add(t.name); this.hud.message(`${t.name}: ${t.line}`, 6500);
    } else if (e.code === 'KeyH' && t.neglected) {
      if (!g.heard.has(t.name)) this.hud.message('Hear her first: E.', 3000);
      else { g.helped = true; this.hud.message('You write Eirene’s request beneath your own and press her mark beside the seal.', 5000); }
    }
  }
  update(dt) {
    if (!this.active) return;
    if (FEATURES[this.active.id] === false) { this.close(); return; }
    if (document.hidden) { this.keys = {}; this.player.clearKeys(); return; }
    this.player.update(dt);
    if (!this.inArea()) { this.close({ walkingAway: true }); return; }
    const g = this.game, s = this.site;
    if (!g.done) g.time += dt;
    if (this.active.id === 'augustaion') this.updateProcession(dt); else this.updateQueue(dt);
    this.place(s.crowd);
    const t = g.done ? null : this.nearest();
    let prompt;
    if (g.done) prompt = `${g.done.toUpperCase()} · R retry · Q / Esc return to the road`;
    else if (!t) prompt = this.active.id === 'augustaion' ? 'Walk ahead of the cross to the people blocking the lane' : 'Stand at the gold ring; walk up the line to hear those ahead';
    else if (t.role === 'bystander') prompt = `${t.name} · E ask to make room · F push through to the front`;
    else if (t.role === 'walker') prompt = g.paced ? 'Sergios keeps the pace of the slowest' : 'E · Ask Sergios to keep the pace of the slowest';
    else if (t.role === 'clerk') prompt = g.served < PETITIONERS.length ? 'E ask the clerk · F claim a connection with the Magistros' : 'E · Present your petition';
    else prompt = t.neglected && g.heard.has(t.name) && !g.helped ? `E hear ${t.name} · H help her state her request` : `E · Hear ${t.name}`;
    this.hud.showPrompt(prompt);
  }
  updateProcession(dt) {
    const g = this.game, { walkers, bystanders } = this.site;
    for (const b of bystanders) { b.z += (b.target - b.z) * Math.min(1, dt * 3); b.tilt = Math.max(0, (b.tilt ?? 0) - dt * 0.3); }
    if (!g.done) {
      const lead = walkers[0], rear = walkers.reduce((m, w) => Math.min(m, w.x), Infinity);
      const blocked = bystanders.some(b => !b.aside && b.x > lead.x && b.x - lead.x < 1.4);
      const waiting = g.paced && lead.x - rear > 6;
      const leadSpeed = blocked || waiting ? 0 : g.pushed ? 1.9 : lead.speed;
      lead.x += leadSpeed * dt;
      for (let i = 1; i < walkers.length; i++) {
        const w = walkers[i], ahead = walkers[i - 1];
        const room = ahead.x - 1.1 - w.x;
        const blockedW = bystanders.some(b => !b.aside && b.x > w.x && b.x - w.x < 1.2);
        if (room > 0 && !blockedW) w.x += Math.min(room, w.speed * dt);
      }
      if (lead.x >= END_X) {
        const together = walkers.every(w => lead.x - w.x < 7.5);
        this.finish(g.pushed ? 'proud' : together ? 'humble' : 'unfinished');
      } else if (g.time >= 150) this.finish('unfinished');
    }
    const lead = walkers[0];
    this.site.cross.position.set(lead.x, 1.9, lead.z); this.site.bar.position.set(lead.x, 2.1, lead.z);
    const together = walkers.filter(w => lead.x - w.x < 7.5).length;
    this.statusEl.textContent = `Distance to the palace ${Math.max(0, Math.ceil(END_X - lead.x))} · together ${together}/${walkers.length} · lane ${bystanders.filter(b => !b.aside).length ? 'crowded' : 'open'}${g.paced ? ' · walking at the slowest pace' : ''}`;
  }
  updateQueue(dt) {
    const g = this.game, s = this.site;
    if (!g.done && g.served < PETITIONERS.length) {
      g.timer += dt;
      if (g.timer >= 6) {
        g.timer = 0;
        const front = s.petitioners.find(p => !p.hidden && !p.aside);
        // The clerk passes over Eirene unless someone speaks for her.
        if (front.neglected && !g.helped) { front.aside = true; this.hud.message('The clerk calls past Eirene. She steps out of line, still holding her request.', 4500); }
        else front.hidden = true;
        g.served++;
      }
    }
    let place = 0;
    for (const p of s.petitioners) {
      if (p.hidden) continue;
      const tx = p.aside ? FRONT_X + 0.4 : FRONT_X + place * STEP, tz = p.aside ? QUEUE_Z - 1.6 : QUEUE_Z;
      if (!p.aside) place++;
      p.x += (tx - p.x) * Math.min(1, dt * 2.5); p.z += (tz - p.z) * Math.min(1, dt * 2.5);
    }
    // Eirene stays beside the gate until her request is carried with yours.
    if (g.helped) for (const p of s.petitioners) if (p.aside) p.hidden = true;
    const sx = FRONT_X + place * STEP;
    s.slot.position.set(sx, 0.16, QUEUE_Z);
    s.scroll.position.set(this.player.pos.x, 1.0, this.player.pos.z);
    const waiting = PETITIONERS.length - g.served;
    this.statusEl.textContent = `${waiting ? `${waiting} ahead of you` : 'Your turn'} · ${g.heard.size}/${PETITIONERS.length} heard · ${g.helped ? 'Eirene’s need is in your petition' : 'Your petition carries only your request'}`;
  }
  finish(outcome) {
    if (this.game.done) return;
    this.game.done = outcome; this.keys = {}; this.player.clearKeys();
    const key = `activity:${this.active.id}`, reward = outcome !== 'unfinished' && !this.branch.flags[key];
    if (reward) { this.branch.setFlag(key, outcome); if (outcome === 'humble') this.branch.addGrace(SITE_GRACE); else this.branch.addPride(SITE_PRIDE); this.branch.save(); this.onResult(); }
    const text = this.active.id === 'augustaion'
      ? outcome === 'humble' ? 'The procession reaches the palace together. Gerontios takes your arm for the last step.'
        : outcome === 'proud' ? 'You arrive first, at the front. Gerontios and Maria are still far behind in the square.'
        : 'The cross arrives, but some of the group were left behind. Try again.'
      : outcome === 'humble' ? 'The clerk breaks your seal and reads both requests. He calls Eirene back to the gate.'
        : outcome === 'proud' ? 'Your petition is taken first. Behind you, Eirene folds her request away.'
        : 'Your petition is received. Eirene’s request is still unheard.';
    this.hud.message(`${text} ${outcome === 'unfinished' ? 'Meters unchanged.' : reward ? outcome === 'humble' ? `(+${SITE_GRACE} grace)` : `(+${SITE_PRIDE} pride)` : 'Practice: meters unchanged.'}`, 7500);
  }
  close({ walkingAway = false } = {}) {
    this.keys = {};
    if (!walkingAway) this.player.clearKeys();
    this.active = null; this.el.style.display = 'none'; this.hud.hidePrompt();
    if (walkingAway) this.hud.message('', 0);
    this.leave({ walkingAway });
  }
  snapshot() {
    if (!this.active) return null; const g = this.game, s = this.site;
    return { id: this.active.id, outcome: g.done, time: g.time, pushed: g.pushed, paced: g.paced, heard: g.heard.size, helped: g.helped, served: g.served,
      lead: s.walkers?.[0].x, rear: s.walkers ? Math.min(...s.walkers.map(w => w.x)) : null };
  }
}

const ROOMS = { augustaion: 'The Augustaion', chalke: 'The Chalke' };
export default class extends PalaceActivities { get room() { return ROOMS[this.active?.id]; } }
