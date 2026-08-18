// Pixel-art drawing toolkit (straight-alpha RGBA buffer).
// All drawing happens at integer pixel coordinates, retro style.

export const PINK = [255, 0, 255];

export class PX {
  constructor(w, h) {
    this.w = w;
    this.h = h;
    this.data = new Uint8ClampedArray(w * h * 4); // transparent black
  }

  inb(x, y) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  set(x, y, r, g, b, a = 255) {
    if (!this.inb(x, y)) return;
    const i = (y * this.w + x) * 4;
    this.data[i] = r;
    this.data[i + 1] = g;
    this.data[i + 2] = b;
    this.data[i + 3] = a;
  }

  get(x, y) {
    if (!this.inb(x, y)) return null;
    const i = (y * this.w + x) * 4;
    return [this.data[i], this.data[i + 1], this.data[i + 2], this.data[i + 3]];
  }

  /** Fill rect [x, x+w) x [y, y+h) with an RGB color (opaque). */
  rect(x, y, w, h, [r, g, b]) {
    for (let yy = y; yy < y + h; yy++) {
      if (yy < 0 || yy >= this.h) continue;
      for (let xx = x; xx < x + w; xx++) {
        if (xx < 0 || xx >= this.w) continue;
        const i = (yy * this.w + xx) * 4;
        this.data[i] = r;
        this.data[i + 1] = g;
        this.data[i + 2] = b;
        this.data[i + 3] = 255;
      }
    }
  }

  /** Rect with alpha for translucent bodies. */
  rectA(x, y, w, h, [r, g, b], a) {
    for (let yy = y; yy < y + h; yy++) {
      if (yy < 0 || yy >= this.h) continue;
      for (let xx = x; xx < x + w; xx++) {
        if (xx < 0 || xx >= this.w) continue;
        const i = (yy * this.w + xx) * 4;
        this.data[i] = r;
        this.data[i + 1] = g;
        this.data[i + 2] = b;
        this.data[i + 3] = a;
      }
    }
  }

  /** Filled ellipse (integer raster). */
  ellipse(cx, cy, rx, ry, [r, g, b], a = 255) {
    const x0 = Math.floor(cx - rx), x1 = Math.ceil(cx + rx);
    const y0 = Math.floor(cy - ry), y1 = Math.ceil(cy + ry);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const dx = (x - cx) / rx, dy = (y - cy) / ry;
        if (dx * dx + dy * dy <= 1.01) this.set(x, y, r, g, b, a);
      }
    }
  }

  /** Ring (outline of ellipse). */
  ring(cx, cy, rx, ry, [r, g, b]) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x - cx) / rx, dy = (y - cy) / ry;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d > 0.82 && d < 1.08) this.set(x, y, r, g, b);
      }
    }
  }

  /** Bresenham line. */
  line(x0, y0, x1, y1, [r, g, b], a = 255) {
    let dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
    let dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.set(x0, y0, r, g, b, a);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) { err += dy; x0 += sx; }
      if (e2 <= dx) { err += dx; y0 += sy; }
    }
  }

  /** Filled triangle. */
  tri(p1, p2, p3, [r, g, b], a = 255) {
    const [x1, y1] = p1, [x2, y2] = p2, [x3, y3] = p3;
    const minX = Math.max(0, Math.floor(Math.min(x1, x2, x3)));
    const maxX = Math.min(this.w - 1, Math.ceil(Math.max(x1, x2, x3)));
    const minY = Math.max(0, Math.floor(Math.min(y1, y2, y3)));
    const maxY = Math.min(this.h - 1, Math.ceil(Math.max(y1, y2, y3)));
    const sign = (ax, ay, bx, by, cx, cy) => (ax - cx) * (by - cy) - (bx - cx) * (ay - cy);
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const d1 = sign(x, y, x1, y1, x2, y2);
        const d2 = sign(x, y, x2, y2, x3, y3);
        const d3 = sign(x, y, x3, y3, x1, y1);
        const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
        const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
        if (!(hasNeg && hasPos)) this.set(x, y, r, g, b, a);
      }
    }
  }

  /** Checkerboard dither between two colors within a rect (masked to opaque pixels). */
  dither(x, y, w, h, [r1, g1, b1], [r2, g2, b2]) {
    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) {
        const i = (yy * this.w + xx) * 4;
        if (this.data[i + 3] === 0) continue;
        if ((xx + yy) % 2 === 0) {
          this.data[i] = r1; this.data[i + 1] = g1; this.data[i + 2] = b1;
        } else {
          this.data[i] = r2; this.data[i + 1] = g2; this.data[i + 2] = b2;
        }
      }
    }
  }

  /** Darken/lighten every opaque pixel in a rect by factor (0..2). */
  shade(x, y, w, h, f) {
    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) {
        const i = (yy * this.w + xx) * 4;
        if (this.data[i + 3] === 0) continue;
        this.data[i] = Math.min(255, this.data[i] * f);
        this.data[i + 1] = Math.min(255, this.data[i + 1] * f);
        this.data[i + 2] = Math.min(255, this.data[i + 2] * f);
      }
    }
  }

  /** Set background to the chroma-key color (bright pink). */
  fillPink() {
    this.rect(0, 0, this.w, this.h, PINK);
  }
}

/** Deterministic seeded RNG. */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
