import * as THREE from 'three';
import { FEATURES } from './config.js';
import { ACTIVITY_STOPS } from './activitySites.js';
export const ACTIVITIES = ACTIVITY_STOPS;

const CHANNELS = ['Mill lane', 'Hospital', 'Homes', 'Patron’s fountain'];
const TESTIMONY = [
  'Merchant: “I saw him near my stall. I did not see him take it.”',
  'Porter: “My cart struck the counter. Something fell behind it. Please look there.”',
  'Sweeper: “The purse fell when the cart caught the cloth. I tried to speak, but the crowd shouted.”',
  'The purse lies under a folded cloth. Its seal is unbroken.',
];

// One lightweight coordinator; props stay in their landmark's existing scene.
export class LocationActivities {
  constructor({ level, player, branch, parent, hud, leave, onResult }) {
    Object.assign(this, { level, player, branch, hud, leave, onResult });
    this.keys = {}; this.active = null; this.sites = new Map();
    this.el = document.createElement('div'); this.el.id = 'world-activity-hud'; this.el.className = 'panel';
    this.el.style.cssText = 'display:none;top:72px;left:50%;transform:translateX(-50%);max-width:90%;text-align:center;font-size:11px;line-height:1.7;pointer-events:none';
    this.el.innerHTML = '<strong style="color:var(--gold)"></strong><div class="world-status"></div><div>WASD walk · Q / Esc leave · R retry</div>';
    parent.appendChild(this.el);
    this.statusEl = this.el.querySelector('.world-status');
    this.bodyGeometry = new THREE.CylinderGeometry(0.22, 0.3, 1.05, 6);
    this.headGeometry = new THREE.SphereGeometry(0.18, 6, 5);
    this.skin = new THREE.MeshLambertMaterial({ color: 0xb68b68 });
    this.waterMaterial = new THREE.MeshLambertMaterial({ color: 0x57a9c5 });
    window.addEventListener('blur', () => { this.keys = {}; this.player.clearKeys(); });
  }
  label(group, text, x, y, z) {
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 64;
    const c = canvas.getContext('2d'); c.fillStyle = '#20180fe6'; c.fillRect(0, 0, 512, 64);
    c.fillStyle = '#f3d276'; c.font = '24px monospace'; c.textAlign = 'center'; c.fillText(text, 256, 42);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas) }));
    sprite.position.set(x, y, z); sprite.scale.set(3.2, 0.4, 1); group.add(sprite);
    (group.userData.labels ??= []).push(sprite);
  }
  person(group, name, role, x, z, color) {
    const figure = new THREE.Group(); figure.position.set(x, 0, z);
    const body = new THREE.Mesh(this.bodyGeometry, new THREE.MeshLambertMaterial({ color })); body.position.y = 0.58;
    const head = new THREE.Mesh(this.headGeometry, this.skin); head.position.y = 1.3;
    figure.add(body, head); group.add(figure); this.label(group, name, x, 1.9, z);
    const target = { name, role, x, z, figure };
    target.npc = { id: `activity-${role}`, name, role: 'witness', x, z };
    this.level.npcs.push(target.npc);
    return target;
  }
  build(id) {
    if (this.sites.has(id)) return this.sites.get(id);
    const group = new THREE.Group(); group.name = `world-activity-${id}`; this.level.featureGroups[id].add(group);
    const wood = this.level.mat.get('wood_floor'), stone = this.level.mat.get('stone_wall');
    const site = { group, targets: [] };
    if (id === 'aqueduct') {
      site.keeper = this.person(group, 'Eudokia · Water keeper', 'keeper', 47, 80, 0x687e69);
      site.targets.push(site.keeper); site.water = []; site.handles = [];
      const basinGeometry = new THREE.BoxGeometry(1.5, 0.12, 1.5), edgeGeometry = new THREE.BoxGeometry(1.6, 0.65, 0.12);
      const waterGeometry = new THREE.BoxGeometry(1.36, 0.52, 1.36), handleGeometry = new THREE.TorusGeometry(0.28, 0.055, 4, 12);
      for (let i = 0; i < 4; i++) {
        const x = 52.2, z = 80 + i * 3;
        const basin = new THREE.Mesh(basinGeometry, stone); basin.position.set(x, 0.06, z); group.add(basin);
        for (let side = 0; side < 4; side++) {
          const edge = new THREE.Mesh(edgeGeometry, stone); edge.rotation.y = side * Math.PI / 2;
          edge.position.set(x + Math.sin(side * Math.PI / 2) * 0.75, 0.35, z + Math.cos(side * Math.PI / 2) * 0.75); group.add(edge);
        }
        const water = new THREE.Mesh(waterGeometry, this.waterMaterial); water.position.set(x, 0.12, z); group.add(water); site.water.push(water);
        const handle = new THREE.Mesh(handleGeometry, wood); handle.position.set(x - 1.1, 0.95, z); group.add(handle); site.handles.push(handle);
        site.targets.push({ name: CHANNELS[i], role: 'gate', index: i, x: x - 1.1, z });
        this.label(group, CHANNELS[i], x, 1.8, z);
      }
      const gauge = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.2, 0.12), stone); gauge.position.set(49, 1.1, 80); group.add(gauge);
      site.needle = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.06, 0.16), this.waterMaterial); group.add(site.needle);
      for (const fraction of [0.3, 0.8]) {
        const mark = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.035, 0.13), wood); mark.position.set(49, 0.5 + fraction * 1.2, 80); group.add(mark);
      }
      this.label(group, 'Pressure · between marks', 49, 2.3, 80);
    } else {
      site.targets.push(this.person(group, 'Leontios · Cloth merchant', 'merchant', 51.5, 157.5, 0x995942));
      site.targets.push(this.person(group, 'Menas · Young porter', 'porter', 47, 160.5, 0x537887));
      site.targets.push(this.person(group, 'Anna · Square sweeper', 'sweeper', 51.5, 163.5, 0x777347));
      const stall = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.85, 1.2), wood); stall.position.set(53, 0.425, 156); group.add(stall);
      const cloth = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.06, 0.6), new THREE.MeshLambertMaterial({ color: 0x7f4262 })); cloth.position.set(53, 0.1, 154.8); group.add(cloth);
      site.purse = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), new THREE.MeshLambertMaterial({ color: 0xb29552 })); site.purse.scale.set(1, 0.7, 1); site.purse.position.set(53.3, 0.17, 154.7); group.add(site.purse);
      site.targets.push({ name: 'Behind the stall · Purse', role: 'purse', x: 53, z: 154.8 });
      this.label(group, 'Inspect behind the stall', 53, 1.8, 154.8);
    }
    // Keep the road free: the water court sits beside the arches, while the
    // Forum scene occupies its eastern court, clear of the column and portico.
    const offset = id === 'aqueduct' ? -18 : -20;
    group.position.x = offset;
    for (const target of site.targets) {
      target.x += offset;
      if (target.npc) target.npc.x = target.x;
    }
    if (id === 'aqueduct') {
      for (let i = 0; i < 4; i++) this.level.addCollider(52.2 + offset, 80 + i * 3, 1.6, 1.6, 0.7, id);
    } else this.level.addCollider(53 + offset, 156, 1.7, 1.2, 0.85, id);
    this.sites.set(id, site); return site;
  }
  start(def) {
    this.active = def; this.site = this.build(def.id); this.keys = {}; this.player.clearKeys();
    this.game = { water: 64, filled: [0,0,0,0], selected: -1, time: 0, advice: false, done: null, seen: new Set(), asked: false };
    this.el.style.display = 'block'; this.el.querySelector('strong').textContent = def.id === 'aqueduct' ? 'THE WATER KEEPER' : 'THE PURSE IN THE SQUARE';
    this.hud.message(def.id === 'aqueduct' ? 'Fill the mill, hospital and homes. A patron wants his fountain filled first.' : 'The merchant accuses Menas. Hear the witnesses and inspect behind the stall.', 7000);
    if (this.site.purse) this.site.purse.visible = true;
    this.update(0);
  }
  nearest() {
    return this.site.targets.reduce((best, t) => {
      const distance = Math.hypot(this.player.pos.x-t.x, this.player.pos.z-t.z);
      return distance < 1.8 && (!best || distance < best.distance) ? { ...t, distance } : best;
    }, null);
  }
  key(e, down) {
    if (!this.active) return;
    this.player.onKey(e, down); this.keys[e.code] = down;
    if (['Space','KeyE','KeyF','KeyH','KeyQ','KeyR','Escape'].includes(e.code)) e.preventDefault();
    if (!down || e.repeat) return;
    if (e.code === 'KeyQ' || e.code === 'Escape') { this.close(); return; }
    if (e.code === 'KeyR') { this.start(this.active); return; }
    if (this.game.done) return;
    const target = this.nearest(); if (!target) return;
    if (this.active.id === 'aqueduct') {
      if (e.code === 'KeyE' && target.role === 'keeper') {
        this.game.advice = true; this.hud.message('Eudokia: “Open while the pressure sits between the marks. Each neighborhood needs eighteen measures.”', 6500);
      }
    } else if (e.code === 'KeyE') {
      const index = ['merchant','porter','sweeper','purse'].indexOf(target.role);
      this.game.seen.add(`Digit${index+1}`); this.hud.message(TESTIMONY[index], 6500);
    } else if (target.role === 'merchant' && e.code === 'KeyF') this.finish('proud');
    else if (target.role === 'merchant' && e.code === 'KeyH') {
      if (['Digit2','Digit3','Digit4'].every(k=>this.game.seen.has(k))) { this.site.purse.visible = false; this.finish('humble'); }
      else { this.game.asked = true; this.hud.message('“I do not yet know.” Hear Menas and Anna and inspect behind the stall before explaining.', 6500); }
    }
  }
  update(dt) {
    if (!this.active) return;
    if (FEATURES[this.active.id] === false) { this.close(); return; }
    if (document.hidden) { this.keys = {}; this.player.clearKeys(); return; }
    this.player.update(dt);
    for (const label of this.site.group.userData.labels) {
      const distance = Math.hypot(label.position.x + this.site.group.position.x - this.player.pos.x, label.position.z - this.player.pos.z);
      const scale = THREE.MathUtils.clamp(distance / 4, 0.2, 1);
      label.scale.set(2.4 * scale, 0.3 * scale, 1);
    }
    const g = this.game, target = this.nearest();
    if (this.active.id === 'aqueduct') {
      const pressure = (Math.sin(g.time * 1.8)+1)/2;
      if (!g.done) {
        g.time += dt; g.selected = target?.role === 'gate' ? target.index : -1;
        if (this.keys.Space && g.selected >= 0 && g.filled[g.selected] < 18) {
          const amount = Math.min(g.water, dt*4, (18-g.filled[g.selected])/0.55);
          g.water -= amount; g.filled[g.selected] = Math.min(18, g.filled[g.selected]+amount*(pressure>0.3&&pressure<0.8?1:g.advice?0.8:0.55));
        }
        if (g.filled.slice(0,3).every(n=>n>=18)||g.water<=0.001||g.time>=100)
          this.finish(g.filled[3]>=12?'proud':g.filled.slice(0,3).every(n=>n>=18)?'humble':'unfinished');
      }
      this.site.water.forEach((mesh,i)=> { const height=g.filled[i]/18; mesh.scale.y=Math.max(0.001,height); mesh.position.y=0.12+0.26*height; this.site.handles[i].rotation.z=g.selected===i&&this.keys.Space?g.time*2:0; });
      this.site.needle.position.set(49, 0.5+pressure*1.2, 80);
      this.statusEl.textContent = `Reservoir ${Math.ceil(g.water)} · pressure ${Math.round(pressure*100)}% (30–80) · neighborhoods supplied ${g.filled.slice(0,3).filter(n=>n>=18).length}/3`;
    } else this.statusEl.textContent = `${g.seen.size}/4 accounts inspected · ${g.asked?'You asked for time to listen':'The crowd wants a quick answer'}`;
    this.hud.showPrompt(g.done ? `${g.done.toUpperCase()} · R retry · Q / Esc return to the road` : target ? this.active.id==='aqueduct' ? target.role==='keeper'?'E · Ask Eudokia for advice':`${target.name} · Hold Space to open gate` : target.role==='merchant'?'E hear merchant · F accuse Menas · H explain and return purse':`E · ${target.role==='purse'?'Inspect':'Hear'} ${target.name}` : 'Walk to the labeled gates or witnesses · Q / Esc leave');
  }
  finish(outcome) {
    if (this.game.done) return;
    this.game.done = outcome; this.keys = {}; this.player.clearKeys();
    const key=`activity:${this.active.id}`, reward=outcome!=='unfinished'&&!this.branch.flags[key];
    if (reward) { this.branch.setFlag(key,outcome); if(outcome==='humble')this.branch.addGrace(3);else this.branch.addPride(4);this.branch.save();this.onResult(); }
    const text = this.active.id==='aqueduct' ? outcome==='humble'?'Water reaches the mill, hospital and homes. Eudokia nods.':outcome==='proud'?'The patron praises his fountain. Households still wait.':'The reservoir ran short. Ask the keeper and try again.' : outcome==='humble'?'You return the purse and explain the accident. Leontios apologizes; Menas is cleared and Anna is heard.':'The crowd applauds your certainty. Menas protests the accusation.';
    this.hud.message(`${text} ${outcome==='unfinished'?'Meters unchanged.':reward?outcome==='humble'?'(+3 grace)':'(+4 pride)':'Practice: meters unchanged.'}`, 7500);
  }
  close() { this.keys={};this.player.clearKeys();this.active=null;this.el.style.display='none';this.hud.hidePrompt();this.leave(); }
  snapshot() { if(!this.active)return null;const g=this.game;return {id:this.active.id,outcome:g.done,water:g.water,filled:[...g.filled],time:g.time,evidence:[...g.seen]}; }
}
