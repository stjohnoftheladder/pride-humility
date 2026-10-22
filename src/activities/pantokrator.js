// Pantokrator Monastery: the hospital tray. Learn each bedside need, set the
// tray, and walk it to the beds without spilling. Pride serves the patron
// first or claims Theophano's poultice; humility follows need and shares credit.
import * as THREE from 'three';
import { SiteActivity } from './siteKit.js';

const ITEMS = [
  { id: 'water', name: 'Cool water', color: 0x6fb7d6, liquid: true },
  { id: 'bread', name: 'Bread', color: 0xc4955a },
  { id: 'poultice', name: 'Theophano’s poultice', color: 0x7d9a5b },
  { id: 'wine', name: 'Honeyed wine', color: 0x8a2f3c, liquid: true },
];
const PATIENTS = [
  { id: 'patron', name: 'Lord Andronikos · Patron', need: 'wine', z: 117, color: 0x6b3f8f, sitting: true,
    ask: 'Andronikos: “Honeyed wine, and quickly. My family endowed these beds.” He looks comfortable.' },
  { id: 'fever', name: 'Basil · Fever', need: 'water', z: 121.5, color: 0x8b8b7a,
    ask: 'Basil shivers under his blanket: “Water… I am burning.”' },
  { id: 'wound', name: 'Maria · Wounded hand', need: 'poultice', z: 126, color: 0x7a6a8e,
    ask: 'Maria holds out a bound hand, stained through: “The dressing needs changing.”' },
];
const TABLE = { x: 64.2, z: 112.5 }, BED_X = 70.8;

