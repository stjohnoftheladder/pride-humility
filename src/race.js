// The chariot race in the Hippodrome: a diversion off the pilgrim road, and a
// small test of the heart.
//
// Four factions run seven laps round the spina, the pilgrim driving for the
// Greens in first person: W drives the horses on, S reins in, A/D steer and
// Shift lays on the lash. The rivals keep to lanes of the racing line, and every
// chariot is scored by its progress round that loop, which is also what tips
// the dolphins of the lap counter. On the fifth lap the Blue chariot is wrecked
// at the turning post (a naufragium, the "shipwreck" every crowd hoped to see),
// and the pilgrim may stop to help its driver, giving up the race.
//
// The outcome feeds the meters once (see RACE_RESULTS and main.js): the wreath
// is vainglory, Ladder rung 22; stopping for a rival is the last made first.
import * as THREE from 'three';
import { hippodromeLayout } from './roadSites.js';

export const RACE_LAPS = 7;
const LINE = 4.3;                       // the racing line: off the spina's axis, and round each meta
const LANES = [-1.9, -0.5, 0.9, 2.3];   // offsets outward from the line, inside to outside
const MAX_SPEED = 10.5;
const ACCEL = 5.5, BRAKE = 12, DRAG = 1.4;
const STEER_RATE = 1.9;                 // rad/s at speed
const GRIP = 14;                        // turn rate x speed the horses hold before they skid
const COUNTDOWN = 3.2;                  // seconds from taking the reins to the mappa falling
const CAR_R = 0.55, TEAM_R = 0.72, TEAM_AHEAD = 2.0;   // collision circles: car, and the four horses
const VIEW_UP = 1.85;                   // eye height standing in the car

const TEAMS = [
  { id: 'green', name: 'GREENS', color: 0x2f8f4e, lane: 2, base: 0 },
  { id: 'blue', name: 'BLUES', color: 0x2c5fb4, lane: 0, base: 10.1 },
  { id: 'red', name: 'REDS', color: 0xb8402e, lane: 1, base: 9.8 },
  { id: 'white', name: 'WHITES', color: 0xe9e2d0, lane: 3, base: 9.9 },
];
const COATS = [0x6b4a2f, 0x3b2a1e, 0x9a8f80, 0x5a3d26];
const PLACES = ['first', 'second', 'third', 'fourth'];

export const RACE_RESULTS = {
  won: {
    title: 'THE VICTOR’S WREATH',
    text: () => 'You cross the line first, beneath the Kathisma. A herald sets the victor’s wreath on your head, and the Greens’ side of the stands chants your name until the stones ring. By the time you walk back out through the gates, they are chanting for the driver of the next race.',
    verse: '“How can you believe, when you receive glory from one another and do not seek the glory that comes from the only God?” – John 5:44',
    pride: 6, flag: 'wonRace',
  },
  placed: {
    title: 'THE DUST OF THE TRACK',
    text: (place) => `You finish ${PLACES[place - 1]}. The roar that carried you round the spina is already arguing about the next race. Saint John Chrysostom grieved that this city emptied its churches for the races; with the dust still in your mouth, you understand why. It is very hard to think of anything else.`,
    verse: '“Vanity of vanities, says the Preacher; all is vanity.” – Ecclesiastes 1:2',
    pride: 3,
  },
  helped: {
    title: 'THE RACE NOT FINISHED',
    text: () => 'You rein in the Greens’ horses beside the wreck and climb down into the sand. The stands howl: a Green has stopped for a Blue. The driver’s leg is broken, but he is alive, and he grips your hand while the other chariots thunder past and the race goes on without you both.',
    verse: '“If anyone would be first, he must be last of all and servant of all.” – Mark 9:35',
    grace: 5, flag: 'helpedCharioteer',
  },
};

/** The racing line as a loop: the south straight run east, round the east
 *  meta, the north straight run west, round the west meta. Distance `s` runs
 *  from the west end of the south straight; `d` is a lane offset outward. */
class Track {
  constructor(L) {
    this.cz = L.cz; this.w = L.metaW; this.e = L.metaE;
    this.ls = this.e - this.w;
    this.arc = Math.PI * LINE;
    this.length = 2 * this.ls + 2 * this.arc;
  }

