import * as THREE from 'three';
import { WorldActivity, makeLabel, makePerson } from './worldKit.js';

export const ROOM = 'The Milion';
const BOARD = { x: 63, z: 318 };
const PORTER = { x: 68, z: 317 };
// Board arms, in turning order. The pointer starts north.
const ARMS = [
  { name: 'north', carving: 'carved horses', route: [[57, 318], [55, 304]] },
  { name: 'west', carving: 'carved dome', route: [[57, 318], [53.5, 311.5]] },
  { name: 'south', carving: 'worn smooth', route: [[57, 318], [55, 334]] },
  { name: 'east', carving: 'carved gate', route: [[63, 320.3], [70, 319.6], [76, 320]] },
];
const TRAVELERS = [
  { name: 'Pilgrim from Nicaea', seeks: 'the Great Church', arm: 1, color: 0x7a5a3a },
  { name: 'Cappadocian groom', seeks: 'the races', arm: 0, color: 0x3f6b4f },
  { name: 'Widow from Chios', seeks: 'the grain ships', arm: 2, color: 0x6a4d6e },
];
const SPEED = 2.6;

export default class Milion extends WorldActivity {
  constructor(options) {
    super(options, { hudId: 'milion-hud', title: 'MILE ZERO', center: BOARD, radius: 13,
      controls: 'WASD walk · E turn the board / ask · F point the way · Q / Esc leave · R retry' });
  }
  build() {
    const group = this.group = new THREE.Group(); group.name = 'world-activity-milion';
    this.level.featureGroups.milion.add(group);
    const stone = this.level.mat.get('stone_wall'), gold = this.level.mat.get('gold');
    const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 0.85, 10), stone);
    pedestal.position.set(BOARD.x, 0.425, BOARD.z);
    this.board = new THREE.Group(); this.board.position.set(BOARD.x, 0.9, BOARD.z);
    const disk = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.08, 20), stone);
    const pointer = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.95, 4).rotateX(-Math.PI / 2), gold);
    pointer.position.set(0, 0.12, -0.35); this.board.add(disk, pointer);
    const armGeometry = new THREE.BoxGeometry(0.22, 0.06, 0.6);
    ARMS.forEach((arm, i) => {
      const a = i * Math.PI / 2, mesh = new THREE.Mesh(armGeometry, stone);
      mesh.position.set(BOARD.x - Math.sin(a) * 0.95, 0.9, BOARD.z - Math.cos(a) * 0.95); mesh.rotation.y = a; group.add(mesh);
      makeLabel(group, arm.carving, BOARD.x - Math.sin(a) * 1.35, 1.25 + (i % 2) * 0.25, BOARD.z - Math.cos(a) * 1.35);
    });
    group.add(pedestal, this.board);
    this.level.addCollider(BOARD.x, BOARD.z, 0.9, 0.9, 1, 'milion');
    this.porter = makePerson(this.level, group, { id: 'milion-porter', name: 'Basil · Local porter', ...PORTER, color: 0x537887 });
    this.level.npcs.push({ id: this.porter.id, name: this.porter.name, role: 'worker', ...PORTER });
    this.walkers = TRAVELERS.map((t, i) => makePerson(this.level, group, { id: `milion-traveler-${i}`, name: `Seeks ${t.seeks}`, x: 0, z: 0, color: t.color }));
  }
  newGame() {
    const travelers = TRAVELERS.map((t, i) => ({ ...t, state: 'waiting', x: 61.6 - i * 1.1, z: 319.4 + i * 0.7, path: null, asked: false, pause: 0 }));
    return { pointer: 0, shown: 0, current: 0, travelers, thanks: null };
  }
  intro() { return 'Three travelers ask the way at mile zero. Turn the board until its pointer matches what they seek, then point the way.'; }
  timeoutText() { return 'The square empties before every traveler finds the way. Try again.'; }
  traveler() { return this.game.travelers[this.game.current] ?? null; }
  arrived() { return this.game.travelers.filter(t => t.state === 'arrived').length; }
  near() { return this.nearest([{ role: 'board', ...BOARD }, { role: 'porter', ...PORTER }], 1.9); }
  act(code) {
    const g = this.game, t = this.near(), traveler = this.traveler(); if (!t) return;
    if (t.role === 'porter' && code === 'KeyE') {
      if (!traveler || traveler.state !== 'waiting') { this.hud.message('Basil: “Wait for the next traveler to step up.”', 3500); return; }
      traveler.asked = true;
      this.hud.message(`Basil: “${traveler.seeks[0].toUpperCase()}${traveler.seeks.slice(1)}? Turn the pointer ${ARMS[traveler.arm].name}${traveler.arm === 2 ? ', down the road to the sea walls. That arm wore smooth years ago' : ''}.”`, 6500);
    } else if (t.role === 'board' && code === 'KeyE') {
      g.pointer = (g.pointer + 1) % 4;
    } else if (t.role === 'board' && code === 'KeyF' && traveler?.state === 'waiting') {
      const right = g.pointer === traveler.arm, route = ARMS[g.pointer].route.map(([x, z]) => ({ x, z }));
      // A confident guess at the worn arm sends the traveler off for good.
      const guessed = traveler.arm === 2 && !traveler.asked;
      traveler.chosen = g.pointer;
      if (right || guessed) { traveler.state = guessed ? 'guessed' : 'walking'; traveler.path = route; g.current++; }
      else {
        // A wrong turn walks out, stops short, and retraces its steps.
        const out = route.slice(0, -1);
        Object.assign(traveler, { state: 'astray', returning: false, path: out, back: [...out].reverse().slice(1).concat({ x: traveler.x, z: traveler.z }) });
      }
    }
  }
  move(t, dt) {
    const to = t.path[0]; if (!to) return true;
    const d = Math.hypot(to.x - t.x, to.z - t.z), step = SPEED * dt;
    if (d <= step) { t.x = to.x; t.z = to.z; t.path.shift(); return !t.path.length; }
    t.x += (to.x - t.x) / d * step; t.z += (to.z - t.z) / d * step; t.facing = Math.atan2(to.x - t.x, to.z - t.z);
    return false;
  }
  tick(dt) {
    const g = this.game;
    if (!g.done) {
      g.travelers.forEach((t, i) => {
        if (t.state === 'waiting' && i > g.current) {
          // Queue shuffles forward when the one ahead leaves.
          const slot = { x: 61.6 - (i - g.current) * 1.1, z: 319.4 + (i - g.current) * 0.7 };
          t.path = [slot]; this.move(t, dt);
        } else if (t.state === 'waiting' && i === g.current && Math.hypot(t.x - 61.6, t.z - 319.4) > 0.05) {
          t.path = [{ x: 61.6, z: 319.4 }]; this.move(t, dt);
        } else if (t.state === 'walking' || t.state === 'guessed') {
          if (this.move(t, dt)) {
            if (t.state === 'guessed') { t.state = 'gone'; this.finish('proud', `${t.name} sets off ${ARMS[t.chosen].name} on your word. Basil watches, unsure where the road will take her.`); }
            else {
              t.state = 'arrived';
              if (this.arrived() === TRAVELERS.length) {
                // Someone comes back to thank the porter before the moment closes.
                const first = g.travelers[0]; first.state = 'thanking'; first.path = [{ x: 57, z: 318 }, { x: 63, z: 320.3 }, { x: PORTER.x - 0.9, z: PORTER.z + 0.4 }];
                first.x = ARMS[first.arm].route.at(-1)[0]; first.z = ARMS[first.arm].route.at(-1)[1];
              }
            }
          }
        } else if (t.state === 'astray') {
          if (t.pause > 0) { t.pause -= dt; t.facing = (t.facing ?? 0) + dt * 4; if (t.pause <= 0) t.path = [...t.back]; }
          else if (this.move(t, dt)) {
            if (!t.returning) { t.returning = true; t.pause = 1.2; }
            else { t.state = 'waiting'; t.returning = false; this.hud.message(`${t.name} comes back, unsure. Check the carving and correct your directions.`, 4500); }
          }
        } else if (t.state === 'thanking' && this.move(t, dt)) {
          t.state = 'thanked';
          this.finish('humble', `${t.name} returns to thank Basil. All three travelers found their way, and you learned the worn arm from someone who knew.`);
        }
      });
    }
    let delta = g.pointer - g.shown; if (delta < 0) delta += 4;
    g.shown = delta < 0.02 ? g.pointer : (g.shown + Math.min(delta, dt * 5)) % 4;
    this.board.rotation.y = g.shown * Math.PI / 2;
    g.travelers.forEach((t, i) => {
      const fig = this.walkers[i].figure;
      fig.visible = !['arrived', 'gone'].includes(t.state);
      fig.position.set(t.x, 0, t.z); fig.rotation.y = t.facing ?? 0;
    });
  }
  status() {
    const g = this.game, t = this.traveler();
    return `Travelers on their way ${this.arrived()}/${TRAVELERS.length} · pointer ${ARMS[g.pointer].name} (${ARMS[g.pointer].carving})${t ? ` · ${t.name} seeks ${t.seeks}` : ''} · ${Math.max(0, Math.ceil(120 - g.time))}s`;
  }
  prompt() {
    const t = this.near(), traveler = this.traveler();
    if (!t) return 'Walk to the route board under the dome · Basil the porter waits to the east';
    if (t.role === 'porter') return 'E · ask Basil the way';
    if (!traveler) return 'All three travelers are on their way';
    if (traveler.state !== 'waiting') return `${traveler.name} is walking…`;
    return `E · turn the pointer     F · point ${traveler.name} ${ARMS[this.game.pointer].name}`;
  }
  snapshot() {
    if (!this.active) return null; const g = this.game;
    return { id: 'milion', outcome: g.done, pointer: g.pointer, current: g.current, arrived: this.arrived(), travelers: g.travelers.map(t => ({ state: t.state, asked: t.asked, x: t.x, z: t.z })), time: g.time };
  }
}
