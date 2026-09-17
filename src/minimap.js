// The whole-city mini-map.
//
// The city is 34 cells wide and 128 long, so a corner square would either be a
// sliver or a lie: this draws the whole plan as a tall strip down the side of
// the HUD, with the pilgrim's heading on it. At that scale a single cell is a
// few pixels, so what the map carries is the shape of the place — the gate
// court, the long road, the chambers off it, and the port bands — not
// room-by-room detail; the room name in the HUD corner does the close work.
//
// The plan is TURNED HALF ABOUT, so the destination is at the top: walking the
// pilgrimage (south, down the world's z) moves the pilgrim up the strip, and
// turning 180° rather than mirroring keeps the pilgrim's left hand on the map's
// left. At the spine, the west port sits on the map's right, exactly where it
// is on the pilgrim's right.
//
// The static plan is painted once into an offscreen canvas and only repainted
// when the set of live features changes; each frame is a blit plus the arrow.
import { LEVEL, CELL, MAP_W, MAP_H, HARBOURS, SITES, FEATURES } from './config.js';
import { HAGIA } from './city.js';

const SCALE = 3;                 // canvas px per grid cell -> 102 x 384

// Warm parchment for the walkable city, the sketch's sea blue for water, gold
// for the thresholds — the same palette the world is built from.
const COLOURS = {
  floor: '#4a3c1f',
  wood: '#6d5730',
  sea: '#22445a',
  marker: '#c9a227',
  player: '#ffe9b0',
  shadow: 'rgba(0, 0, 0, 0.55)',
  label: '#d9b96a',        // site names — dimmer than the pilgrim, so he stays the brightest thing on the strip
  labelShadow: 'rgba(0, 0, 0, 0.85)',
  monument: '#a8883f',     // the ring marking a monument of the quarter
};