  at(s, d = 0) {
    const { cz, w, e, ls, arc } = this;
    s = ((s % this.length) + this.length) % this.length;
    if (s < ls) return { x: w + s, z: cz + LINE + d, tx: 1, tz: 0, turn: false };
    s -= ls;
    if (s < arc) {
      const a = Math.PI / 2 - s / LINE, r = LINE + d;
      return { x: e + Math.cos(a) * r, z: cz + Math.sin(a) * r, tx: Math.sin(a), tz: -Math.cos(a), turn: true };
    }
    s -= arc;
    if (s < ls) return { x: e - s, z: cz - LINE - d, tx: -1, tz: 0, turn: false };
    s -= ls;
    const a = -Math.PI / 2 - s / LINE, r = LINE + d;
    return { x: w + Math.cos(a) * r, z: cz + Math.sin(a) * r, tx: Math.sin(a), tz: -Math.cos(a), turn: true };
  }

  /** Loop distance of the point on the line nearest (x, z). */
  project(x, z) {
    const { cz, w, e, ls, arc } = this;
    if (x >= w && x <= e) return z >= cz ? x - w : ls + arc + (e - x);
    if (x > e) return ls + (Math.PI / 2 - Math.atan2(z - cz, x - e)) * LINE;
    let a = Math.atan2(z - cz, x - w);
    if (a > 0) a -= Math.PI * 2;
    return 2 * ls + arc + (-Math.PI / 2 - a) * LINE;
  }

  /** Is loop distance s on the west turn, where the Blue comes to grief? */
  westTurn(s) {
    s = ((s % this.length) + this.length) % this.length;
    return s >= 2 * this.ls + this.arc + 1 && s <= this.length - 2;
  }
}

/** A chariot and its four horses, facing +x with the car at the origin. */
function buildChariot(team, mats, withDriver) {
  const root = new THREE.Group();
  root.name = `chariot-${team.id}`;
  const add = (parent, geometry, material, x, y, z, rz = 0) => {
    const m = new THREE.Mesh(geometry, material);
    m.position.set(x, y, z);
    m.rotation.z = rz;
    m.castShadow = true;
    parent.add(m);
    return m;
  };
  const cloth = new THREE.MeshStandardMaterial({ color: team.color, roughness: 0.75, side: THREE.DoubleSide });

  const car = new THREE.Group();
  root.add(car);
  add(car, new THREE.BoxGeometry(0.9, 0.08, 1.1), mats.wood, 0, 0.55, 0);
  add(car, new THREE.CylinderGeometry(0.55, 0.55, 0.8, 12, 1, true, 0, Math.PI), cloth, 0, 0.95, 0);
  add(car, new THREE.TorusGeometry(0.55, 0.045, 6, 16, Math.PI).rotateX(Math.PI / 2).rotateY(Math.PI / 2), mats.gold, 0, 1.35, 0);
  add(car, new THREE.BoxGeometry(0.06, 0.06, 1.36), mats.wood, -0.1, 0.45, 0);
  const wheels = [];
  for (const side of [-1, 1]) {
    const wheel = new THREE.Group();
    wheel.position.set(-0.1, 0.45, side * 0.66);
    add(wheel, new THREE.TorusGeometry(0.42, 0.06, 6, 16), mats.wood, 0, 0, 0);
    add(wheel, new THREE.BoxGeometry(0.84, 0.05, 0.04), mats.wood, 0, 0, 0);
    add(wheel, new THREE.BoxGeometry(0.05, 0.84, 0.04), mats.wood, 0, 0, 0);
    car.add(wheel);
    wheels.push(wheel);
  }
  add(root, new THREE.BoxGeometry(2.2, 0.06, 0.06), mats.wood, 1.25, 0.85, 0);
  add(root, new THREE.BoxGeometry(0.08, 0.06, 1.3), mats.gold, 2.3, 1.25, 0);

  let driver = null;
  if (withDriver) {
    driver = new THREE.Group();
    driver.position.set(-0.05, 0.6, 0);
    add(driver, new THREE.CapsuleGeometry(0.2, 0.55, 4, 8), cloth, 0, 0.65, 0);
    add(driver, new THREE.SphereGeometry(0.14, 10, 8), mats.skin, 0, 1.17, 0);
    for (const side of [-1, 1]) add(driver, new THREE.BoxGeometry(0.5, 0.07, 0.07), mats.skin, 0.25, 0.82, side * 0.15);
    car.add(driver);
  }

  const horses = [];
  [-0.54, -0.18, 0.18, 0.54].forEach((hz, i) => {
    const coat = mats.coats[(i + team.id.length) % mats.coats.length];
    const horse = new THREE.Group();
    horse.position.set(TEAM_AHEAD, 0, hz);
    add(horse, new THREE.BoxGeometry(1.0, 0.4, 0.26), coat, 0, 1.05, 0);
    add(horse, new THREE.BoxGeometry(0.24, 0.6, 0.2), coat, 0.5, 1.4, 0, -0.55);
    add(horse, new THREE.BoxGeometry(0.42, 0.18, 0.18), coat, 0.78, 1.66, 0, -0.35);
    add(horse, new THREE.BoxGeometry(0.08, 0.22, 0.08), cloth, 0.62, 1.88, 0);
    add(horse, new THREE.BoxGeometry(0.3, 0.06, 0.08), mats.dark, -0.6, 1.0, 0, 0.6);
    const legs = [];
    for (const [lx, lz, phase] of [[0.38, -0.08, 0], [0.38, 0.08, 0.6], [-0.38, -0.08, Math.PI], [-0.38, 0.08, Math.PI + 0.6]]) {
      const hip = new THREE.Group();
      hip.position.set(lx, 0.88, lz);
      add(hip, new THREE.BoxGeometry(0.09, 0.85, 0.09).translate(0, -0.42, 0), coat, 0, 0, 0);
      hip.userData.phase = phase;
      horse.add(hip);
      legs.push(hip);
    }
    root.add(horse);
    horses.push({ horse, legs, phase: i * 0.7 });
  });
  return { root, car, wheels, horses, driver, gait: 0 };
}

