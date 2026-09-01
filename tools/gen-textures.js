// Procedural PBR map generator — byzantine palette (dark warm, gold accents).
import { savePNG } from './png.js';
import { mulberry32, clamp } from './px.js';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', 'public', 'assets', 'textures');
const S = 256;

function makeNoise(seed) {
  const rnd = mulberry32(seed);
  const perm = new Uint8Array(512);
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
  const fade = (t) => t * t * (3 - 2 * t);
  return (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const x0 = xi & 255, y0 = yi & 255;
    const a = perm[perm[x0] + y0], b = perm[perm[x0 + 1] + y0];
    const c = perm[perm[x0] + y0 + 1], d = perm[perm[x0 + 1] + y0 + 1];
    const u = fade(xf), v = fade(yf);
    return (a * (1 - u) * (1 - v) + b * u * (1 - v) + c * (1 - u) * v + d * u * v) / 255;
  };
}

function fbm(noise, x, y, oct = 4) {
  let v = 0, amp = 0.5, f = 1;
  for (let i = 0; i < oct; i++) { v += amp * noise(x * f, y * f); amp *= 0.5; f *= 2; }
  return v;
}

function writeSet(name, heightFn, albedoFn, roughFn, metalFn) {
  const size = S;
  const albedo = new Uint8ClampedArray(size * size * 4);
  const normal = new Uint8ClampedArray(size * size * 4);
  const rough = new Uint8ClampedArray(size * size * 4);
  const metal = new Uint8ClampedArray(size * size * 4);
  const ao = new Uint8ClampedArray(size * size * 4);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const h = clamp(heightFn(x, y), 0, 1);
      const hL = heightFn(x - 1, y), hR = heightFn(x + 1, y);
      const hD = heightFn(x, y - 1), hU = heightFn(x, y + 1);
      const s = 3.2;
      let nx = (hL - hR) * s, ny = (hD - hU) * s, nz = 1;
      const len = Math.hypot(nx, ny, nz) || 1;
      nx /= len; ny /= len; nz /= len;
      const [r, g, b] = albedoFn(x, y, h);
      const ro = clamp(roughFn(x, y, h), 0, 1);
      const me = clamp(metalFn(x, y, h), 0, 1);
      const occ = clamp(1 - (1 - h) * 0.9, 0.12, 1);
      const i = (y * size + x) * 4;
      albedo[i] = r; albedo[i + 1] = g; albedo[i + 2] = b; albedo[i + 3] = 255;
      normal[i] = (nx * 0.5 + 0.5) * 255;
      normal[i + 1] = (ny * 0.5 + 0.5) * 255;
      normal[i + 2] = (nz * 0.5 + 0.5) * 255;
      normal[i + 3] = 255;
      const rv = ro * 255;
      rough[i] = rv; rough[i + 1] = rv; rough[i + 2] = rv; rough[i + 3] = 255;
      const mv = me * 255;
      metal[i] = mv; metal[i + 1] = mv; metal[i + 2] = mv; metal[i + 3] = 255;
      ao[i] = occ * 255; ao[i + 1] = occ * 255; ao[i + 2] = occ * 255; ao[i + 3] = 255;
    }
  }
  savePNG(path.join(OUT, `${name}_albedo.png`), size, size, albedo);
  savePNG(path.join(OUT, `${name}_normal.png`), size, size, normal);
  savePNG(path.join(OUT, `${name}_roughness.png`), size, size, rough);
  savePNG(path.join(OUT, `${name}_metalness.png`), size, size, metal);
  savePNG(path.join(OUT, `${name}_ao.png`), size, size, ao);
  return name;
}

// ---- materials -------------------------------------------------------------
function stoneWall(seed) {
  const n = makeNoise(seed);
  const bw = 64, bh = 28;
  const heightFn = (x, y) => {
    const col = Math.floor(x / bw), row = Math.floor(y / bh);
    const off = (row % 2) * (bw / 2);
    const lx = (x - col * bw - off + 1000) % bw;
    const mortar = lx < 2 || (y - row * bh) < 2 || lx > bw - 2;
    return mortar ? 0.08 : 0.3 + fbm(n, x * 0.03, y * 0.03, 3) * 0.5;
  };
  const albedoFn = (x, y, h) => {
    let v = 84 + h * 52 + (fbm(n, x * 0.09, y * 0.09, 2) - 0.5) * 26;
    // warm damp stone, faint gold mortar tint
    const r = v * 1.06 + 7, g = v * 0.94 + 5, b = v * 0.8;
    return [clamp(r, 0, 255), clamp(g, 0, 255), clamp(b, 0, 255)];
  };
  return writeSet('stone_wall', heightFn, albedoFn, () => 0.95, () => 0);
}