export class PantokratorActivity extends SiteActivity {
  clock = false;
  listPeople = true;
  title = 'THE HOSPITAL TRAY';
  room = 'The Pantokrator Monastery';
  controls = 'WASD walk (walk, do not run, with liquids) · E pick up / serve / ask · Q / Esc leave · R retry';
  intro = 'Three patients wait. Learn what each needs, set the tray at the table, and carry it to the beds.';
  area = { minX: 54, maxX: 78, minZ: 106, maxZ: 134 };
  build(group) {
    const wood = this.level.mat.get('wood_floor'), plaster = this.level.mat.get('plaster');
    const table = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.9, 0.9), wood);
    table.position.set(TABLE.x, 0.45, TABLE.z); group.add(table);
    this.level.addCollider(TABLE.x, TABLE.z, 4.6, 0.9, 0.9, 'pantokrator');
    const itemGeometry = new THREE.CylinderGeometry(0.16, 0.18, 0.28, 8);
    this.itemMaterials = {};
    ITEMS.forEach((item, i) => {
      const x = TABLE.x - 1.8 + i * 1.2;
      const material = this.itemMaterials[item.id] = new THREE.MeshLambertMaterial({ color: item.color });
      const mesh = new THREE.Mesh(itemGeometry, material); mesh.position.set(x, 1.04, TABLE.z); group.add(mesh);
      this.site.targets.push({ name: item.name, role: 'item', item: item.id, x, z: TABLE.z + 1.1, mesh });
      this.label(group, item.name, x, 1.55, TABLE.z);
    });
    const bedGeometry = new THREE.BoxGeometry(1, 0.5, 2.1);
    this.patients = PATIENTS.map((p) => {
      const bed = new THREE.Mesh(bedGeometry, plaster); bed.position.set(BED_X, 0.25, p.z); group.add(bed);
      this.level.addCollider(BED_X, p.z, 1, 2.1, 0.5, 'pantokrator');
      const target = this.person(group, p.name, p.id, BED_X, p.z, p.color);
      if (!p.sitting) { target.figure.rotation.x = -Math.PI / 2; target.figure.position.y = 0.62; target.figure.position.z += 0.6; }
      else target.figure.position.y = 0.3;
      const t = { ...target, ...p, role: 'patient', x: BED_X - 1.5, z: p.z };
      this.site.targets.push(t);
      return t;
    });
    this.theophano = this.person(group, 'Theophano · Attendant', 'attendant', 67.5, 116, 0x5f7f6a);
    this.site.targets.push({ ...this.theophano, role: 'attendant' });
    this.physician = this.person(group, 'Nikolaos · Physician', 'physician', 66.5, 129, 0x4b5f7c);
    this.site.targets.push({ ...this.physician, role: 'physician' });
    // The tray floats before the pilgrim's hands while anything is on it.
    this.tray = new THREE.Group();
    this.tray.add(new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.04, 0.42), wood));
    this.trayItems = ITEMS.map((item) => {
      const mesh = new THREE.Mesh(itemGeometry, this.itemMaterials[item.id]); mesh.scale.setScalar(0.6); mesh.visible = false;
      this.tray.add(mesh); return mesh;
    });
    group.add(this.tray);
    this.puddle = new THREE.Mesh(new THREE.CircleGeometry(0.55, 12), this.itemMaterials.water);
    this.puddle.rotation.x = -Math.PI / 2; this.puddle.visible = false; group.add(this.puddle);
    this.lastVel = new THREE.Vector2();
  }
  reset() {
    for (const p of this.patients) { p.figure.rotation.y = 0; }
    this.puddle.visible = false;
    this.lastVel.set(this.player.vel.x, this.player.vel.z);
    return { tray: [], known: new Set(), served: [], slosh: 0, spills: 0, asked: false, credit: null };
  }
  act(code, target) {
    const g = this.game;
    if (!target || code !== 'KeyE' && code !== 'KeyF' && code !== 'KeyH') return;
    if (target.role === 'item' && code === 'KeyE') {
      const at = g.tray.indexOf(target.item);
      if (at >= 0) { g.tray.splice(at, 1); this.hud.message(`${target.name} returned to the table.`, 2500); }
      else if (g.tray.length >= 2) this.hud.message('The tray holds two things. Return one first.', 3000);
      else { g.tray.push(target.item); this.audio?._t(520, 0.08, 'triangle', 0.08); }
    } else if (target.role === 'patient' && code === 'KeyE') {
      if (g.served.includes(target.id)) { this.hud.message(`${target.name.split(' ·')[0]} rests more easily now.`, 3000); return; }
      g.known.add(target.id);
      const at = g.tray.indexOf(target.need);
      if (at < 0) { this.hud.message(target.ask, 6000); return; }
      g.tray.splice(at, 1); g.served.push(target.id); this.audio?._t(660, 0.12, 'sine', 0.08);
      this.hud.message(target.id === 'patron' ? 'Andronikos drinks and waves you on.' : target.id === 'fever' ? 'Basil drinks and his shivering eases.' : 'The fresh poultice settles; Maria’s hand stills.', 4500);
    } else if (target.role === 'attendant' && code === 'KeyE') {
      g.asked = true; for (const p of this.patients) g.known.add(p.id);
      this.hud.message('Theophano: “Basil’s fever comes first, then Maria’s hand; the patron can wait. I made the poultice this morning. Walk with liquids: running spills them.”', 8000);
    } else if (target.role === 'physician') {
      if (g.served.length < 3) { if (code === 'KeyE') this.hud.message('Nikolaos: “See to all three first. Then tell me how it went.”', 4000); return; }
      if (code === 'KeyF') { g.credit = 'claimed'; this.finish('proud'); }
      else if (code === 'KeyH') { g.credit = 'shared'; this.finish(g.served[0] === 'patron' ? 'proud' : 'humble'); }
      else this.hud.message('Nikolaos: “Fine work. Who prepared the poultice?” F · “I did.” · H · “Theophano did.”', 6000);
    }
  }
  tick(dt) {
    const g = this.game, vel = this.player.vel;
    if (dt > 0) {
      const speed = Math.hypot(vel.x, vel.z), accel = Math.hypot(vel.x - this.lastVel.x, vel.z - this.lastVel.y) / dt;
      const want = Math.max(0, (speed - 5.6) / 1.4) + accel / 90;
      g.slosh += (want - g.slosh) * Math.min(1, dt * 4);
    }
    this.lastVel.set(vel.x, vel.z);
    if (!g.done && g.slosh > 1 && g.tray.some((id) => ITEMS.find((i) => i.id === id).liquid)) {
      g.tray = g.tray.filter((id) => !ITEMS.find((i) => i.id === id).liquid); g.spills++;
      this.puddle.position.set(this.player.pos.x, 0.09, this.player.pos.z); this.puddle.visible = true;
      this.audio?._noise(0.25, 0.12, 900);
      this.hud.message('The cup tips and spills across the floor. Walk back to the table and pour again.', 4500);
    }
    // physical feedback: the tray rides before the camera and tilts with the slosh
    const cam = this.player.camera, yaw = cam.rotation.y;
    this.tray.visible = g.tray.length > 0;
    this.tray.position.set(this.player.pos.x - Math.sin(yaw) * 0.7, 1.05, this.player.pos.z - Math.cos(yaw) * 0.7);
    this.tray.rotation.set(Math.sin(performance.now() / 90) * Math.min(0.5, g.slosh * 0.35), yaw, 0);
    this.trayItems.forEach((mesh, i) => { const at = g.tray.indexOf(ITEMS[i].id); mesh.visible = at >= 0; mesh.position.set(at === 0 ? -0.15 : 0.15, 0.1, 0); });
    for (const p of this.patients) {
      const waiting = !g.served.includes(p.id);
      p.figure.position.x = BED_X + (p.id === 'fever' && waiting ? Math.sin(performance.now() / 40) * 0.03 : 0);
    }
  }
  status() {
    const g = this.game;
    const needs = this.patients.map((p) => `${p.name.split(' ·')[0]}: ${g.served.includes(p.id) ? 'cared for' : g.known.has(p.id) ? ITEMS.find((i) => i.id === p.need).name : '?'}`).join(' · ');
    const tray = g.tray.map((id) => ITEMS.find((i) => i.id === id).name).join(', ') || 'empty';
    return `Tray: ${tray} · steadiness ${Math.max(0, Math.round((1 - g.slosh) * 100))}% · ${needs}`;
  }
  prompt(target) {
    const g = this.game;
    if (!target) return '';
    if (target.role === 'item') return `E · ${g.tray.includes(target.item) ? 'Return' : 'Put on the tray:'} ${target.name}`;
    if (target.role === 'patient') return `E · ${g.tray.includes(target.need) && !g.served.includes(target.id) ? 'Serve' : 'Ask'} ${target.name.split(' ·')[0]}`;
    if (target.role === 'attendant') return 'E · Ask Theophano what each patient needs';
    return g.served.length < 3 ? 'E · Speak with Nikolaos' : 'E hear Nikolaos · F “I did it all” · H “Theophano made the poultice”';
  }
  resultText(outcome) {
    const g = this.game;
    if (outcome === 'humble') return 'Basil and Maria were cared for first. Nikolaos thanks Theophano too, and she shows you how to fold a dressing.';
    if (g.credit === 'claimed') return 'Nikolaos praises you. Theophano says nothing and gathers her bowls.';
    return 'Andronikos was served first while Basil shivered. Nikolaos frowns at the order.';
  }
  details() { const g = this.game; return { tray: [...g.tray], known: [...g.known], served: [...g.served], spills: g.spills, slosh: g.slosh, asked: g.asked, credit: g.credit }; }
}
export default PantokratorActivity;