export class ChariotRace {
  constructor(level, site, camera, audio, hud) {
    this.level = level;
    this.site = site;
    this.camera = camera;
    this.audio = audio;
    this.hud = hud;
    this.L = hippodromeLayout(site);
    this.track = new Track(this.L);
    this.startS = this.L.kx - this.L.metaW;   // the start and finish line, under the Kathisma
    this.group = new THREE.Group();
    this.group.name = 'hippodrome-race';
    level.featureGroups[site.id].add(this.group);
    this.dolphins = level.featureGroups[site.id].getObjectByName('hippodrome-dolphins')?.children ?? [];

    const mats = {
      wood: level.mat.get('wood_floor'),
      gold: level.mat.get('gold'),
      skin: new THREE.MeshStandardMaterial({ color: 0xc99a73, roughness: 0.8 }),
      dark: new THREE.MeshStandardMaterial({ color: 0x1c140d, roughness: 0.9 }),
      coats: COATS.map((color) => new THREE.MeshStandardMaterial({ color, roughness: 0.85 })),
    };
    this.racers = TEAMS.map((team) => {
      const model = buildChariot(team, mats, team.id !== 'green');
      this.group.add(model.root);
      return { team, model, me: team.id === 'green' };
    });
    this.me = this.racers[0];
    this.blue = this.racers.find((r) => r.team.id === 'blue');
    this.buildCrowd();
    this.buildEmperor(mats);

    // Where each chariot waits, and the block it makes while it waits there.
    this.idleColliders = this.racers.map((r) => {
      const p = this.track.at(this.startS, LANES[r.team.lane]);
      level.addCollider(p.x + 1.1, p.z, 3.4, 1.3, 2.2, site.id);
      return level.colliders[level.colliders.length - 1];
    });

    this.phase = 'idle';   // idle | countdown | running | finish
    this.keys = {};
    this.look = { yaw: 0, pitch: 0 };
    this.reset();
  }

  // ---------------------------------------------------------------- scenery
  /** Spectators on every tier, as two instanced meshes (bodies and heads). */
  buildCrowd() {
    const { cz, half, tiers, tierDepth, tierRise, curveX, standEnd, kx } = this.L;
    const seats = [];
    let seed = 7;
    const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const seat = (x, z, y) => { if (rand() > 0.16) seats.push({ x: x + (rand() - 0.5) * 0.16, z, y, phase: rand() * 6.28, rate: 7 + rand() * 5 }); };
    for (let t = 0; t < tiers; t++) {
      const r = half + tierDepth / 2 + t * tierDepth, y = (t + 1) * tierRise;
      for (let x = curveX + 0.3; x < standEnd - 0.2; x += 0.55) {
        seat(x, cz - r, y);
        if (Math.abs(x - kx) > 3.6) seat(x, cz + r, y);
      }
      const n = Math.floor(Math.PI * r / 0.55);
      for (let i = 0; i < n; i++) {
        const a = Math.PI / 2 + (i + 0.5) / n * Math.PI;
        seat(curveX + Math.cos(a) * r, cz + Math.sin(a) * r, y);
      }
    }
    const palette = [0x2f8f4e, 0x2c5fb4, 0x8a7a62, 0x6e5a44, 0xd8cdb4, 0x7d3a2a, 0x2f8f4e, 0x2c5fb4, 0x5b6470];
    const bodies = new THREE.InstancedMesh(new THREE.BoxGeometry(0.32, 0.5, 0.26),
      new THREE.MeshStandardMaterial({ roughness: 0.9 }), seats.length);
    const heads = new THREE.InstancedMesh(new THREE.BoxGeometry(0.18, 0.18, 0.18),
      new THREE.MeshStandardMaterial({ color: 0xc99a73, roughness: 0.9 }), seats.length);
    const color = new THREE.Color();
    seats.forEach((s, i) => bodies.setColorAt(i, color.setHex(palette[Math.floor(rand() * palette.length)])));
    bodies.name = 'hippodrome-crowd';
    bodies.frustumCulled = false;   // the instances bob; the default bounds would not follow them
    heads.frustumCulled = false;
    heads.name = 'hippodrome-crowd-heads';
    this.group.add(bodies, heads);
    this.crowd = { seats, bodies, heads, m: new THREE.Matrix4(), cheer: 0.03, settled: false };
    this.placeCrowd(0);
  }