function stoneFloor(seed) {
  const n = makeNoise(seed);
  const ts = 128;
  const heightFn = (x, y) => {
    const gx = ((x % ts) + ts) % ts, gy = ((y % ts) + ts) % ts;
    const grout = gx < 2 || gy < 2 || gx > ts - 2 || gy > ts - 2;
    return grout ? 0.06 : 0.28 + fbm(n, x * 0.04, y * 0.04, 3) * 0.45;
  };
  const albedoFn = (x, y, h) => {
    const g = fbm(n, x * 0.08, y * 0.08, 2);
    let v = 108 + (g - 0.5) * 34 + h * 36;
    return [v * 1.04, v * 0.96, v * 0.82];
  };
  return writeSet('stone_floor', heightFn, albedoFn, () => 0.9, () => 0);
}

function woodFloor(seed) {
  const n = makeNoise(seed);
  const pw = 48;
  const heightFn = (x, y) => {
    const plank = Math.floor(y / pw);
    const gy = (y - plank * pw + 1000) % pw;
    const grain = Math.sin(x * 0.22 + fbm(n, x * 0.05, y * 0.1, 2) * 8) * 0.07;
    return gy < 1 ? 0.05 : 0.4 + grain + fbm(n, x * 0.05, y * 0.05, 2) * 0.18;
  };
  const albedoFn = (x, y, h) => {
    let v = 118 + (h - 0.4) * 130 + fbm(n, x * 0.1, y * 0.1, 2) * 20;
    return [v * 1.05, v * 0.8, v * 0.52];
  };
  return writeSet('wood_floor', heightFn, albedoFn, () => 0.78, () => 0);
}

function gold(seed) {
  const n = makeNoise(seed);
  const heightFn = (x, y) => {
    const gx = ((x % 64) + 64) % 64, gy = ((y % 64) + 64) % 64;
    const rivet = Math.abs(gx - 32) < 4 && Math.abs(gy - 32) < 4;
    return rivet ? 0.78 : 0.4 + fbm(n, x * 0.1, y * 0.1, 3) * 0.35;
  };
  const albedoFn = (x, y, h) => {
    let r = 200 + h * 55, g = 162 + h * 55, b = 88 + h * 40;
    const pat = fbm(n, x * 0.07 + 9, y * 0.07 + 9, 2);
    r += (pat - 0.5) * 22; g += (pat - 0.5) * 20; b += (pat - 0.5) * 14;
    return [clamp(r, 0, 255), clamp(g, 0, 255), clamp(b, 0, 255)];
  };
  return writeSet('gold', heightFn, albedoFn, () => 0.34, () => 0.9);
}

function icon(seed) {
  const n = makeNoise(seed);
  const heightFn = (x, y) => 0.3 + fbm(n, x * 0.08, y * 0.08, 3) * 0.4;
  const albedoFn = (x, y, h) => {
    // deep red cloth with a gold cross in the middle
    let r = 124, g = 44, b = 40;
    const cx = S / 2, cy = S / 2;
    const crossX = Math.abs(x - cx) < 14 && Math.abs(y - cy) < 56;
    const crossY = Math.abs(y - cy) < 14 && Math.abs(x - cx) < 56;
    if (crossX || crossY) { r = 236; g = 198; b = 110; }
    const fold = fbm(n, x * 0.06 + 3, y * 0.06 + 3, 2);
    const f = 0.72 + fold * 0.5;
    return [r * f, g * f, b * f];
  };
  return writeSet('icon', heightFn, albedoFn, () => 0.85, () => 0);
}

function brick(seed) {
  const n = makeNoise(seed);
  const bw = 48, bh = 22;
  const heightFn = (x, y) => {
    const col = Math.floor(x / bw), row = Math.floor(y / bh);
    const off = (row % 2) * (bw / 2);
    const lx = (x - col * bw - off + 1000) % bw;
    const mortar = lx < 2 || (y - row * bh) < 2 || lx > bw - 2;
    return mortar ? 0.06 : 0.3 + fbm(n, x * 0.06, y * 0.06, 3) * 0.4;
  };
  const albedoFn = (x, y, h) => {
    let r = 88 + h * 56, g = 54 + h * 32, b = 42 + h * 22;
    const v = fbm(n, x * 0.1 + 5, y * 0.1 + 5, 2);
    r += (v - 0.5) * 26; g += (v - 0.5) * 20; b += (v - 0.5) * 16;
    return [clamp(r, 0, 255), clamp(g, 0, 255), clamp(b, 0, 255)];
  };
  return writeSet('brick', heightFn, albedoFn, () => 0.92, () => 0);
}

