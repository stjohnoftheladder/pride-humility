// The whole-city mini-map.
//
// The city is 34 cells wide and 128 long, so a corner square would either be a
// sliver or a lie: this draws the whole plan as a tall strip down the side of
// the HUD, at 2 canvas px per cell, with the pilgrim's heading on it. At that
// scale a single cell is a couple of pixels, so what the map carries is the
// shape of the place — the gate court, the long road, the chambers off it, and
// the port bands — not room-by-room detail; the room name in the HUD corner
// does the close work.
//
// The static plan is painted once into an offscreen canvas and only repainted
// when the set of live features changes; each frame is a blit plus the arrow.
import { LEVEL, CELL, MAP_W, MAP_H, HARBOURS, FEATURES } from './config.js';

const SCALE = 2;                 // canvas px per grid cell -> 68 x 256

// Warm parchment for the walkable city, the sketch's sea blue for water, gold
// for the thresholds — the same palette the world is built from.
const COLOURS = {
  floor: '#4a3c1f',
  wood: '#6d5730',
  sea: '#22445a',
  marker: '#c9a227',
  player: '#ffe9b0',
  shadow: 'rgba(0, 0, 0, 0.55)',
};

// Drawn as dots, brightest first: where the pilgrimage starts and ends, the
// elder and the altar, then the three thresholds.
const MARKS = [
  { tile: 'S', r: 2.4 },
  { tile: 'L', r: 2.4 },
  { tile: 'E', r: 1.7 },
  { tile: 'A', r: 1.7 },
  { tile: 'K', r: 1.7 },
  { tile: 'B', r: 1.7 },
  { tile: 'P', r: 1.7 },
];

export class Minimap {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.canvas.width = MAP_W * SCALE;
    this.canvas.height = MAP_H * SCALE;
    this.plan = document.createElement('canvas');
    this.plan.width = this.canvas.width;
    this.plan.height = this.canvas.height;
    this.planCtx = this.plan.getContext('2d');
    this.paintedFor = null;
    this.paintPlan();
  }

  /** A wing that is switched off leaves plain city behind, exactly as the
   *  build does — the plan is not carved for it until the next reload. */
  inWing(wing, x, y) {
    const { quay, wall, gateX, stairY0, sea } = wing;
    if (x >= quay.x && x < quay.x + quay.w && y >= quay.y && y < quay.y + quay.h) return true;
    if (y === wall.y && x >= wall.x0 && x <= wall.x1) return true;
    if (y >= sea.y0 && y <= sea.y1 && x >= sea.x0 && x <= sea.x1) return true;
    return x === gateX && y >= stairY0 && y <= wall.y;
  }

  inDeadWing(x, y) {
    return HARBOURS.some((wing) => FEATURES[wing.id] === false && this.inWing(wing, x, y));
  }

  /** What the plan currently reflects — repaint when this changes. */
  liveSignature() {
    return HARBOURS.map((wing) => `${wing.id}:${FEATURES[wing.id] === false ? 0 : 1}`).join(',');
  }

  paintPlan() {
    const ctx = this.planCtx;
    ctx.clearRect(0, 0, this.plan.width, this.plan.height);
    const { grid, cells } = LEVEL;
    for (let y = 0; y < MAP_H; y++) {
      for (let x = 0; x < MAP_W; x++) {
        const tile = grid[y][x];
        let colour = null;
        if (this.inDeadWing(x, y)) colour = null;          // a switched-off addition
        else if (tile === 'W') colour = COLOURS.sea;       // sea tiles never change
        else if (tile === '_') colour = COLOURS.wood;
        else if (tile !== '#') colour = COLOURS.floor;
        if (!colour) continue;                              // walls stay the panel's dark
        ctx.fillStyle = colour;
        ctx.fillRect(x * SCALE, y * SCALE, SCALE, SCALE);
      }
    }
    // Thresholds and landmarks last, so decor can't cover them.
    for (const { tile, r } of MARKS) {
      for (const [key, t] of cells) {
        if (t !== tile) continue;
        const [x, y] = key.split(',').map(Number);
        const cx = (x + 0.5) * SCALE, cy = (y + 0.5) * SCALE;
        ctx.fillStyle = COLOURS.shadow;
        ctx.beginPath();
        ctx.arc(cx, cy, r + 1, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = COLOURS.marker;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    this.paintedFor = this.liveSignature();
  }

  /** Blit the city and put the pilgrim on it, heading and all. */
  update(px, pz, yaw) {
    if (this.paintedFor !== this.liveSignature()) this.paintPlan();
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(this.plan, 0, 0);

    const cx = (px / CELL + 0.5) * SCALE;
    const cy = (pz / CELL + 0.5) * SCALE;
    // The camera looks down -z at yaw 0, so its heading on the plan is
    // (-sin yaw, -cos yaw) in (east, south).
    const heading = Math.atan2(-Math.cos(yaw), -Math.sin(yaw));
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(heading);
    ctx.fillStyle = COLOURS.shadow;
    ctx.beginPath();
    ctx.arc(0, 0, 4.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLOURS.player;
    ctx.beginPath();
    ctx.moveTo(4.4, 0);
    ctx.lineTo(-2.8, 2.8);
    ctx.lineTo(-1.2, 0);
    ctx.lineTo(-2.8, -2.8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}
