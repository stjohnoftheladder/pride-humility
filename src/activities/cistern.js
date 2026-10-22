import * as THREE from 'three';
import { SiteActivity } from './siteKit.js';

// The Basilica Cistern: walk the dark rim with a lamp, follow the echoes to a
// worker whose lamp went out, then either race for the exit or guide him out.
const OIL = 90;               // seconds of lamp oil
const LIGHT = 5;              // how far the lamp lets someone see the kerb
const WORKER_SPEED = 2.6;     // half a walking pace: guiding means slowing down
const HOME = { x: 7.5, z: 288 };
const EXIT = { x0: 40.5, z0: 287.5, z1: 294.5 };
const LANES = [[14, 280], [20, 281], [26, 280], [32, 281], [14, 296], [20, 295], [26, 296], [32, 295]];

export default class CisternActivity extends SiteActivity {
  constructor(options) {
    super({ ...options, id: 'cistern', room: 'The Basilica Cistern', title: 'THE LAMP IN THE CISTERN' });
    this.scene = this.level.scene;
  }
  build(site) {
    const { group, targets } = site, stone = this.level.mat.get('stone_wall');
    // A low vault closes out the sky while the lamp is lit.
    site.vault = new THREE.Mesh(new THREE.BoxGeometry(37, 0.3, 19), new THREE.MeshLambertMaterial({ color: 0x1b1612 }));
    site.vault.position.set(24, 3.15, 288); site.vault.visible = false; group.add(site.vault);
    // Column lanes along the dry rim: the walk weaves between them.
    const shafts = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.3, 0.34, 3, 8), stone, LANES.length);
    const m = new THREE.Matrix4();
    LANES.forEach(([x, z], i) => { m.makeTranslation(x, 1.5, z); shafts.setMatrixAt(i, m); this.level.addCollider(x, z, 0.7, 0.7, 3, 'cistern'); });
    group.add(shafts);
    site.lamp = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffc46a }));
    site.light = new THREE.PointLight(0xffb45a, 0, 9, 1.6);
    group.add(site.lamp, site.light);
    // Echo rings spread on the water beside the missing worker.
    site.ring = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 24).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0xcfe6f0, transparent: true, opacity: 0 }));
    site.ring.position.set(10.2, 0.1, 288); group.add(site.ring);
    site.worker = this.person(group, 'Theodoros · Water worker', 'worker', HOME.x, HOME.z, 0x5d6b77);
    site.foreman = this.person(group, 'Ioannes · Foreman', 'foreman', 44.2, 293.4, 0x7a5a3a);
    site.bearer = this.person(group, 'Pelagia · Next lamp bearer', 'bearer', 44.2, 288.6, 0x6e5f82);
    site.foreman.range = 2.6;
    targets.push(site.worker, site.foreman);
  }
  reset(g) {
    Object.assign(g, { oil: OIL, found: false, sharing: false, waiting: false, trail: [], echo: 0, last: Infinity, louder: false, passed: 0 });
    const s = this.site;
    this.place(s.worker, HOME.x, HOME.z); this.place(s.bearer, 44.2, 288.6);
    s.lamp.visible = true; s.vault.visible = true;
    this.hud.message('A worker has not come back from the far wall. Follow the echoes along the rim. Your lamp holds ninety seconds of oil.', 7000);
    this.darken();
  }
  /** Dim the day while inside; the pause screen may restore it, so this runs every frame. */
  darken() {
    const hemi = this.level.group.children.find(c => c.isHemisphereLight), sun = this.level.group.children.find(c => c.isDirectionalLight);
    this.saved ??= { fog: this.scene.fog && { color: this.scene.fog.color.getHex(), near: this.scene.fog.near, far: this.scene.fog.far }, hemi: hemi?.intensity, sun: sun?.intensity };
    if (this.scene.fog) { this.scene.fog.color.setHex(0x07090c); this.scene.fog.near = 1; this.scene.fog.far = 16; }
    if (hemi) hemi.intensity = 0.12;
    if (sun) sun.intensity = 0.1;
  }
  cleanup() {
    const s = this.saved; if (!s) return;
    const hemi = this.level.group.children.find(c => c.isHemisphereLight), sun = this.level.group.children.find(c => c.isDirectionalLight);
    if (s.fog && this.scene.fog) { this.scene.fog.color.setHex(s.fog.color); this.scene.fog.near = s.fog.near; this.scene.fog.far = s.fog.far; }
    if (hemi && s.hemi !== undefined) hemi.intensity = s.hemi;
    if (sun && s.sun !== undefined) sun.intensity = s.sun;
    this.saved = null;
    this.site.vault.visible = false; this.site.light.intensity = 0; this.site.ring.material.opacity = 0;
  }
  atExit() { const p = this.player.pos; return p.x >= EXIT.x0 && p.z >= EXIT.z0 && p.z <= EXIT.z1; }
  workerGap() { const w = this.site.worker, p = this.player.pos; return Math.hypot(w.x - p.x, w.z - p.z); }
  act(code, target) {
    const g = this.game;
    if (code === 'KeyE' && target?.role === 'worker') {
      if (!g.found) { g.found = true; this.hud.message('Theodoros: “My lamp went out at the far wall. I cannot see the kerb, and the water is deep here.”', 6500); }
      else if (!g.sharing) { g.sharing = true; g.trail = [{ x: this.player.pos.x, z: this.player.pos.z }]; this.hud.message('You hold the lamp low between you. He can only walk where its light reaches.', 6000); }
    } else if (code === 'KeyF' && g.found && this.atExit() && !(g.sharing && this.workerGap() < 3)) {
      this.finish('proud', 'Ioannes writes in the survey that you explored the cistern alone. Theodoros is still in the dark.');
    }
  }
  tick(dt, target) {
    const g = this.game, s = this.site, p = this.player.pos;
    this.darken();
    const forward = new THREE.Vector3(0, 0, -0.5).applyEuler(new THREE.Euler(0, this.player.camera.rotation.y, 0));
    if (g.done !== 'humble') s.lamp.position.set(p.x + forward.x, 1.1, p.z + forward.z);
    s.light.position.copy(s.lamp.position).setY(1.6);
    s.light.intensity = g.oil > 0 ? 6 + 10 * Math.min(1, g.oil / 20) + Math.sin(g.time * 13) * 0.6 : 0;
    if (!g.done) {
      g.oil = Math.max(0, g.oil - dt);
      if (!g.found) {
        // The echo: a ripple on the water every few seconds, and whether it grew louder.
        g.echo += dt;
        if (g.echo >= 3) { g.echo = 0; const d = Math.hypot(p.x - HOME.x, p.z - HOME.z); g.louder = d < g.last; g.last = d; }
      }
      if (g.sharing) this.guide(dt);
      if (g.sharing && this.atExit() && this.workerGap() < 3) {
        this.finish('humble', 'You and Theodoros climb out together. You pass the lamp to Pelagia, who carries it down for the next shift.');
      } else if (g.oil <= 0) {
        this.finish('unfinished', 'The lamp gutters out. Ioannes brings a torch and leads everyone out. Try again with the oil you have.');
      }
    }
    const pulse = g.found ? 1 : g.echo / 3;
    s.ring.scale.setScalar(0.4 + pulse * 2.4); s.ring.material.opacity = g.found ? 0 : (1 - pulse) * 0.7;
    if (g.done === 'humble') {
      // The lamp is passed on: Pelagia takes it and walks down into the dark.
      g.passed = Math.min(1, g.passed + dt * 0.4);
      const bx = 44.2 - g.passed * 3.5, bz = 288.6 + g.passed * 2.4;
      this.place(s.bearer, bx, bz); s.lamp.position.set(bx - 0.3, 1.1, bz);
    }
  }
  /** Theodoros follows your footsteps, at his own pace, while he can see the lamp. */
  guide(dt) {
    const g = this.game, w = this.site.worker, p = this.player.pos, last = g.trail[g.trail.length - 1];
    if (Math.hypot(p.x - last.x, p.z - last.z) > 0.4) g.trail.push({ x: p.x, z: p.z });
    const gap = this.workerGap();
    g.waiting = gap > LIGHT;
    if (g.waiting || gap < 1.3) return;
    let step = WORKER_SPEED * dt;
    while (step > 0 && g.trail.length) {
      const t = g.trail[0], d = Math.hypot(t.x - w.x, t.z - w.z);
      if (d <= step) { this.place(w, t.x, t.z); step -= d; g.trail.shift(); }
      else { this.place(w, w.x + (t.x - w.x) * step / d, w.z + (t.z - w.z) * step / d); step = 0; }
    }
    if (!g.trail.length) g.trail.push({ x: p.x, z: p.z });
  }
  status() {
    const g = this.game, oil = `Lamp oil ${Math.ceil(g.oil)}s`;
    if (!g.found) return `${oil} · Echo from the far wall · ${g.last === Infinity ? 'listen' : g.louder ? 'louder' : 'fainter'}`;
    if (!g.sharing) return `${oil} · Theodoros found · his lamp is out`;
    return `${oil} · ${g.waiting ? 'Theodoros has lost your light. Go back to him.' : 'Theodoros follows your lamp'}`;
  }
  prompt(target) {
    const g = this.game;
    if (target?.role === 'worker' && !g.found) return 'E · Call to Theodoros';
    if (target?.role === 'worker' && !g.sharing) return 'E · Share the lamp with Theodoros';
    if (g.found && this.atExit() && !(g.sharing && this.workerGap() < 3)) return 'F · Tell Ioannes you explored alone · or go back for Theodoros';
    if (g.sharing) return g.waiting ? 'Slow down: walk back until Theodoros sees the lamp' : 'Walk at his pace to the exit by the road';
    return 'Follow the echoes along the dark rim · Q / Esc leave';
  }
  snapshot() {
    if (!this.active) return null; const g = this.game, w = this.site.worker;
    return { id: this.id, outcome: g.done, found: g.found, sharing: g.sharing, waiting: g.waiting, oil: g.oil, worker: { x: w.x, z: w.z }, bearer: { x: this.site.bearer.x, z: this.site.bearer.z } };
  }
}