function waxEmissive(seed) {
  const n = makeNoise(seed);
  const heightFn = (x, y) => 0.2 + fbm(n, x * 0.15, y * 0.15, 3) * 0.6;
  const albedoFn = (x, y, h) => {
    // dark wax base with warm glowing core (used as emissive map)
    const glow = fbm(n, x * 0.06 + 31, y * 0.06 + 31, 3);
    const g = glow > 0.62 ? (glow - 0.62) * 3 : 0;
    const base = 26 + h * 30;
    return [
      clamp(base * 0.9 + g * 220, 0, 255),
      clamp(base * 0.8 + g * 160, 0, 255),
      clamp(base * 0.6 + g * 90, 0, 255),
    ];
  };
  return writeSet('wax_emissive', heightFn, albedoFn, () => 0.7, () => 0);
}

function plaster(seed) {
  // Warm Byzantine plaster facade: pale sand courses with thin brick bands
  // (the brick-and-plaster construction of the imperial city).
  const n = makeNoise(seed);
  const courseH = 26;
  const heightFn = (x, y) => {
    const row = Math.floor(y / courseH);
    const gy = (y - row * courseH + 1000) % courseH;
    const brickBand = row % 4 === 2;
    const groove = gy < 2 || gy > courseH - 2;
    if (brickBand) return 0.5 + fbm(n, x * 0.08, y * 0.08, 3) * 0.3;
    return groove ? 0.1 : 0.32 + fbm(n, x * 0.035, y * 0.035, 3) * 0.4;
  };
  const albedoFn = (x, y, h) => {
    const row = Math.floor(y / courseH);
    const brickBand = row % 4 === 2;
    const v = 196 + (h - 0.4) * 44 + (fbm(n, x * 0.05, y * 0.05, 2) - 0.5) * 22;
    if (brickBand) {
      // thin Byzantine brick course peeking through the plaster
      const r = 150 + h * 40, g = 96 + h * 26, b = 74 + h * 18;
      return [clamp(r, 0, 255), clamp(g, 0, 255), clamp(b, 0, 255)];
    }
    return [clamp(v * 1.04, 0, 255), clamp(v * 0.99, 0, 255), clamp(v * 0.88, 0, 255)];
  };
  return writeSet('plaster', heightFn, albedoFn, () => 0.88, () => 0);
}

function roof(seed) {
  // Terracotta roof tiles — rounded tile rows with a warm sun-bleached edge.
  const n = makeNoise(seed);
  const tileW = 34;
  const heightFn = (x, y) => {
    const col = Math.floor(x / tileW);
    const lx = (x - col * tileW + 1000) % tileW;
    const hump = Math.sin((lx / tileW) * Math.PI);
    const seam = lx < 1.5 || lx > tileW - 1.5;
    return seam ? 0.05 : 0.35 + hump * 0.3 + fbm(n, x * 0.09, y * 0.09, 3) * 0.2;
  };
  const albedoFn = (x, y, h) => {
    const v = fbm(n, x * 0.07 + 7, y * 0.07 + 7, 2);
    const r = 176 + h * 34 + (v - 0.5) * 26;
    const g = 108 + h * 22 + (v - 0.5) * 18;
    const b = 74 + h * 12 + (v - 0.5) * 12;
    return [clamp(r, 0, 255), clamp(g, 0, 255), clamp(b, 0, 255)];
  };
  return writeSet('roof', heightFn, albedoFn, () => 0.72, () => 0);
}

const materials = [
  stoneWall(501),
  stoneFloor(502),
  woodFloor(503),
  gold(504),
  icon(505),
  brick(506),
  waxEmissive(507),
  plaster(508),
  roof(509),
];
fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify({ size: S, materials }, null, 2));
console.log(`Generated ${materials.length} PBR material sets -> ${path.relative(process.cwd(), OUT)}`);
for (const m of materials) console.log('  ' + m);
