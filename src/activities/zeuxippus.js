import * as THREE from 'three';
import { SiteActivity } from './siteKit.js';

// The Baths of Zeuxippus: bring a basin to a safe warmth and lay mats over the
// wet tiles, then either take the bath yourself or prepare it for an older visitor.
const Z = 312.2;                                   // the walk from the bench to the basin
const TILES = [35.5, 32.5, 29.5, 26.5, 23.5];
const WET = [1, 3, 4];
const BENCH = { x: 38, z: Z }, BASIN = { x: 20, z: Z };
const BAND = [0.45, 0.65];                         // comfortable warmth
const CLOSING = 150;                               // seconds until the basin is drained
const COLD = new THREE.Color(0x3f7fb0), HOT = new THREE.Color(0xd0704a);

export default class ZeuxippusActivity extends SiteActivity {
  constructor(options) {
    super({ ...options, id: 'zeuxippus', room: 'The Baths of Zeuxippus', title: 'THE WARM BASIN' });
  }
  build(site) {
    const { group, targets } = site, stone = this.level.mat.get('stone_floor'), wood = this.level.mat.get('wood_floor');
    const tileGeometry = new THREE.BoxGeometry(1.4, 0.04, 1.4);
    const dry = new THREE.MeshLambertMaterial({ color: 0xcfc6b4 });
    const wet = new THREE.MeshStandardMaterial({ color: 0x8fb6c8, roughness: 0.08, metalness: 0.3 });
    site.mats = [];
    TILES.forEach((x, i) => {
      const tile = new THREE.Mesh(tileGeometry, WET.includes(i) ? wet : dry); tile.position.set(x, 0.12, Z); group.add(tile);
      if (!WET.includes(i)) return;
      const mat = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.06, 1.3), wood); mat.position.set(x, 0.17, Z); group.add(mat);
      site.mats.push(mat);
      targets.push({ name: 'Wet tile', role: 'tile', index: site.mats.length - 1, x, z: Z, range: 1.4 });
    });
    const rim = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.42, 2.4), stone); rim.position.set(BASIN.x, 0.21, BASIN.z); group.add(rim);
    site.water = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.06, 2.1), new THREE.MeshLambertMaterial({ color: COLD })); site.water.position.set(BASIN.x, 0.44, BASIN.z); group.add(site.water);
    this.level.addCollider(BASIN.x, BASIN.z, 2.4, 2.4, 0.42, 'zeuxippus');
    // Steam rises once the water passes comfortable.
    site.steam = new THREE.InstancedMesh(new THREE.SphereGeometry(0.22, 6, 5), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 }), 5);
    group.add(site.steam);
    const post = new THREE.CylinderGeometry(0.06, 0.06, 0.9, 6), wheel = new THREE.TorusGeometry(0.2, 0.05, 4, 12);
    for (const [name, role, x, color] of [['Warm tap', 'warm', 19.3, 0xb5523a], ['Cool tap', 'cool', 20.7, 0x3d6fa8]]) {
      const p = new THREE.Mesh(post, stone); p.position.set(x, 0.45, 310.4);
      const w = new THREE.Mesh(wheel, new THREE.MeshLambertMaterial({ color })); w.position.set(x, 0.95, 310.4);
      group.add(p, w); site[role] = w;
      targets.push({ name, role, x, z: 310.4, range: 1.2 });
      this.label(group, name, x, 1.5, 310.4 - 0.1);
    }
    targets.push({ name: 'The basin', role: 'basin', x: BASIN.x, z: BASIN.z, range: 2 });
    site.stack = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.5, 1.2), wood); site.stack.position.set(37.5, 0.25, 308.5); group.add(site.stack);
    targets.push({ name: 'Bath mats', role: 'stack', x: 37.5, z: 308.5 });
    this.label(group, 'Bath mats', 37.5, 1.2, 308.5);
    site.carried = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.05, 0.6), wood); group.add(site.carried);
    site.visitor = this.person(group, 'Theodora · Older bather', 'visitor', BENCH.x, BENCH.z, 0x8a6f8e);
    site.guest = this.person(group, 'Bather', 'guest', 44, Z, 0x6f8a6a, false);
    targets.push(site.visitor);
  }
  reset(g) {
    Object.assign(g, { warmth: 0.15, covered: WET.map(() => false), carrying: false, walking: false, along: 0, wobble: 0, guest: 0, flow: null });
    const s = this.site;
    s.mats.forEach(m => { m.visible = false; });
    for (const t of s.targets) if (t.role === 'tile') t.hidden = false;
    this.place(s.visitor, BENCH.x, BENCH.z); s.visitor.figure.position.y = 0;
    s.guest.figure.visible = false; this.place(s.guest, 44, Z); s.guest.figure.position.y = 0;
    this.hud.message('The basin is cold and the walk from the bench is wet. Theodora waits on the bench with her cane.', 7000);
  }
  safe() { return this.game.covered.every(Boolean); }
  comfortable() { const w = this.game.warmth; return w >= BAND[0] && w <= BAND[1]; }
  act(code, target) {
    const g = this.game, s = this.site;
    if (!target) return;
    if (code === 'KeyE' && target.role === 'stack' && !g.carrying) { g.carrying = true; }
    else if (code === 'KeyE' && target.role === 'tile' && g.carrying) {
      g.carrying = false; g.covered[target.index] = true; s.mats[target.index].visible = true; target.ref.hidden = true;
    } else if (code === 'KeyE' && target.role === 'visitor' && !g.walking) {
      if (!this.safe()) { g.wobble = 1; this.hud.message('Theodora steps toward the shining tiles, sways, and sits back down. “One fall at my age ends my bathing.”', 6500); }
      else if (!this.comfortable()) this.hud.message(`Theodora watches the basin. “${g.warmth > BAND[1] ? 'That steam would scald me.' : 'That water is too cold for my joints.'}”`, 6000);
      else { g.walking = true; this.hud.message('Theodora rises and crosses on the mats, one careful step at a time.', 6000); }
    } else if (code === 'KeyF' && target.role === 'basin' && !g.walking) {
      if (this.comfortable()) this.finish('proud', 'You settle into the warm basin and tell the attendant it is taken. Theodora waits on the bench.');
      else this.hud.message(g.warmth > BAND[1] ? 'Steam rises off the water. It is too hot to sit in.' : 'The water is cold. Warm it first.', 4000);
    }
  }
  tick(dt, target) {
    const g = this.game, s = this.site, p = this.player.pos;
    g.flow = !g.done && this.keys.Space && ['warm', 'cool'].includes(target?.role) ? target.role : null;
    if (!g.done) {
      if (g.flow === 'warm') g.warmth = Math.min(1, g.warmth + dt * 0.22);
      else if (g.flow === 'cool') g.warmth = Math.max(0, g.warmth - dt * 0.22);
      else g.warmth = Math.max(0.15, g.warmth - dt * 0.006);   // the basin slowly cools
      if (g.walking) {
        g.along = Math.min(1, g.along + dt * 1.4 / (BENCH.x - BASIN.x - 1.6));
        this.place(s.visitor, BENCH.x - g.along * (BENCH.x - BASIN.x - 1.6), Z);
        if (g.along >= 1) this.finish('humble', 'Theodora lowers herself into the warm water and closes her eyes. Your own bath can wait.');
      } else if (g.time >= CLOSING) this.finish('unfinished', 'The attendant drains the basin for the evening. Try again tomorrow.');
    }
    if (g.done === 'humble') {
      // Others use the space you prepared: Theodora sits in, and another bather follows the mats.
      s.visitor.figure.position.y = -0.25;
      s.guest.figure.visible = true; g.guest = Math.min(1, g.guest + dt * 0.12);
      this.place(s.guest, 44 - g.guest * (44 - BASIN.x - 1.8), Z + (g.guest > 0.85 ? 1.2 * (g.guest - 0.85) / 0.15 : 0));
    }
    s.visitor.figure.rotation.z = Math.sin(g.wobble * 18) * 0.2 * g.wobble; g.wobble = Math.max(0, g.wobble - dt);
    s.water.material.color.copy(COLD).lerp(HOT, g.warmth);
    s.warm.rotation.y += g.flow === 'warm' ? dt * 6 : 0; s.cool.rotation.y += g.flow === 'cool' ? dt * 6 : 0;
    const steam = Math.max(0, (g.warmth - BAND[1]) / (1 - BAND[1]));
    s.steam.material.opacity = steam * 0.55;
    const m = new THREE.Matrix4();
    for (let i = 0; i < 5; i++) { const rise = (g.time * 0.5 + i / 5) % 1; m.makeTranslation(BASIN.x - 0.6 + i * 0.3, 0.6 + rise * 1.6, BASIN.z + Math.sin(i * 2.1) * 0.5); s.steam.setMatrixAt(i, m); }
    s.steam.instanceMatrix.needsUpdate = true;
    const forward = new THREE.Vector3(0, 0, -0.7).applyEuler(new THREE.Euler(0, this.player.camera.rotation.y, 0));
    s.carried.visible = g.carrying; s.carried.position.set(p.x + forward.x, 0.9, p.z + forward.z);
  }
  status() {
    const g = this.game, w = Math.round(g.warmth * 100);
    const feel = g.warmth > BAND[1] ? 'steaming' : g.warmth >= BAND[0] ? 'comfortable' : 'cold';
    return `Basin ${w}° (${feel}, comfortable ${BAND[0] * 100}–${BAND[1] * 100}) · wet tiles covered ${g.covered.filter(Boolean).length}/${WET.length}${g.carrying ? ' · carrying a mat' : ''}`;
  }
  prompt(target) {
    const g = this.game;
    if (!target) return g.carrying ? 'Carry the mat to a shining wet tile' : 'Warm the basin, cover the wet tiles, and see to Theodora · Q / Esc leave';
    if (target.role === 'warm' || target.role === 'cool') return `${target.name} · Hold Space to run it`;
    if (target.role === 'stack') return g.carrying ? 'You are carrying a mat' : 'E · Take a bath mat';
    if (target.role === 'tile') return g.carrying ? 'E · Lay the mat on the wet tile' : 'Wet tile · fetch a mat from the stack';
    if (target.role === 'visitor') return g.walking ? 'Theodora is crossing' : 'E · Offer Theodora the basin';
    if (target.role === 'basin') return g.walking ? 'The basin is ready for Theodora' : 'F · Take the basin for yourself';
    return '';
  }
  snapshot() {
    if (!this.active) return null; const g = this.game;
    return { id: this.id, outcome: g.done, warmth: g.warmth, covered: [...g.covered], carrying: g.carrying, walking: g.walking, visitor: { x: this.site.visitor.x, z: this.site.visitor.z }, guest: g.guest };
  }
}
