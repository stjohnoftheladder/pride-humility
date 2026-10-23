import * as THREE from 'three';
import { SiteActivity, makeLabel, makePerson } from './siteKit.js';

export const ROOM = 'The Mosaic Peristyle';
const CENTER = { x: 76, z: 264 };
const STEP = 1.3;
// Rotation steps turn the gold quarter: 0 north, 1 west, 2 south, 3 east.
const dir = (r) => ({ x: -Math.sin(r * Math.PI / 2), z: -Math.cos(r * Math.PI / 2) });
const PIECES = [];
for (let gz = -1; gz <= 1; gz++) for (let gx = -1; gx <= 1; gx++) {
  if (!gx && !gz) continue;
  // Gold faces the fixed medallion: across rows, or along the middle row.
  const target = gz ? (gz < 0 ? 2 : 0) : (gx < 0 ? 3 : 1);
  PIECES.push({ x: CENTER.x + gx * STEP, z: CENTER.z + gz * STEP, target });
}
const START_OFFSETS = [1, 2, 3, 1, 3, 2, 1, 2];
const BORDER = [];
for (let i = -2; i <= 2; i++) BORDER.push([i, -2]);
for (let i = -1; i <= 2; i++) BORDER.push([2, i]);
for (let i = 1; i >= -2; i--) BORDER.push([i, 2]);
for (let i = 1; i >= -1; i--) BORDER.push([-2, i]);
const BORDER_SECONDS = 1.8;