  placeCrowd(time) {
    const { seats, bodies, heads, m, cheer } = this.crowd;
    for (let i = 0; i < seats.length; i++) {
      const s = seats[i];
      const lift = Math.max(0, Math.sin(time * s.rate + s.phase)) * cheer;
      m.makeTranslation(s.x, s.y + 0.25 + lift, s.z);
      bodies.setMatrixAt(i, m);
      m.makeTranslation(s.x, s.y + 0.6 + lift, s.z);
      heads.setMatrixAt(i, m);
    }
    bodies.instanceMatrix.needsUpdate = true;
    heads.instanceMatrix.needsUpdate = true;
  }

  /** The emperor in the Kathisma, with the mappa he drops to start the race. */
  buildEmperor(mats) {
    const { kx, cz, half, tiers, tierRise } = this.L;
    const floor = tiers * tierRise + 0.4, z = cz + half + 1.6;
    const purple = new THREE.MeshStandardMaterial({ color: 0x5b2a6e, roughness: 0.6 });
    const emperor = new THREE.Group();
    emperor.name = 'hippodrome-emperor';
    const robe = new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.7, 4, 8), purple);
    robe.position.set(kx, floor + 0.62, z);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), mats.skin);
    head.position.set(kx, floor + 1.2, z);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.12, 10), mats.gold);
    crown.position.set(kx, floor + 1.34, z);
    emperor.add(robe, head, crown);
    this.group.add(emperor);
    this.mappa = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.02, 0.4),
      new THREE.MeshStandardMaterial({ color: 0xf4efe2, roughness: 0.9 }));
    this.mappa.name = 'hippodrome-mappa';
    this.mappaHome = new THREE.Vector3(kx, floor + 1.45, z - 0.55);
    this.group.add(this.mappa);
  }

  // ---------------------------------------------------------------- state
  /** Put every chariot back on the start line, the dolphins up and the
   *  mappa in the emperor's hand. */
  reset() {
    this.phase = 'idle';
    this.keys = {};
    this.look.yaw = 0; this.look.pitch = 0;
    for (const r of this.racers) {
      Object.assign(r, {
        lane: LANES[r.team.lane], progress: 0, v: 0, crashed: false, finished: false, finishTime: 0,
        laneTimer: 2 + Math.random() * 3, targetLane: LANES[r.team.lane],
      });
      const p = this.track.at(this.startS, r.lane);
      r.x = p.x; r.z = p.z; r.heading = 0;
      r.model.root.visible = true;
      r.model.car.rotation.set(0, 0, 0);
      r.model.car.position.set(0, 0, 0);
      for (const h of r.model.horses) { h.horse.visible = true; h.horse.position.y = 0; }
      if (r.model.driver) { r.model.driver.rotation.set(0, 0, 0); r.model.driver.position.set(-0.05, 0.6, 0); }
      this.pose(r);
    }
    this.me.prevS = this.startS;
    this.leaderLaps = 0;
    for (const d of this.dolphins) { d.rotation.z = 0.5; d.userData.target = 0.5; }
    this.mappa.position.copy(this.mappaHome);
    this.mappa.rotation.set(0, 0, 0);
    this.mappaFall = -1;
    for (const c of this.idleColliders) c.off = false;
    this.lash = 1; this.boost = 0; this.shake = 0; this.bumpCooldown = 0;
    this.excitement = 0; this.clock = 0; this.gaitAcc = 0;
    this.crashSpot = null;
    this.result = null;
  }

  /** Can the pilgrim, standing at (x, z), take the Greens' reins? */
  canBoard(pos) {
    if (this.phase !== 'idle') return false;
    const r = this.me;
    return Math.hypot(pos.x - (r.x + 1.1), pos.z - r.z) < 2.9;
  }

  start() {
    this.reset();
    this.phase = 'countdown';
    for (const c of this.idleColliders) c.off = true;
    this.audio.raceStart?.();
    this.hud.message('The Greens’ driver is drunk in the stables. The faction’s master presses the reins into your hands: “The whole city is watching.”', 3000);
  }

  /** Where the pilgrim stands after stepping down: the north straight,
   *  across from the line, facing the gates. */
  stepDownSpot() {
    return { x: this.L.kx, z: this.L.cz - LINE, yaw: -Math.PI / 2 };
  }

  onKey(e, down) {
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      this.keys[e.code] = down;
    }
    if (down && !e.repeat && (e.code === 'ShiftLeft' || e.code === 'ShiftRight')) this.layOnLash();
  }

  lookBy(dx, dy) {
    this.look.yaw = Math.max(-1.4, Math.min(1.4, this.look.yaw - dx));
    this.look.pitch = Math.max(-0.6, Math.min(0.5, this.look.pitch - dy));
  }

  layOnLash() {
    if (this.phase !== 'running' || this.lash < 0.3) return;
    this.lash -= 0.3;
    this.boost = 3.2;
    this.me.v += 1.4;
    this.audio.lash?.();
  }

  /** E: kneel by the wrecked Blue driver, if the chariot has stopped by him. */
  help() {
    if (this.phase !== 'running' || !this.crashSpot) return false;
    const r = this.me;
    const near = Math.min(Math.hypot(r.x - this.crashSpot.x, r.z - this.crashSpot.z),
      Math.hypot(this.front(r).x - this.crashSpot.x, this.front(r).z - this.crashSpot.z));
    if (near > 4.5) return false;
    if (Math.abs(r.v) > 3) { this.hud.message('Rein in first (S), or you will run him down.', 1600); return false; }
    this.result = { outcome: 'helped', place: 0 };
    this.audio.raceStop?.();
    return true;
  }

  abandon() {
    if (this.phase === 'idle') return;
    this.result = { outcome: 'abandoned', place: 0 };
    this.audio.raceStop?.();
  }

  front(r) {
    return { x: r.x + Math.cos(r.heading) * TEAM_AHEAD, z: r.z + Math.sin(r.heading) * TEAM_AHEAD };
  }

  place() {
    const order = [...this.racers].sort((a, b) => {
      if (a.finished !== b.finished) return a.finished ? -1 : 1;
      if (a.finished) return a.finishTime - b.finishTime;
      return b.progress - a.progress;
    });
    return { order, mine: order.indexOf(this.me) + 1 };
  }

  // ---------------------------------------------------------------- the race
  /** Advance one frame of the race. Returns the result once it is over. */
  update(dt) {
    if (this.result) return this.result;
    this.clock += dt;
    if (this.phase === 'countdown') {
      const before = this.clock - dt;
      for (const beat of [0.8, 1.6, 2.4]) if (before < beat && this.clock >= beat) this.audio.trumpet?.(beat === 2.4 ? 523 : 392);
      if (this.clock >= COUNTDOWN) {
        this.phase = 'running';
        this.clock = 0;
        this.mappaFall = 0;
        this.audio.fanfare?.();
        this.hud.message('The emperor lets fall the mappa. They are off!', 1600);
      }
    } else if (this.phase === 'running' || this.phase === 'finish') {
      this.drive(dt);
      for (const r of this.racers) if (!r.me) this.steerRival(r, dt);
      this.collideRivals();
      this.score();
      if (this.phase === 'finish' && this.clock >= this.finishAt) {
        const { mine } = this.place();
        this.result = { outcome: mine === 1 ? 'won' : 'placed', place: mine };
        this.audio.raceStop?.();
      }
    }
    for (const r of this.racers) this.pose(r, dt);
    this.aimCamera(dt);
    this.updateHud();
    return this.result;
  }

  drive(dt) {
    const r = this.me, k = this.keys;
    const finishing = this.phase === 'finish';
    const fwd = !finishing && (k.KeyW || k.ArrowUp);
    const back = finishing || k.KeyS || k.ArrowDown;
    const steer = finishing ? 0 : ((k.KeyD || k.ArrowRight) ? 1 : 0) - ((k.KeyA || k.ArrowLeft) ? 1 : 0);
    this.boost = Math.max(0, this.boost - dt * 1.6);
    this.lash = Math.min(1, this.lash + dt * 0.09);
    const top = MAX_SPEED + this.boost;
    if (fwd) r.v += ACCEL * dt;
    else if (back) r.v -= BRAKE * dt * (r.v > 0 ? 1 : 0.25);
    else r.v -= Math.sign(r.v) * Math.min(Math.abs(r.v), DRAG * dt);
    r.v = Math.max(-2, Math.min(top, r.v));

    const rate = STEER_RATE * (0.35 + 0.65 * Math.min(1, Math.abs(r.v) / 4)) * steer;
    r.heading += rate * dt;
    const load = Math.abs(rate * r.v);
    if (load > GRIP) {
      r.v -= (load - GRIP) * 0.6 * dt;
      this.shake = Math.max(this.shake, 0.05);
      if (Math.random() < dt * 3) this.audio.skid?.();
    }

    let nx = r.x + Math.cos(r.heading) * r.v * dt;
    let nz = r.z + Math.sin(r.heading) * r.v * dt;
    // the car and the team ahead of it each push off walls, stands and spina
    let hit = false;
    for (const [ahead, radius] of [[0, CAR_R], [TEAM_AHEAD, TEAM_R]]) {
      const px = nx + Math.cos(r.heading) * ahead, pz = nz + Math.sin(r.heading) * ahead;
      const out = { x: px, z: pz };
      for (let i = 0; i < 3; i++) if (!this.level.collideCircle(out.x, out.z, radius, out)) break;
      if (Math.abs(out.x - px) + Math.abs(out.z - pz) > 1e-4) { nx += out.x - px; nz += out.z - pz; hit = true; }
    }
    if (hit) this.bump(0.72);
    r.x = nx; r.z = nz;
    this.bumpCooldown = Math.max(0, this.bumpCooldown - dt);
    this.shake = Math.max(0, this.shake - dt * 1.5);

    const s = this.track.project(r.x, r.z);
    let ds = s - r.prevS;
    if (ds > this.track.length / 2) ds -= this.track.length;
    if (ds < -this.track.length / 2) ds += this.track.length;
    r.progress += ds;
    r.prevS = s;
  }

  bump(keep) {
    if (this.bumpCooldown > 0) return;
    this.me.v *= keep;
    this.shake = 0.3;
    this.bumpCooldown = 0.3;
    this.excitement = Math.min(1, this.excitement + 0.25);
    this.audio.thud?.();
  }

  steerRival(r, dt) {
    if (r.crashed) return;
    const me = this.me;
    const p = this.track.at(this.startS + r.progress, r.lane);
    let target = r.team.base;
    if (r.finished) target *= 0.5;
    // keep the race close: the field eases off a runaway leader and presses a laggard
    const gap = r.progress - me.progress;
    if (gap > 8) target *= 0.93;
    else if (gap < -8) target *= 1.06;
    if (p.turn) target = Math.min(target, STEER_RATE * (LINE + r.lane) * 1.02);
    // a chariot close behind in the same lane checks rather than ramming
    if (gap < 0 && gap > -3.6 && Math.abs(this.laneOf(me) - r.lane) < 1.1) target = Math.min(target, me.v * 0.97);
    r.v += (target - r.v) * Math.min(1, dt * 1.6);
    r.laneTimer -= dt;
    if (r.laneTimer <= 0 && !p.turn) {
      r.laneTimer = 3 + Math.random() * 4;
      if (r !== this.blue) r.targetLane = LANES[Math.floor(Math.random() * LANES.length)];
    }
    r.lane += Math.sign(r.targetLane - r.lane) * Math.min(Math.abs(r.targetLane - r.lane), dt * 0.7);
    r.progress += r.v * dt * (LINE / Math.max(1.5, LINE + (p.turn ? r.lane : 0)));
    const q = this.track.at(this.startS + r.progress, r.lane);
    r.x = q.x; r.z = q.z;
    r.heading = Math.atan2(q.tz, q.tx);

    // the naufragium: the Blue comes to grief at the west meta, fifth lap
    if (r === this.blue && !this.crashSpot && r.progress >= 4 * this.track.length
      && this.track.westTurn(this.startS + r.progress)) this.wreck(r);
  }

  wreck(r) {
    r.crashed = true;
    r.v = 0;
    for (const h of r.model.horses) h.horse.visible = false;
    r.model.car.rotation.x = 1.25;
    r.model.car.position.y = 0.3;
    // the driver lies thrown clear, on the far side from the spina
    const out = this.track.at(this.startS + r.progress, r.lane + 1.1);
    this.crashSpot = { x: out.x, z: out.z };
    if (r.model.driver) {
      // world offset into the chariot's frame (the root turns by -heading)
      const local = new THREE.Vector3(out.x - r.x, 0, out.z - r.z)
        .applyAxisAngle(new THREE.Vector3(0, 1, 0), r.heading);
      r.model.car.remove(r.model.driver);
      r.model.root.add(r.model.driver);
      r.model.driver.position.set(local.x, 0.15, local.z);
      r.model.driver.rotation.set(Math.PI / 2, 0, 0);
    }
    this.excitement = 1;
    this.shake = Math.max(this.shake, 0.15);
    this.audio.crash?.();
    this.hud.message('NAUFRAGIUM! The Blue chariot is wrecked at the turning post. His horses tear free and run on alone.', 3200);
  }

  laneOf(r) {
    const p = this.track.at(this.track.project(r.x, r.z), 0);
    return (r.x - p.x) * -p.tz + (r.z - p.z) * p.tx;
  }

  /** Rivals keep their line; the pilgrim's chariot is pushed off them. */
  collideRivals() {
    const me = this.me;
    const mine = [[me.x, me.z, CAR_R], [this.front(me).x, this.front(me).z, TEAM_R]];
    for (const r of this.racers) {
      if (r.me) continue;
      const theirs = r.crashed ? [[r.x, r.z, 0.85]] : [[r.x, r.z, CAR_R], [this.front(r).x, this.front(r).z, TEAM_R]];
      for (const [ax, az, ar] of mine) for (const [bx, bz, br] of theirs) {
        const dx = ax - bx, dz = az - bz, d = Math.hypot(dx, dz);
        if (d >= ar + br || d < 1e-5) continue;
        const push = ar + br - d;
        me.x += dx / d * push; me.z += dz / d * push;
        if (!r.crashed) r.v *= 0.97;
        this.bump(r.crashed ? 0.4 : 0.9);
      }
    }
  }

  score() {
    const laps = this.track.length;
    const lead = Math.max(...this.racers.map((r) => r.progress));
    const leaderLaps = Math.min(RACE_LAPS, Math.floor(lead / laps));
    while (this.leaderLaps < leaderLaps) {
      const d = this.dolphins[this.leaderLaps];
      if (d) d.userData.target = 2.7;
      this.leaderLaps++;
      this.audio.cheer?.();
      this.excitement = Math.min(1, this.excitement + 0.3);
    }
    for (const r of this.racers) {
      if (!r.finished && !r.crashed && r.progress >= RACE_LAPS * laps) {
        r.finished = true;
        r.finishTime = this.clock;
        if (r.me && this.phase === 'running') {
          this.phase = 'finish';
          this.finishAt = this.clock + 1.6;
          const { mine } = this.place();
          this.audio.cheer?.();
          this.hud.message(mine === 1 ? 'FIRST! The Greens’ stands are on their feet.' : `You cross the line ${PLACES[mine - 1]}.`, 1800);
        }
      }
    }
    const { order } = this.place();
    const ahead = order[order.indexOf(this.me) - 1];
    if (ahead && Math.abs(ahead.progress - this.me.progress) < 2.5) this.excitement = Math.min(1, this.excitement + 0.01);
    this.excitement = Math.max(0.35, this.excitement - 0.004);
  }

  // ---------------------------------------------------------------- drawing
  pose(r, dt = 0) {
    const root = r.model.root;
    root.position.set(r.x, 0, r.z);
    root.rotation.y = -r.heading;
    if (!dt) return;
    const speed = Math.abs(r.v);
    for (const w of r.model.wheels) w.rotation.z -= r.v * dt / 0.42;
    r.model.gait += dt * (2 + speed * 1.15);
    for (const h of r.model.horses) {
      const g = r.model.gait + h.phase;
      const stride = Math.min(1, speed / 6) * 0.7;
      for (const leg of h.legs) leg.rotation.z = Math.sin(g + leg.userData.phase) * stride;
      h.horse.position.y = Math.abs(Math.sin(g)) * 0.09 * Math.min(1, speed / 4);
    }
    if (r.me && speed > 1) {
      // hooves: two beats a stride, louder the faster the team runs
      this.gaitAcc += dt * (2 + speed * 1.15) / Math.PI;
      if (this.gaitAcc >= 1) { this.gaitAcc -= 1; this.audio.hoof?.(Math.min(1, speed / MAX_SPEED)); }
    }
  }

  aimCamera(dt) {
    const r = this.me, cam = this.camera;
    const back = 0.05, s = this.shake;
    cam.position.set(
      r.x - Math.cos(r.heading) * back + (Math.random() - 0.5) * s,
      VIEW_UP + Math.abs(Math.sin(r.model.gait)) * 0.04 * Math.min(1, Math.abs(r.v) / 5) + (Math.random() - 0.5) * s,
      r.z - Math.sin(r.heading) * back + (Math.random() - 0.5) * s,
    );
    this.look.yaw -= this.look.yaw * Math.min(1, dt * 0.8);
    this.look.pitch -= this.look.pitch * Math.min(1, dt * 0.8);
    cam.rotation.set(-0.1 + this.look.pitch, Math.atan2(-Math.cos(r.heading), -Math.sin(r.heading)) + this.look.yaw, 0, 'YXZ');
    const fov = 75 + 12 * Math.min(1, Math.max(0, r.v) / MAX_SPEED);
    if (Math.abs(cam.fov - fov) > 0.05) { cam.fov = fov; cam.updateProjectionMatrix(); }
  }

  /** Put the pilgrim's own eyes back: normal field of view. */
  restoreCamera() {
    this.camera.fov = 75;
    this.camera.updateProjectionMatrix();
  }

  updateHud() {
    const { order, mine } = this.place();
    const lap = Math.max(1, Math.min(RACE_LAPS, Math.floor(this.me.progress / this.track.length) + 1));
    this.hud.setRace?.({
      lap, laps: RACE_LAPS, place: mine,
      order: order.map((r) => ({ name: r.team.name, color: r.team.color, me: r.me, out: r.crashed })),
      lash: this.lash,
      help: !!this.crashSpot && Math.hypot(this.me.x - this.crashSpot.x, this.me.z - this.crashSpot.z) < 7,
      countdown: this.phase === 'countdown' ? Math.max(1, Math.ceil(COUNTDOWN - this.clock)) : 0,
    });
    this.audio.setRaceMix?.(Math.abs(this.me.v) / MAX_SPEED, this.excitement);
  }

  /** Every frame, racing or not: the crowd, the dolphins and the mappa. */
  animate(dt, time, viewer) {
    if (!this.group.visible || !this.level.featureGroups[this.site.id].visible) return;
    const racing = this.phase !== 'idle';
    const near = racing || Math.hypot(viewer.x - (this.L.curveX + this.L.standEnd) / 2, viewer.z - this.L.cz) < 32;
    if (!near) return;
    this.crowd.cheer += ((racing ? 0.06 + this.excitement * 0.16 : 0.025) - this.crowd.cheer) * Math.min(1, dt * 2);
    this.placeCrowd(time);
    for (const d of this.dolphins) {
      const target = d.userData.target ?? 0.5;
      d.rotation.z += (target - d.rotation.z) * Math.min(1, dt * 4);
    }
    if (this.mappaFall >= 0 && this.mappaFall < 1) {
      this.mappaFall = Math.min(1, this.mappaFall + dt * 1.4);
      const f = this.mappaFall;
      this.mappa.position.set(this.mappaHome.x, this.mappaHome.y - f * f * (this.mappaHome.y - 0.9), this.mappaHome.z - f * 2.2);
      this.mappa.rotation.set(f * 2.4, f * 1.3, f * 0.8);
    }
  }

  /** For tests: a snapshot of the race. */
  snapshot() {
    const { order, mine } = this.place();
    return {
      phase: this.phase,
      place: mine,
      order: order.map((r) => r.team.id),
      progress: +this.me.progress.toFixed(2),
      speed: +this.me.v.toFixed(2),
      lap: Math.floor(this.me.progress / this.track.length) + 1,
      length: this.track.length,
      leaderLaps: this.leaderLaps,
      crashed: !!this.crashSpot,
      crashSpot: this.crashSpot && { ...this.crashSpot },
      dolphinsDown: this.dolphins.filter((d) => (d.userData.target ?? 0.5) > 1).length,
      at: { x: +this.me.x.toFixed(2), z: +this.me.z.toFixed(2), heading: +this.me.heading.toFixed(3) },
      idleBlocking: this.idleColliders.every((c) => !c.off),
    };
  }

  /** For tests: jump the race on, as if the laps had been run. */
  debugAdvance({ progress, rivals, blueWreck } = {}) {
    if (progress !== undefined) {
      this.me.progress = progress;
      const p = this.track.at(this.startS + progress, this.me.lane);
      this.me.x = p.x; this.me.z = p.z; this.me.heading = Math.atan2(p.tz, p.tx);
      this.me.prevS = this.track.project(p.x, p.z);
    }
    if (rivals !== undefined) for (const r of this.racers) if (!r.me) r.progress = rivals;
    if (blueWreck) {
      const midWest = 2 * this.track.ls + 1.5 * this.track.arc;
      this.blue.progress = 4 * this.track.length + midWest - this.startS;
      const p = this.track.at(midWest, this.blue.lane);
      this.blue.x = p.x; this.blue.z = p.z; this.blue.heading = Math.atan2(p.tz, p.tx);
      this.wreck(this.blue);
      this.pose(this.blue);
    }
  }

  /** For tests: stand the pilgrim's chariot still beside the wreck. */
  debugStopBy(spot) {
    this.me.x = spot.x + 1.2; this.me.z = spot.z; this.me.v = 0;
  }
}
