// Hagia Sophia, inside: a world of its own behind the forecourt doors.
//
// The Great Church as the pilgrim finds it at the service: a dome floating on
// its ring of forty windows, two semi-domes stepping down east and west,
// galleries over the aisles, gold mosaic above and veined marble below, rings
// of oil lamps (polykandela) hanging on long chains. The nave is full of
// parishioners, men below and women in the galleries, and Saint John
// Chrysostom preaches from the great ambo under the dome. Each visit he gives
// the next homily (public/assets/audio/chrysostom/manifest.json), voiced with
// Drama 3 and sent through a long synthetic reverb so the voice fills the room.
//
// Note: Chrysostom was archbishop here 398-404, in the earlier Great Church;
// Justinian's domed church is from 537. The game places him in the church the
// player knows.
import * as THREE from 'three';

const R = 12;            // dome radius = half the central square
const SPRING = 22;       // where the dome springs from the window ring
const GALLERY = 9;       // gallery floor height
const NAVE_Z = 26;       // nave runs z = -26 (east, sanctuary) .. +26 (west, doors)
const AISLE_X = 22;      // outer walls
const PIER = 13;         // pier / colonnade line
const AMBO = { x: 0, z: -3, r: 2.2, h: 2.6 };
export const SOPHIA_SPAWN = { x: 0, z: 22.5 };
const DOOR = { x: 0, z: 25.2 };
const HOMILY_KEY = 'pride-humility:homily';

function canvasTex(w, h, draw, repeat = [1, 1]) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...repeat);
  t.magFilter = THREE.NearestFilter;
  return t;
}
// small deterministic noise so every visit looks the same
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

const veins = (g, w, h, base, vein, n, r) => {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  g.strokeStyle = vein; g.globalAlpha = 0.35;
  for (let i = 0; i < n; i++) {
    g.lineWidth = 0.5 + r() * 1.5; g.beginPath();
    let x = r() * w, y = r() * h; g.moveTo(x, y);
    for (let k = 0; k < 6; k++) { x += (r() - 0.3) * w * 0.25; y += (r() - 0.5) * h * 0.2; g.lineTo(x, y); }
    g.stroke();
  }
  g.globalAlpha = 1;
};