// Drawn as dots, brightest first: where the pilgrimage starts and ends, the
// elder and the altar, then the three thresholds.
const MARKS = [
  { tile: 'S', r: 3.6 },
  { tile: 'L', r: 3.6 },
  { tile: 'E', r: 2.5 },
  { tile: 'A', r: 2.5 },
  { tile: 'K', r: 2.5 },
  { tile: 'B', r: 2.5 },
  { tile: 'P', r: 2.5 },
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

  /** Grid cell -> canvas px, half a turn about. A cell's own square is drawn
   *  from (MAP_W-1-x, MAP_H-1-y); a free position uses the same arithmetic
   *  without the -1, so a cell centre lands in the middle of its square. */
  cellX(gx) { return (MAP_W - gx) * SCALE; }
  cellY(gy) { return (MAP_H - gy) * SCALE; }
  squareX(x) { return (MAP_W - 1 - x) * SCALE; }
  squareY(y) { return (MAP_H - 1 - y) * SCALE; }

  /** A wing that is switched off leaves plain city behind, exactly as the
   *  build does — the plan is not carved for it until the next reload. */
  inWing(wing, x, y) {
    const { quay, wall, gateX, stairY0, sea } = wing;
    if (x >= quay.x && x < quay.x + quay.w && y >= quay.y && y < quay.y + quay.h) return true;
    if (y === wall.y && x >= wall.x0 && x <= wall.x1) return true;
    if (y >= sea.y0 && y <= sea.y1 && x >= sea.x0 && x <= sea.x1) return true;
    return x === gateX && y >= stairY0 && y <= wall.y;
  }

  inSite(site, x, y) {
    return [site.area, site.water, site.band, site.at].filter(Boolean)
      .some((b) => x >= b.x && x < b.x + (b.w || 1) && y >= b.y && y < b.y + (b.h || 1));
  }

  inDeadWing(x, y) {
    return HARBOURS.some((wing) => FEATURES[wing.id] === false && this.inWing(wing, x, y))
      || SITES.some((site) => FEATURES[site.id] === false && this.inSite(site, x, y));
  }

  /** What the plan currently reflects — repaint when this changes. */
  liveSignature() {
    const flag = (id) => (FEATURES[id] === false ? 0 : 1);
    return [...HARBOURS.map((w) => `${w.id}:${flag(w.id)}`), ...SITES.map((s) => `${s.id}:${flag(s.id)}`)].join(',');
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
        ctx.fillRect(this.squareX(x), this.squareY(y), SCALE, SCALE);
      }
    }

    // Which port is which: the labels are drawn upright on the plan (the half
    // turn is arithmetic here, never a canvas rotation, so text stays readable).
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${SCALE * 4}px ui-monospace, "DejaVu Sans Mono", monospace`;
    for (const wing of HARBOURS) {
      if (FEATURES[wing.id] === false) continue;
      const { quay } = wing;
      const cx = this.cellX(quay.x + quay.w / 2);
      const cy = this.cellY(quay.y + quay.h / 2);
      ctx.fillStyle = COLOURS.labelShadow;
      ctx.fillText(wing.label, cx + 1, cy + 1);
      ctx.fillStyle = COLOURS.label;
      ctx.fillText(wing.short || wing.label, cx, cy);
    }

    // The monuments of the quarter, as a ring apiece: six of them stand within
    // twenty rows of each other, and the strip is 34 cells wide, so their names
    // would collide here — the signs in the world and the index (I) carry the
    // names, and the map carries where.
    ctx.strokeStyle = COLOURS.monument;
    ctx.lineWidth = 1.7;
    for (const site of SITES) {
      if (FEATURES[site.id] === false) continue;
      const box = site.area || site.band
        || { x: site.at.x, y: site.at.y, w: site.at.w || 1, h: site.at.h || 1 };
      const cx = this.cellX(box.x + box.w / 2), cy = this.cellY(box.y + box.h / 2);
      ctx.beginPath();
      ctx.arc(cx, cy, SCALE * 1.7, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Hagia Sophia is named on the map as well as signed in the world — it is
    // the landmark the whole road climbs toward, and the one a player asks for.
    const hx = this.cellX(HAGIA.x + HAGIA.w / 2), hy = this.cellY(HAGIA.y + 0.5);
    ctx.fillStyle = COLOURS.label;
    ctx.beginPath();
    ctx.arc(hx, hy - SCALE * 3.2, SCALE * 2.1, Math.PI, 0);   // a dome above the name
    ctx.fill();
    ctx.font = `bold ${SCALE * 3}px ui-monospace, "DejaVu Sans Mono", monospace`;
    ctx.fillStyle = COLOURS.labelShadow;
    ctx.fillText('HAGIA SOPHIA', hx + 1, hy + 1);
    ctx.fillStyle = COLOURS.label;
    ctx.fillText('HAGIA SOPHIA', hx, hy);

    // Thresholds and landmarks last, so decor can't cover them.
    for (const { tile, r } of MARKS) {
      for (const [key, t] of cells) {
        if (t !== tile) continue;
        const [x, y] = key.split(',').map(Number);
        const cx = this.cellX(x + 0.5), cy = this.cellY(y + 0.5);
        ctx.fillStyle = COLOURS.shadow;
        ctx.beginPath();
        ctx.arc(cx, cy, r + 1.4, 0, Math.PI * 2);
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

    const cx = this.cellX(px / CELL);
    const cy = this.cellY(pz / CELL);
    // Camera looks down -z at yaw 0, so the world heading is (-sin yaw, -cos
    // yaw) in (east, south); the half turn negates both to canvas steps.
    const heading = Math.atan2(Math.cos(yaw), Math.sin(yaw));
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(heading);
    ctx.fillStyle = COLOURS.shadow;
    ctx.beginPath();
    ctx.arc(0, 0, SCALE * 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLOURS.player;
    ctx.beginPath();
    ctx.moveTo(SCALE * 2.2, 0);
    ctx.lineTo(-SCALE * 1.4, SCALE * 1.4);
    ctx.lineTo(-SCALE * 0.6, 0);
    ctx.lineTo(-SCALE * 1.4, -SCALE * 1.4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}