/** Quarter-patterned tile: gold toward local north, terracotta south, cream sides. */
function tileGeometry(size) {
  const h = size / 2, y = 0;
  const tri = (ax, az, bx, bz) => [0, y, 0, ax, y, az, bx, y, bz];
  const positions = [...tri(h, -h, -h, -h), ...tri(-h, -h, -h, h), ...tri(-h, h, h, h), ...tri(h, h, h, -h)];
  const colors = [];
  for (const c of [0xd9ad3c, 0xe6dcc0, 0x9a3f2b, 0xe6dcc0]) {
    const color = new THREE.Color(c); for (let v = 0; v < 3; v++) colors.push(color.r, color.g, color.b);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  g.computeVertexNormals();
  return g;
}

export default class MosaicPeristyle extends SiteActivity {
  constructor(options) {
    super(options, { room: ROOM, title: 'THE SHARED FLOOR', center: CENTER, radius: 15, timeLimit: 120,
      controls: 'WASD walk · E turn tile / speak · Space press tile · F / H at the master · Q / Esc leave · R retry' });
  }
  build(group) {
    this.group = group;
    const material = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide });
    const geometry = tileGeometry(1.1);
    this.dummy = new THREE.Object3D();
    this.tiles = new THREE.InstancedMesh(geometry, material, PIECES.length); this.tiles.name = 'pilgrim-tiles';
    this.border = new THREE.InstancedMesh(tileGeometry(1.1), material, BORDER.length); this.border.name = 'novice-border';
    for (const mesh of [this.tiles, this.border]) {
      mesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(CENTER.x, 0.2, CENTER.z), 5); group.add(mesh);
    }
    const bed = new THREE.Mesh(new THREE.BoxGeometry(STEP * 5 + 0.3, 0.04, STEP * 5 + 0.3), new THREE.MeshLambertMaterial({ color: 0x8b7c66 }));
    bed.position.set(CENTER.x, 0.11, CENTER.z); group.add(bed);
    const medallion = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.05, 16), this.level.mat.get('gold'));
    medallion.position.set(CENTER.x, 0.15, CENTER.z); group.add(medallion);
    // Sinopia: the red underdrawing on the setting bed shows where each gold quarter belongs.
    const marks = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 0.02, 0.07), new THREE.MeshLambertMaterial({ color: 0xb4402a }), PIECES.length);
    PIECES.forEach((p, i) => {
      const d = dir(p.target);
      this.dummy.position.set(p.x + d.x * 0.61, 0.135, p.z + d.z * 0.61); this.dummy.rotation.set(0, p.target * Math.PI / 2, 0);
      this.dummy.updateMatrix(); marks.setMatrixAt(i, this.dummy.matrix);
    });
    marks.boundingSphere = new THREE.Sphere(new THREE.Vector3(CENTER.x, 0.1, CENTER.z), 4); group.add(marks);
    this.master = makePerson(this.level, group, { id: 'mosaic-master', name: 'Kosmas · Master', x: 71.5, z: 262, color: 0x5d4a7a });
    this.novice = makePerson(this.level, group, { id: 'mosaic-novice', name: 'Melania · Novice', x: 79.6, z: 264, color: 0x6c7d5a });
    this.shared = makeLabel(group, 'One floor, two hands', CENTER.x, 2.6, CENTER.z); this.shared.visible = false;
    for (const t of [this.master, this.novice]) this.level.npcs.push({ id: t.id, name: t.name, role: 'witness', x: t.x, z: t.z });
  }
  reset() {
    return { rotation: PIECES.map((p, i) => (p.target + START_OFFSETS[i]) % 4), shown: PIECES.map((p, i) => (p.target + START_OFFSETS[i]) % 4),
      border: 0, loose: -1, press: 0, repaired: false, last: -1 };
  }
  intro() { return 'Kosmas: “Set the eight tiles around the medallion. Melania sets the border.” Match each gold quarter to the red line on the bed.'; }
  timeoutText() { return 'The mortar sets before the floor is finished. Try again.'; }
  aligned() { return this.game.rotation.filter((r, i) => r === PIECES[i].target).length; }
  complete() { return this.game.loose >= 0; }
  targets() {
    return [...PIECES.map((p, i) => ({ ...p, role: 'tile', index: i })), { ...this.master, role: 'master' }, { ...this.novice, role: 'novice', x: this.novice.figure.position.x, z: this.novice.figure.position.z }];
  }
  near() { return this.nearest(0.8, this.targets()) ?? this.nearest(1.8, this.targets().filter(t => t.role !== 'tile')); }
  act(code) {
    const g = this.game, t = this.near(); if (!t) return;
    if (t.role === 'tile' && code === 'KeyE') {
      if (this.complete()) { this.hud.message(t.index === g.loose && !g.repaired ? 'That tile rocks under your hand. Hold Space to press it into the bed.' : 'The tile is set.', 3500); return; }
      g.rotation[t.index] = (g.rotation[t.index] + 1) % 4; g.last = t.index;
      if (this.aligned() === PIECES.length) g.loose = g.last;
    } else if (t.role === 'novice' && code === 'KeyE') {
      this.hud.message(g.border < BORDER.length ? 'Melania: “I am setting the border, one stone at a time.”' : 'Melania: “The border is done. I hope the master likes it.”', 4500);
    } else if (t.role === 'master') {
      const ready = this.complete() && g.border >= BORDER.length;
      if (code === 'KeyE' || ((code === 'KeyF' || code === 'KeyH') && !ready)) {
        this.hud.message(!this.complete() ? 'Kosmas: “Finish the eight tiles around the medallion first.”' : g.border < BORDER.length ? 'Kosmas: “Wait for Melania to finish the border, then we will look at the whole floor.”' : 'Kosmas: “The floor is finished. Whose hands made it?” F take the credit · H name Melania', 5000);
      } else if (code === 'KeyF') {
        this.finish('proud', `Kosmas praises the whole floor as your work. Melania stands back in silence.${g.repaired ? '' : ' Your loose tile still rocks underfoot.'}`);
      } else if (code === 'KeyH') {
        if (!g.repaired) this.hud.message('Kosmas: “Before we speak of her border, look again at your own tiles.”', 5000);
        else { this.finish('humble', 'You name Melania’s border and point to the tile you reset. Kosmas: “One floor, two hands.” Melania will remember who worked beside her.'); }
      }
    }
  }
  tick(dt) {
    const g = this.game, t = this.near();
    if (!g.done) {
      g.border = Math.min(BORDER.length, g.time / BORDER_SECONDS);
      if (this.complete() && !g.repaired && t?.role === 'tile' && t.index === g.loose && this.keys.Space) {
        g.press += dt;
        if (g.press >= 1.2) { g.repaired = true; this.hud.message('The tile settles flush with its neighbors.', 3000); }
      }
    }
    PIECES.forEach((p, i) => {
      // Tiles turn visibly instead of snapping.
      let delta = g.rotation[i] - g.shown[i]; if (delta < 0) delta += 4;
      g.shown[i] = delta < 0.02 ? g.rotation[i] : (g.shown[i] + Math.min(delta, dt * 6)) % 4;
      const loose = i === g.loose && !g.repaired, lift = loose ? 0.08 * (1 - g.press / 1.2) : 0;
      this.dummy.position.set(p.x, 0.15 + lift, p.z);
      this.dummy.rotation.set(loose ? Math.sin(g.time * 9) * 0.08 : 0, g.shown[i] * Math.PI / 2, 0);
      this.dummy.updateMatrix(); this.tiles.setMatrixAt(i, this.dummy.matrix);
    });
    this.tiles.instanceMatrix.needsUpdate = true;
    const placed = Math.floor(g.border);
    BORDER.forEach(([bx, bz], i) => {
      this.dummy.position.set(CENTER.x + bx * STEP, 0.15, CENTER.z + bz * STEP);
      // Gold faces outward around the border, framing the panel.
      const r = Math.abs(bz) === 2 ? (bz < 0 ? 0 : 2) : (bx < 0 ? 1 : 3);
      this.dummy.rotation.set(0, r * Math.PI / 2, 0); this.dummy.scale.setScalar(i < placed ? 1 : 0.001);
      this.dummy.updateMatrix(); this.border.setMatrixAt(i, this.dummy.matrix);
    });
    this.dummy.scale.setScalar(1);
    this.border.instanceMatrix.needsUpdate = true;
    const at = BORDER[Math.min(placed, BORDER.length - 1)];
    const kneel = { x: CENTER.x + at[0] * STEP * 1.45, z: CENTER.z + at[1] * STEP * 1.45 };
    if (g.border < BORDER.length) this.novice.figure.position.set(kneel.x, 0, kneel.z);
    else if (g.done === 'humble') this.novice.figure.position.set(CENTER.x + 1.2, 0, CENTER.z - 4.4);
    else if (g.done === 'proud') this.novice.figure.position.set(CENTER.x + 6, 0, CENTER.z + 6);
    else this.novice.figure.position.set(CENTER.x + 4.4, 0, CENTER.z + 1.5);
    this.novice.label.userData.setText(g.done === 'humble' ? 'Melania · Your collaborator' : 'Melania · Novice');
    this.shared.visible = g.done === 'humble';
  }
  status() {
    const g = this.game;
    return `Your tiles aligned ${this.aligned()}/${PIECES.length} · Melania’s border ${Math.floor(g.border)}/${BORDER.length}${this.complete() && !g.repaired ? ' · one of your tiles sits proud of the bed' : ''} · mortar ${Math.max(0, Math.ceil(120 - g.time))}s`;
  }
  prompt() {
    const g = this.game, t = this.near();
    if (!t) return 'Walk onto a tile to turn it · Kosmas waits at the west colonnade';
    if (t.role === 'tile') return this.complete() ? t.index === g.loose && !g.repaired ? 'Hold Space · press the rocking tile into the bed' : 'This tile is set' : 'E · turn the tile until gold meets the red line';
    if (t.role === 'novice') return 'E · speak with Melania';
    return this.complete() && g.border >= BORDER.length ? 'F · present the floor as yours     H · name Melania’s border' : 'E · speak with Kosmas';
  }
  snapshot() {
    if (!this.active) return null; const g = this.game;
    return { id: 'mosaicPeristyle', outcome: g.done, aligned: this.aligned(), border: Math.floor(g.border), loose: g.loose, repaired: g.repaired, time: g.time };
  }
}
export { PIECES };