function makeMaterials() {
  const r = rng(537);
  const floor = canvasTex(128, 128, (g, w, h) => {
    veins(g, w, h, '#b9b4a8', '#6d6a63', 14, r);
    g.strokeStyle = '#8a8478'; g.lineWidth = 2; g.strokeRect(0, 0, w, h);   // Proconnesian slabs
  }, [14, 18]);
  const gold = canvasTex(64, 64, (g, w, h) => {
    for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) {   // tesserae
      const v = 0.75 + r() * 0.35;
      g.fillStyle = `rgb(${Math.min(255, 214 * v) | 0},${Math.min(255, 170 * v) | 0},${(70 * v) | 0})`;
      g.fillRect(x, y, 2, 2);
    }
  }, [6, 6]);
  const dome = canvasTex(256, 128, (g, w, h) => {
    for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) {
      const v = 0.72 + r() * 0.35;
      g.fillStyle = `rgb(${Math.min(255, 214 * v) | 0},${Math.min(255, 168 * v) | 0},${(66 * v) | 0})`;
      g.fillRect(x, y, 2, 2);
    }
    g.strokeStyle = '#7a5a22'; g.lineWidth = 2;   // the forty ribs
    for (let i = 0; i < 40; i++) { const x = (i / 40) * w; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
    g.fillStyle = '#5a3c14'; g.fillRect(0, 0, w, 6);  // crown medallion ring (top of the uv)
  });
  const revet = canvasTex(128, 64, (g, w, h) => {   // book-matched marble panels
    const cols = [['#8d9a86', '#4f5e4c'], ['#c9c2b4', '#7d776c'], ['#9a7f74', '#5e4038'], ['#d8d2c4', '#8f897c']];
    for (let i = 0; i < 4; i++) {
      const [b, v] = cols[i];
      g.save(); g.translate(i * 32, 0); veins(g, 32, h, b, v, 9, r); g.restore();
      g.fillStyle = '#c8a24e'; g.fillRect(i * 32, 0, 1, h);
    }
    g.fillStyle = '#c8a24e'; g.fillRect(0, 0, w, 2); g.fillRect(0, h - 2, w, 2);
  }, [3.5, 1]);
  const omophorion = canvasTex(32, 64, (g, w, h) => {
    g.fillStyle = '#efe9da'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#1b1712';
    for (let y = 6; y < h; y += 20) { g.fillRect(w / 2 - 2, y, 4, 12); g.fillRect(w / 2 - 6, y + 3, 12, 4); }
  });
  const lambert = (o) => new THREE.MeshLambertMaterial(o);
  return {
    floor: lambert({ map: floor }),
    gold: lambert({ map: gold, emissive: 0x3a2a08, emissiveIntensity: 0.6 }),
    dome: lambert({ map: dome, side: THREE.BackSide, emissive: 0x4a3410, emissiveIntensity: 0.7 }),
    halfDome: lambert({ map: gold, side: THREE.DoubleSide, emissive: 0x5a4210, emissiveIntensity: 0.8 }),
    revet: lambert({ map: revet }),
    pierRevet: lambert({ map: (() => { const t = revet.clone(); t.repeat.set(0.5, 1); t.needsUpdate = true; return t; })() }),
    stone: lambert({ color: 0xcfc6b2 }),
    pier: lambert({ color: 0xbdb3a0 }),
    verde: lambert({ color: 0x3f6b4c }),
    porphyry: lambert({ color: 0x6e2430 }),
    capital: lambert({ color: 0xe6dcc4 }),
    window: new THREE.MeshBasicMaterial({ color: 0xfff1cc }),
    shaft: new THREE.MeshBasicMaterial({ color: 0xffe9b0, transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
    flame: new THREE.MeshBasicMaterial({ color: 0xffc46b }),
    chain: new THREE.LineBasicMaterial({ color: 0x3a2d1a }),
    silver: lambert({ color: 0xd9dde2, emissive: 0x222428 }),
    robe: lambert({ color: 0xf2ecdc }),
    omophorion: lambert({ map: omophorion }),
    skin: lambert({ color: 0xc69c78 }),
    beard: lambert({ color: 0x4a3a2c }),
  };
}

export class HagiaSophia {
  constructor({ audio }) {
    this.audio = audio;
    this.built = false;
    this.voice = null;           // { src, start, homily }
    this.captions = null;
  }

  /** Build the whole interior once, on the first visit. */
  build() {
    if (this.built) return;
    this.built = true;
    const scene = this.scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1206);
    scene.fog = new THREE.Fog(0x2a1d0c, 30, 110);
    const M = this.M = makeMaterials();
    const add = (geo, mat, x, y, z, ry = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.y = ry; scene.add(m); return m; };
    this.colliders = [];          // circles {x, z, r}
    this.boxes = [];              // {minX, maxX, minZ, maxZ}

    // floor, with the porphyry omphalion where emperors were crowned
    const floor = add(new THREE.PlaneGeometry(AISLE_X * 2, NAVE_Z * 2 + 12), M.floor, 0, 0, -6);
    floor.rotation.x = -Math.PI / 2;
    const omph = add(new THREE.CircleGeometry(2, 24), M.porphyry, 7, 0.01, 2);
    omph.rotation.x = -Math.PI / 2;

    // outer walls: marble revetment below, gold mosaic above
    const wall = (w, h, y, mat, x, z, ry) => add(new THREE.PlaneGeometry(w, h), mat, x, y, z, ry);
    for (const s of [-1, 1]) {
      wall(NAVE_Z * 2, 6, 3, M.revet, s * AISLE_X, 0, -s * Math.PI / 2);
      wall(NAVE_Z * 2, 16, 14, M.gold, s * AISLE_X, 0, -s * Math.PI / 2);
    }
    for (const [z, ry] of [[NAVE_Z, Math.PI], [-NAVE_Z, 0]]) {
      for (const s of [-1, 1]) {   // leave the centre of the east wall open for the apse
        wall(AISLE_X - 6, 6, 3, M.revet, s * (6 + (AISLE_X - 6) / 2), 0, ry).position.z = z;
        wall(AISLE_X - 6, 16, 14, M.gold, s * (6 + (AISLE_X - 6) / 2), 0, ry).position.z = z;
      }
      if (z > 0) {   // west wall centre, over the imperial door
        wall(12, 16, 14, M.gold, 0, 0, ry).position.z = z;
        wall(12, 6, 3, M.revet, 0, 0, ry).position.z = z;
      }
    }
    // the imperial door, the light of the narthex behind it
    add(new THREE.PlaneGeometry(3.2, 5.6), new THREE.MeshBasicMaterial({ color: 0xffe2a0 }), DOOR.x, 2.8, NAVE_Z - 0.02, Math.PI);
    add(new THREE.BoxGeometry(4, 0.4, 0.4), M.gold, DOOR.x, 5.8, NAVE_Z - 0.1);

    // apse and sanctuary to the east
    const apse = add(new THREE.CylinderGeometry(6, 6, 20, 24, 1, true, Math.PI / 2, Math.PI), M.gold, 0, 10, -NAVE_Z);
    apse.material = M.halfDome;
    const apseDome = add(new THREE.SphereGeometry(6, 24, 12, Math.PI / 2, Math.PI, 0, Math.PI / 2), M.halfDome, 0, 20, -NAVE_Z);
    apseDome.scale.set(1, 1, 1);
    // apse windows
    for (let i = 0; i < 5; i++) {
      const a = Math.PI / 2 + (i + 0.5) * Math.PI / 5;
      add(new THREE.PlaneGeometry(1, 3), M.window, Math.cos(a) * 5.9, 12, -NAVE_Z - Math.sin(a) * 5.9, -a + Math.PI / 2);
    }
    // templon: a silver screen of columns, the altar and its ciborium behind
    for (let i = -6; i <= 6; i += 1.5) add(new THREE.CylinderGeometry(0.14, 0.14, 3, 8), M.silver, i, 1.5, -19);
    add(new THREE.BoxGeometry(13, 0.3, 0.3), M.silver, 0, 3.05, -19);
    add(new THREE.BoxGeometry(13, 1, 0.25), M.stone, 0, 0.5, -19);
    this.boxes.push({ minX: -6.6, maxX: 6.6, minZ: -19.4, maxZ: -18.6 });
    add(new THREE.BoxGeometry(2.4, 1.1, 1.4), M.gold, 0, 0.55, -23);
    for (const [x, z] of [[-1.5, -22], [1.5, -22], [-1.5, -24], [1.5, -24]]) add(new THREE.CylinderGeometry(0.12, 0.12, 4, 8), M.silver, x, 2, z);
    add(new THREE.ConeGeometry(2.3, 1.6, 4, 1), M.silver, 0, 4.8, -23, Math.PI / 4);

    // four great piers carrying the dome
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      add(new THREE.BoxGeometry(3, SPRING, 3), M.pier, sx * PIER, SPRING / 2, sz * (R + 0.5));
      add(new THREE.BoxGeometry(3.02, 6, 3.02), M.pierRevet, sx * PIER, 3, sz * (R + 0.5));
      this.boxes.push({ minX: sx * PIER - 1.5, maxX: sx * PIER + 1.5, minZ: sz * (R + 0.5) - 1.5, maxZ: sz * (R + 0.5) + 1.5 });
    }
    // north and south: two tiers of columns, a gallery between, a tympanum of windows above
    for (const s of [-1, 1]) {
      for (let z = -8; z <= 8; z += 4) {
        add(new THREE.CylinderGeometry(0.45, 0.5, GALLERY, 12), z % 8 === 0 ? M.porphyry : M.verde, s * PIER, GALLERY / 2, z);
        add(new THREE.BoxGeometry(1.2, 0.6, 1.2), M.capital, s * PIER, GALLERY - 0.3, z);
        add(new THREE.CylinderGeometry(0.32, 0.36, 6, 10), M.verde, s * PIER, GALLERY + 3.4, z);
        this.colliders.push({ x: s * PIER, z, r: 0.55 });
      }
      add(new THREE.BoxGeometry(AISLE_X - PIER + 1, 0.5, NAVE_Z * 2), M.stone, s * (PIER + AISLE_X) / 2, GALLERY, 0);
      add(new THREE.BoxGeometry(0.3, 1.1, R * 2 - 1), M.revet, s * (PIER - 0.4), GALLERY + 0.8, 0);
      const tymp = add(new THREE.PlaneGeometry(R * 2 - 3, SPRING - GALLERY - 6.5), M.gold, s * PIER, (SPRING + GALLERY + 6.5) / 2, 0, -s * Math.PI / 2);
      for (let k = 0; k < 7; k++) for (let row = 0; row < 2; row++) {
        const win = add(new THREE.PlaneGeometry(1.4, 2.2), M.window, s * (PIER - 0.05), 17 + row * 3, -9 + k * 3, -s * Math.PI / 2);
        if (row === 1 && (k === 0 || k === 6)) win.visible = false;
      }
      tymp.renderOrder = -1;
    }

    // the dome, its forty windows, and the light falling from them
    const dome = add(new THREE.SphereGeometry(R, 40, 16, 0, Math.PI * 2, 0, Math.PI / 2), M.dome, 0, SPRING + 1.4, 0);
    dome.scale.set(1, 0.82, 1);
    const ring = add(new THREE.CylinderGeometry(R, R, 1.6, 40, 1, true), M.gold, 0, SPRING + 0.6, 0);
    ring.material = M.halfDome;
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      add(new THREE.PlaneGeometry(0.9, 1.3), M.window, Math.sin(a) * (R - 0.05), SPRING + 0.7, Math.cos(a) * (R - 0.05), a + Math.PI);
    }
    // pendentives: gold triangles filling the corners between the arches and the ring
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute([
        sx * R, SPRING - 8, sz * R, sx * R * 0.7, SPRING, sz * R * 0.7, sx * R, SPRING, 0,
        sx * R, SPRING - 8, sz * R, 0, SPRING, sz * R, sx * R * 0.7, SPRING, sz * R * 0.7,
      ], 3));
      g.computeVertexNormals();
      const p = new THREE.Mesh(g, M.halfDome); scene.add(p);
    }
    const crown = add(new THREE.CircleGeometry(2.2, 24), M.gold, 0, SPRING + 1.4 + R * 0.82 - 0.05, 0);
    crown.rotation.x = Math.PI / 2;
    this.shafts = [];
    for (let i = 0; i < 6; i++) {   // shafts of morning light from the south-east windows
      const a = -0.6 + i * 0.32;
      const shaft = add(new THREE.CylinderGeometry(0.5, 1.6, 26, 6, 1, true), M.shaft, Math.sin(a) * R * 0.55, 11, Math.cos(a) * R * 0.55 - 3);
      shaft.rotation.z = Math.sin(a) * 0.32; shaft.rotation.x = -Math.cos(a) * 0.32;
      this.shafts.push(shaft);
    }
    // semi-domes east and west
    for (const s of [-1, 1]) {
      const half = add(new THREE.SphereGeometry(R, 32, 12, s < 0 ? Math.PI / 2 : -Math.PI / 2, Math.PI, 0, Math.PI / 2), M.halfDome, 0, SPRING - 2, s * R);
      half.scale.set(1, 0.7, 1);
      add(new THREE.PlaneGeometry(R * 2, 2), M.gold, 0, SPRING - 1, s * R, s > 0 ? Math.PI : 0);
    }

    // polykandela: rings of oil lamps on long chains
    const lampPts = [];
    const chains = [];
    const ringsAt = [[0, 6], [-7, 4], [7, 4], [-7, 12], [7, 12], [0, 15], [-5, -11], [5, -11], [0, -14], [-17, 6], [17, 6], [-17, -6], [17, -6]];
    for (const [x, z] of ringsAt) {
      const y = 5.2;
      const rr = Math.abs(x) > 15 ? 1.2 : 2.4;
      for (let i = 0; i < 20; i++) { const a = (i / 20) * Math.PI * 2; lampPts.push([x + Math.cos(a) * rr, y, z + Math.sin(a) * rr]); }
      chains.push(x, y, z, x, Math.abs(x) > 15 ? GALLERY - 0.2 : SPRING, z);
      add(new THREE.TorusGeometry(rr, 0.04, 4, 24), M.gold, x, y - 0.05, z).rotation.x = Math.PI / 2;
    }
    const chainGeo = new THREE.BufferGeometry(); chainGeo.setAttribute('position', new THREE.Float32BufferAttribute(chains, 3));
    scene.add(new THREE.LineSegments(chainGeo, M.chain));
    // candles before the templon
    for (let x = -6; x <= 6; x += 0.6) lampPts.push([x, 1.25, -18.4]);
    const flames = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 5, 4), M.flame, lampPts.length);
    const d = new THREE.Object3D();
    lampPts.forEach(([x, y, z], i) => { d.position.set(x, y, z); d.updateMatrix(); flames.setMatrixAt(i, d.matrix); });
    scene.add(flames);

    // light: warm lamp glow, cool daylight from the windows
    scene.add(new THREE.HemisphereLight(0xffe6b8, 0x3a2410, 0.55));
    const sun = new THREE.DirectionalLight(0xfff0d0, 0.9); sun.position.set(8, 40, -10); scene.add(sun);
    this.lamps = [];
    for (const [x, z] of [[0, 6], [-7, 12], [7, 12], [0, -14], [-17, 0], [17, 0]]) {
      const l = new THREE.PointLight(0xffb45e, 14, 22, 1.6); l.position.set(x, 5, z); scene.add(l); this.lamps.push(l);
    }
    const onAmbo = new THREE.SpotLight(0xffe6c0, 60, 30, 0.32, 0.6, 1.4);
    onAmbo.position.set(0, SPRING, -1); onAmbo.target.position.set(AMBO.x, AMBO.h, AMBO.z);
    scene.add(onAmbo, onAmbo.target);

    this.buildAmbo();
    this.buildCrowd();
  }

  /** The great ambo under the dome, and Chrysostom on it, facing the doors. */
  buildAmbo() {
    const { scene, M } = this;
    const ambo = new THREE.Mesh(new THREE.CylinderGeometry(AMBO.r, AMBO.r + 0.3, AMBO.h, 8), M.stone);
    ambo.position.set(AMBO.x, AMBO.h / 2, AMBO.z); scene.add(ambo);
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(AMBO.r, AMBO.r, 0.45, 8, 1, true), M.silver);
    rail.material = rail.material.clone(); rail.material.side = THREE.DoubleSide;
    rail.position.set(AMBO.x, AMBO.h + 0.22, AMBO.z); scene.add(rail);
    for (const s of [-1, 1]) {   // stairs north and south, so the nave looks straight at him
      for (let i = 0; i < 6; i++) {
        const step = new THREE.Mesh(new THREE.BoxGeometry(0.5, (i + 1) * AMBO.h / 6, 1.4), M.stone);
        step.position.set(AMBO.x + s * (AMBO.r + 3 - i * 0.5), (i + 1) * AMBO.h / 12, AMBO.z); scene.add(step);
      }
    }
    this.colliders.push({ x: AMBO.x, z: AMBO.z, r: AMBO.r + 0.4 });
    this.boxes.push({ minX: AMBO.x - AMBO.r - 3.3, maxX: AMBO.x + AMBO.r + 3.3, minZ: AMBO.z - 0.8, maxZ: AMBO.z + 0.8 });

    const john = this.john = new THREE.Group();
    john.position.set(AMBO.x, AMBO.h + 0.15, AMBO.z + 0.3);
    john.scale.setScalar(1.35);   // larger than life, so he reads from the doors
    const robe = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.62, 1.55, 10), M.robe); robe.position.y = 0.78; john.add(robe);
    const stole = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.2, 0.04), M.omophorion); stole.position.set(0, 0.95, 0.42); stole.rotation.x = -0.18; john.add(stole);
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.07, 5, 12), M.omophorion); collar.position.y = 1.5; collar.rotation.x = Math.PI / 2; john.add(collar);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), M.skin); head.position.y = 1.72; john.add(head);
    const beard = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.3, 8), M.beard); beard.position.set(0, 1.56, 0.08); beard.rotation.x = Math.PI; john.add(beard);
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.175, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2.2), M.beard); hair.position.y = 1.74; john.add(hair);
    this.arms = [];
    for (const s of [-1, 1]) {
      const pivot = new THREE.Group(); pivot.position.set(s * 0.3, 1.38, 0.02);
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.62, 6), M.robe); arm.position.y = -0.31; pivot.add(arm);
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 5), M.skin); hand.position.y = -0.64; pivot.add(hand);
      pivot.rotation.z = s * 0.15;
      john.add(pivot); this.arms.push(pivot);
    }
    const book = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 0.22), M.gold); book.position.set(-0.32, 0.78, 0.25); book.rotation.z = 0.5; john.add(book);
    this.scene.add(john);
  }

  /** Parishioners: men in the nave and aisles, women in the galleries. */
  buildCrowd() {
    const r = rng(404);
    const spots = [];
    const tryPlace = (x, y, z, veiled) => {
      if (spots.some((s) => s.y === y && Math.hypot(s.x - x, s.z - z) < 0.75)) return;
      spots.push({ x, y, z, veiled, h: 0.88 + r() * 0.22, phase: r() * 6.28, kneel: r() < 0.08, hue: r() });
    };
    for (let i = 0; i < 900 && spots.length < 330; i++) {
      const x = (r() * 2 - 1) * 11, z = 1 + r() * 21;
      if (Math.abs(x) < 1.6) continue;                       // keep the central way open to the ambo
      if (Math.hypot(x - AMBO.x, z - AMBO.z) < AMBO.r + 2.2) continue;
      if (z > 20.5 && Math.abs(x) < 3) continue;             // and the doors
      tryPlace(x, 0, z, r() < 0.15);
    }
    for (let i = 0; i < 600 && spots.length < 410; i++) {   // the aisles
      const s = r() < 0.5 ? -1 : 1;
      tryPlace(s * (15 + r() * 6), 0, -10 + r() * 30, false);
    }
    for (let i = 0; i < 700 && spots.length < 520; i++) {   // the galleries
      const s = r() < 0.5 ? -1 : 1;
      tryPlace(s * (14.4 + r() * 1.4), GALLERY + 0.25, -11 + r() * 22, true);
    }
    this.people = spots;
    const n = spots.length;
    this.bodies = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.2, 0.32, 1.05, 6), new THREE.MeshLambertMaterial(), n);
    this.heads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.16, 6, 5), new THREE.MeshLambertMaterial(), n);
    const robes = [0x6b4a32, 0x3f4f6b, 0x7a6a52, 0x5a2e2a, 0x4d5e46, 0x8a7e66, 0x2f2a36];
    const veils = [0xe8e0cf, 0x6e3b44, 0x3e4b66, 0x9c8a6a];
    spots.forEach((p, i) => {
      this.bodies.setColorAt(i, new THREE.Color(p.veiled ? veils[(p.hue * veils.length) | 0] : robes[(p.hue * robes.length) | 0]).multiplyScalar(0.85 + p.hue * 0.3));
      this.heads.setColorAt(i, new THREE.Color(p.veiled ? veils[(p.hue * veils.length) | 0] : 0xb08866));
      if (p.y === 0) this.colliders.push({ x: p.x, z: p.z, r: 0.32 });
    });
    this.scene.add(this.bodies, this.heads);
    this.updateCrowd(0);
  }

  updateCrowd(time) {
    const d = new THREE.Object3D();
    d.rotation.order = 'YXZ';   // turn to the ambo first, then bow forward
    this.people.forEach((p, i) => {
      // everyone faces the ambo; a slow sway, and now and then a bow
      const yaw = Math.atan2(AMBO.x - p.x, AMBO.z - p.z);
      const bow = Math.max(0, Math.sin(time * 0.21 + p.phase * 3) - 0.92) * 4;
      const h = p.kneel ? p.h * 0.62 : p.h;
      d.position.set(p.x, p.y + 0.55 * h, p.z);
      d.rotation.set(bow * 0.35, yaw, Math.sin(time * 0.7 + p.phase) * 0.025);
      d.scale.set(1, h, 1); d.updateMatrix(); this.bodies.setMatrixAt(i, d.matrix);
      d.position.set(p.x + Math.sin(yaw) * bow * 0.18, p.y + 1.12 * h + 0.17, p.z + Math.cos(yaw) * bow * 0.18);
      d.scale.set(1, 1, 1); d.updateMatrix(); this.heads.setMatrixAt(i, d.matrix);
    });
    this.bodies.instanceMatrix.needsUpdate = true;
    this.heads.instanceMatrix.needsUpdate = true;
  }

  /** Same contract as Level.collideCircle, so the Player walks in here unchanged. */
  collideCircle(px, pz, radius, out) {
    let x = px, z = pz, hit = false;
    const lim = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
    const nx = lim(x, -AISLE_X + radius, AISLE_X - radius), nz = lim(z, -NAVE_Z + radius, NAVE_Z - radius);
    if (nx !== x || nz !== z) { x = nx; z = nz; hit = true; }
    for (const b of this.boxes) {
      if (x + radius <= b.minX || x - radius >= b.maxX || z + radius <= b.minZ || z - radius >= b.maxZ) continue;
      const dl = x + radius - b.minX, dr = b.maxX - (x - radius), dn = z + radius - b.minZ, ds = b.maxZ - (z - radius);
      const m = Math.min(dl, dr, dn, ds);
      if (m === dl) x = b.minX - radius; else if (m === dr) x = b.maxX + radius; else if (m === dn) z = b.minZ - radius; else z = b.maxZ + radius;
      hit = true;
    }
    for (const c of this.colliders) {
      const dx = x - c.x, dz = z - c.z, d = Math.hypot(dx, dz), min = c.r + radius;
      if (d < min && d > 1e-6) { x = c.x + (dx / d) * min; z = c.z + (dz / d) * min; hit = true; }
    }
    out.x = x; out.z = z;
    return hit;
  }

  nearDoor(pos) { return Math.hypot(pos.x - DOOR.x, pos.z - DOOR.z) < 3.2; }

  /** The next homily in turn; the count survives restarts so every visit is new. */
  nextHomilyIndex(count) {
    let i = 0;
    try { i = Number(localStorage.getItem(HOMILY_KEY)) || 0; localStorage.setItem(HOMILY_KEY, String(i + 1)); } catch { /* private mode: start at the first */ }
    return i % count;
  }

  async loadManifest() {
    this.manifest ??= fetch('assets/audio/chrysostom/manifest.json').then((r) => (r.ok ? r.json() : [])).catch(() => []);
    return this.manifest;
  }

  /** A long, dark stereo tail for a huge stone room (~7 s), built once. */
  reverb(ctx) {
    if (this._ir) return this._ir;
    const len = Math.floor(ctx.sampleRate * 7.5);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = ir.getChannelData(ch);
      let lp = 0;
      for (let i = 0; i < len; i++) {
        const t = i / ctx.sampleRate;
        // high frequencies die faster than lows: a one-pole lowpass that closes over time
        const k = 0.55 * Math.exp(-t / 1.8) + 0.04;
        lp += k * ((Math.random() * 2 - 1) - lp);
        const early = t < 0.09 && Math.random() < 0.012 ? 1.6 : 0;
        data[i] = (lp + early * (Math.random() * 2 - 1)) * Math.exp(-t * 0.92) * (t < 0.025 ? t / 0.025 : 1);
      }
    }
    return (this._ir = ir);
  }

  /** Step inside: the next homily begins after a moment of quiet. */
  async enter({ camera, player }) {
    this.build();
    this.prevFar = camera.far; camera.far = 140; camera.updateProjectionMatrix();
    this.prevLevel = player.level; player.level = this;
    player.pos.set(SOPHIA_SPAWN.x, 0, SOPHIA_SPAWN.z); player.vel.set(0, 0, 0);
    camera.position.set(SOPHIA_SPAWN.x, camera.position.y, SOPHIA_SPAWN.z);
    camera.rotation.set(0.12, 0, 0);   // looking east, up toward the dome
    this.inside = true;
    this.showCaption(null);
    const manifest = await this.loadManifest();
    if (!manifest.length || !this.inside) return null;
    const homily = manifest[this.nextHomilyIndex(manifest.length)];
    this.startHomily(homily);
    return homily;
  }

  async startHomily(homily) {
    const a = this.audio;
    a.ensure(); a.resume();
    const ctx = a.ctx;
    if (!ctx) return;
    const buf = await fetch(homily.file).then((r) => r.arrayBuffer()).then((b) => ctx.decodeAudioData(b)).catch(() => null);
    if (!buf || !this.inside) return;
    this.stopHomily();
    const src = ctx.createBufferSource(); src.buffer = buf;
    const dry = ctx.createGain(); dry.gain.value = 0.85;
    const pre = ctx.createDelay(0.2); pre.delayTime.value = 0.045;
    const conv = ctx.createConvolver(); conv.buffer = this.reverb(ctx);
    const wet = ctx.createGain(); wet.gain.value = 0.55;
    const analyser = ctx.createAnalyser(); analyser.fftSize = 512;
    src.connect(dry).connect(a.master);
    src.connect(pre).connect(conv).connect(wet).connect(a.master);
    src.connect(analyser);
    const start = ctx.currentTime + 2.5;          // a hush before he speaks
    src.start(start);
    src.onended = () => { if (this.voice?.src === src) this.voice.ended = true; };
    this.voice = { src, start, homily, analyser, level: new Uint8Array(analyser.fftSize), nodes: [dry, pre, conv, wet, analyser] };
  }

  stopHomily() {
    if (!this.voice) return;
    try { this.voice.src.stop(); } catch { /* not started */ }
    for (const n of this.voice.nodes) n.disconnect();
    this.voice.src.disconnect();
    this.voice = null;
  }

  leave({ camera, player }) {
    this.inside = false;
    this.stopHomily();
    this.showCaption(null);
    camera.far = this.prevFar; camera.updateProjectionMatrix();
    player.level = this.prevLevel;
  }

  /** Name, title and the words of the homily, lit as they are spoken. */
  showCaption(homily) {
    if (!this.captions) {
      const el = this.captions = document.createElement('div');
      el.id = 'sophia-caption';
      el.className = 'panel';
      el.style.cssText = 'display:none;position:absolute;left:50%;bottom:44px;transform:translateX(-50%);width:min(86%,720px);text-align:center;font-size:12px;line-height:1.55;z-index:7;padding:10px 14px';
      el.innerHTML = '<div class="who" style="color:#f3d276;font-size:10px;letter-spacing:1px;margin-bottom:4px"></div><div class="said"></div>';
      document.getElementById('hud').appendChild(el);
    }
    const el = this.captions;
    if (!homily) { el.style.display = 'none'; this.captionFor = null; return; }
    if (this.captionFor === homily) return;
    this.captionFor = homily;
    el.querySelector('.who').textContent = `ST. JOHN CHRYSOSTOM · ${homily.title.toUpperCase()}`;
    const said = el.querySelector('.said');
    said.replaceChildren(...homily.words.map((w) => { const s = document.createElement('span'); s.textContent = w.w + ' '; s.dataset.s = w.s; s.style.color = '#8f7a55'; return s; }));
    this.wordEls = [...said.children];
    el.style.display = 'block';
  }

  update(dt, time) {
    if (!this.built) return;
    this.updateCrowd(time);
    for (const [i, l] of this.lamps.entries()) l.intensity = 13 + Math.sin(time * 3.1 + i * 1.7) * 0.8 + Math.sin(time * 7.3 + i) * 0.4;
    for (const [i, s] of this.shafts.entries()) s.material.opacity = 0.05 + Math.sin(time * 0.2 + i) * 0.012;
    // Chrysostom gestures with the voice: the louder the phrase, the higher the hand
    let level = 0;
    const v = this.voice;
    if (v && !v.ended && this.audio.ctx) {
      v.analyser.getByteTimeDomainData(v.level);
      let sum = 0; for (const x of v.level) sum += (x - 128) ** 2;
      level = Math.min(1, Math.sqrt(sum / v.level.length) / 28);
      const t = this.audio.ctx.currentTime - v.start;
      if (t >= -0.5) {
        this.showCaption(v.homily);
        for (const w of this.wordEls) w.style.color = t >= Number(w.dataset.s) ? '#f3d276' : '#8f7a55';
      }
    } else if (v?.ended) {
      this.endedFor = (this.endedFor ?? 0) + dt;
      if (this.endedFor > 6) { this.showCaption(null); this.endedFor = 0; this.voice = null; }
    }
    this.gesture = (this.gesture ?? 0) + (level - (this.gesture ?? 0)) * Math.min(1, dt * 6);
    const [left, right] = this.arms;
    right.rotation.x = -0.25 - this.gesture * 1.6 - Math.sin(time * 1.3) * 0.15 * this.gesture;
    right.rotation.z = 0.15 + this.gesture * 0.35;
    left.rotation.x = -0.4 - Math.sin(time * 0.6) * 0.1;
    this.john.rotation.y = Math.sin(time * 0.23) * 0.35;   // facing the doors, looking across the whole congregation
  }

  /** Is the homily still going? (tests and the HUD) */
  get speaking() { return !!this.voice && !this.voice.ended; }
}
