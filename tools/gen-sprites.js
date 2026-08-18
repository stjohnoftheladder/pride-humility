// Procedural pixel-art spritesheet generator for Pride & Humility.
// Same convention as wizard-castle: 1 row x N frames of 64x64 cells, sprite
// centred in its cell, pure chroma-key pink (#FF00FF) background, with a
// validator that guarantees pink appears nowhere else in the art.
import { PX, mulberry32 } from './px.js';
import { savePNG } from './png.js';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', 'public', 'assets', 'sprites');
const CELL = 64;
const FEET = CELL - 5;

// ---------------------------------------------------------------------------
class CP {
  constructor(px, cx = CELL / 2, feetY = FEET) {
    this.px = px;
    this.cx = cx;
    this.feetY = feetY;
  }
  X(x) { return Math.round(this.cx + x); }
  Y(y) { return Math.round(this.feetY - y); }
  rect(x, y, w, h, c) { this.px.rect(this.X(x), this.Y(y + h), w, h, c); }
  rectA(x, y, w, h, c, a) { this.px.rectA(this.X(x), this.Y(y + h), w, h, c, a); }
  ellipse(cx, cy, rx, ry, c, a = 255) { this.px.ellipse(this.X(cx), this.Y(cy), rx, ry, c, a); }
  ring(cx, cy, rx, ry, c) { this.px.ring(this.X(cx), this.Y(cy), rx, ry, c); }
  line(x0, y0, x1, y1, c, a = 255) { this.px.line(this.X(x0), this.Y(y0), this.X(x1), this.Y(y1), c, a); }
  tri(p1, p2, p3, c, a = 255) {
    this.px.tri([this.X(p1[0]), this.Y(p1[1])], [this.X(p2[0]), this.Y(p2[1])], [this.X(p3[0]), this.Y(p3[1])], c, a);
  }
  shade(x, y, w, h, f) { this.px.shade(this.X(x), this.Y(y + h), w, h, f); }
}

// ---------------------------------------------------------------------------
const TAU = Math.PI * 2;
const sin = Math.sin;

const C = {
  // heart
  heart: [0xd4, 0x3a, 0x3a], heartD: [0x8f, 0x20, 0x20], heartGlint: [0xff, 0xdd, 0xdd],
  // tempter
  tSkin: [0x9c, 0x4a, 0x2a], tDark: [0x5e, 0x26, 0x14], tBelly: [0xc9, 0x8a, 0x5f],
  tEar: [0x7a, 0x33, 0x1a], tGold: [0xf3, 0xd2, 0x76], tGoldD: [0xb8, 0x8a, 0x2e],
  tEye: [0xff, 0xe0, 0x3a], tTeeth: [0xf7, 0xe9, 0xbf],
  // brother (monk)
  mRobe: [0x3a, 0x2a, 0x1e], mRobeD: [0x25, 0x19, 0x10], mSkin: [0xdd, 0xbf, 0xa2],
  mBand: [0xe8, 0xe0, 0xd0], mSash: [0x8b, 0x69, 0x14], mHalo: [0xff, 0xe8, 0xa8],
  // pride demon
  pSkin: [0x8f, 0x1f, 0x1f], pDark: [0x4a, 0x0d, 0x0d], pBelly: [0xc9, 0x4a, 0x3a],
  pFeather: [0x2e, 0x8f, 0x5b], pFeatherE: [0x1c, 0x2f, 0x4a], pCrown: [0xf3, 0xd2, 0x76],
  pEye: [0xff, 0xd9, 0x2e], pMouth: [0x2a, 0x05, 0x05], pClaw: [0xe8, 0xe0, 0xd0], pTeeth: [0xf7, 0xe9, 0xbf],
  // elder
  eRobe: [0x2e, 0x24, 0x1a], eRobeD: [0x1c, 0x15, 0x0e], eSkin: [0xdd, 0xbf, 0xa2],
  eBeard: [0xe8, 0xe8, 0xe8], eStaff: [0x7a, 0x4a, 0x26],
  // effects
  shard: [0xff, 0xf4, 0xd8], shardCore: [0xd4, 0x3a, 0x3a],
  shield: [0xf3, 0xd2, 0x76], shieldHi: [0xff, 0xf0, 0xc0],
  beam: [0xff, 0xe8, 0xa8], beamCore: [0xff, 0xfc, 0xf0],
  flame: [0xff, 0xb4, 0x5e], flameHi: [0xff, 0xe8, 0x8a], flameCore: [0xff, 0xfc, 0xef], flameD: [0xd9, 0x6a, 0x14],
  wood: [0x7a, 0x4a, 0x26], woodD: [0x57, 0x31, 0x18], iron: [0x4a, 0x4a, 0x55], ironD: [0x2c, 0x2c, 0x35],
  cloth: [0x8b, 0x1f, 0x1f], clothD: [0x5e, 0x12, 0x12], clothGold: [0xf3, 0xd2, 0x76],
  shadow: [0x10, 0x0f, 0x1c],
};

function drawShadow(p, scale = 1) {
  p.ellipse(0, 0.5, 10 * scale, 3 * scale, C.shadow, 110);
}

// ---------------------------------------------------------------------------
// HEART (the soul)
function heartPaint(px, frame, n, pose) {
  const c = new CP(px);
  const t = (pose.t ?? 0);
  const s = 1 + sin(t * TAU) * 0.09;
  const r = 4.6 * s;
  // glow
  c.ellipse(0, 8, 8 * s, 8 * s, C.heart, 46);
  // lobes
  c.ellipse(-3, 12, r * 0.72, r * 0.72, C.heartD);
  c.ellipse(3, 12, r * 0.72, r * 0.72, C.heartD);
  c.ellipse(-3, 12, r * 0.55, r * 0.55, C.heart);
  c.ellipse(3, 12, r * 0.55, r * 0.55, C.heart);
  // point
  c.tri([-3.4, 14], [3.4, 14], [0, 5], C.heartD);
  c.tri([-2.6, 13.4], [2.6, 13.4], [0, 6.5], C.heart);
  // glint
  c.rect(-3, 14, 2, 2, C.heartGlint, 210);
}

// ---------------------------------------------------------------------------
// TEMPTER (greed demon)
function tempterPaint(px, frame, n, pose) {
  const c = new CP(px);
  const t = pose.t ?? 0;
  const bob = pose.bob ?? 0;
  drawShadow(c, 0.85);
  c.feetY = FEET + bob;

  // tail
  c.line(-8, 14, -18, 20, C.tDark);
  c.tri([-18, 20], [-22, 24], [-17, 23], C.tDark);

  // legs (shuffle)
  const sw = pose.walk ? sin(t * TAU) * 3 : 0;
  c.rect(-6 + sw, 0, 3, 7, C.tDark);
  c.rect(3 - sw, 0, 3, 7, C.tDark);

  // hunched body
  c.ellipse(0, 13, 8, 9, C.tSkin);
  c.ellipse(0, 12, 4.5, 4.5, C.tBelly);
  c.shade(-8, 8, 3, 12, 0.8);

  // big ears
  c.tri([-6, 22], [-12, 30], [-3, 24], C.tEar);
  c.tri([6, 22], [12, 30], [3, 24], C.tEar);

  // head + grin
  c.ellipse(0, 24, 6.5, 5.5, C.tSkin);
  c.rect(-5, 20, 10, 2, C.tTeeth);
  c.rect(-3, 19, 2, 1, C.tGold);   // gold tooth
  c.rect(-4, 26, 2, 2, C.tEye);
  c.rect(3, 26, 2, 2, C.tEye);

  // arms: one holds a coin aloft
  const armY = pose.attack ? 30 : 24;
  c.rect(-9, 14, 3, 9, C.tSkin);
  c.rect(7, 14, 3, 9, C.tSkin);
  c.rect(7, armY, 4, 3, C.tSkin);
  c.ellipse(9, armY + 4, 3.2, 3.2, C.tGold);
  c.ellipse(9, armY + 4, 2, 2, C.tGoldD);

  // scattered coins
  c.ellipse(-9, 2, 2.4, 2.4, C.tGold);
  c.ellipse(-3, 1, 2, 2, C.tGoldD);
  c.ellipse(6, 2, 2.2, 2.2, C.tGold);
}

// ---------------------------------------------------------------------------
// WOUNDED BROTHER (monk)
function brotherPaint(px, frame, n, pose) {
  const c = new CP(px);
  const t = pose.t ?? 0;
  const bob = pose.bob ?? 0;
  const forgiven = pose.forgiven ?? 0;
  drawShadow(c, 0.9);
  c.feetY = FEET + bob;

  // robe (trapezoid)
  c.rect(-9, 0, 18, 3, C.mRobeD);
  c.rect(-8, 3, 16, 22, C.mRobe);
  c.tri([-8, 25], [-4, 30], [0, 24], C.mRobe);
  c.tri([8, 25], [4, 30], [0, 24], C.mRobe);
  c.rect(-8, 12, 16, 2, C.mSash);
  c.shade(-9, 3, 4, 22, 0.75);

  // head
  c.ellipse(0, 34, 5.5, 5.5, C.mSkin);
  // bandaged arm (sling)
  c.rect(-10, 18, 3, 8, C.mRobeD);
  c.rect(-13, 20, 4, 4, C.mBand);
  // face
  c.rect(-4, 32, 2, 2, [0x3a, 0x2a, 0x1e]);
  c.rect(3, 32, 2, 2, [0x3a, 0x2a, 0x1e]);
  c.rect(-2, 29, 4, 1, [0x6b, 0x4a, 0x33]); // downcast mouth

  if (forgiven > 0) {
    // arms open, face lifted, halo
    c.rect(-11, 24, 3, 7, C.mRobe);
    c.rect(9, 24, 3, 7, C.mRobe);
    c.rect(-2, 29, 4, 1, C.mHalo); // smile
    c.ring(0, 42, 7, 2.4, C.mHalo, 180);
    c.ellipse(0, 38, 4, 1.6, C.mHalo, 90);
  } else if (pose.attack) {
    // raising bandaged arm in accusation
    c.rect(-13, 20, 4, 10, C.mBand);
    c.rect(-13, 29, 4, 2, C.mSkin);
  }
}

// ---------------------------------------------------------------------------
// DEMON OF PRIDE
function pridePaint(px, frame, n, pose) {
  const c = new CP(px);
  const t = pose.t ?? 0;
  const bob = pose.bob ?? 0;
  const dead = pose.dead ?? 0;
  drawShadow(c, 1.2);
  c.feetY = FEET + bob;
  const sq = 1 - dead * 0.4;

  // peacock feather fan behind (vanity)
  const sway = sin(t * TAU * 0.7);
  for (let i = -3; i <= 3; i++) {
    const fx = i * 4.4;
    const fy = 34 - Math.abs(i) * 3;
    c.ellipse(fx + sway * 1.4, fy, 2.6, 6.5, C.pFeather, 235);
    c.ellipse(fx + sway * 1.4, fy + 6, 2, 1.8, C.pFeatherE, 235);
  }

  // legs
  c.rect(-6, 0, 3.4, 8, C.pDark);
  c.rect(3, 0, 3.4, 8, C.pDark);
  c.rect(-6, 0, 3.4, 2, C.pClaw);
  c.rect(3, 0, 3.4, 2, C.pClaw);

  // body (puffed chest)
  c.ellipse(0, 12, 9, 9 * sq, C.pSkin);
  c.ellipse(0, 11, 5, 5, C.pBelly);
  c.shade(-9, 6, 4, 13, 0.8);

  // arms
  c.rect(-12, 12, 3.4, 10, C.pSkin);
  c.rect(9, 12, 3.4, 10, C.pSkin);
  c.rect(-12, 12, 3.4, 2.4, C.pClaw);
  c.rect(9, 12, 3.4, 2.4, C.pClaw);

  // head + sneer
  const hy = 24 * sq;
  c.ellipse(0, hy, 6.5, 6, C.pSkin);
  c.rect(-6, hy - 3, 12, 2, C.pMouth);   // wide sneer
  c.rect(-2, hy - 4, 4, 1.4, C.pTeeth);
  c.rect(-4.5, hy + 1, 2, 2.4, C.pEye);
  c.rect(2.5, hy + 1, 2, 2.4, C.pEye);

  // crown
  c.rect(-5, hy + 5, 10, 2, C.pCrown);
  c.tri([-4, hy + 7], [-4, hy + 10], [-2, hy + 7], C.pCrown);
  c.tri([0, hy + 7], [0, hy + 11], [-2, hy + 7], C.pCrown);
  c.tri([4, hy + 7], [4, hy + 10], [2, hy + 7], C.pCrown);
}

// ---------------------------------------------------------------------------
// ELDER
function elderPaint(px, frame, n, pose) {
  const c = new CP(px);
  const bob = pose.bob ?? 0;
  drawShadow(c, 0.9);
  c.feetY = FEET + bob;

  // robe
  c.rect(-9, 0, 18, 3, C.eRobeD);
  c.rect(-8, 3, 16, 26, C.eRobe);
  c.tri([-8, 29], [-4, 34], [0, 28], C.eRobe);
  c.tri([8, 29], [4, 34], [0, 28], C.eRobe);
  c.shade(-9, 3, 4, 26, 0.72);

  // head + long beard
  c.ellipse(0, 38, 5.5, 5.5, C.eSkin);
  c.rect(-4, 32, 8, 6, C.eBeard);
  c.rect(-3, 36, 6, 6, C.eBeard);
  c.rect(-4, 44, 8, 2, C.eBeard);
  c.rect(-3.5, 40, 2, 2, [0x5a, 0x42, 0x2e]);
  c.rect(2, 40, 2, 2, [0x5a, 0x42, 0x2e]);

  // staff + candle
  c.line(10, 2, 10, 40, C.eStaff);
  c.ellipse(10, 44, 1.8, 1.8, C.flameCore, 230);
  c.ellipse(10, 45, 1.2, 1.2, C.flameHi, 200);
}

// ---------------------------------------------------------------------------
// Effects
function shardPaint(px, frame, n) {
  const c = new CP(px);
  const s = frame % 2 ? 1 : 0.85;
  c.ellipse(0, 0, 5 * s, 5 * s, C.shard, 90);
  c.tri([0, 9 * s], [-4.5 * s, -2 * s], [4.5 * s, -2 * s], C.shard);
  c.tri([0, 6 * s], [-2.6 * s, -1 * s], [2.6 * s, -1 * s], C.shardCore);
  c.ellipse(0, -1 * s, 1.2, 1.2, [0xff, 0xff, 0xff]);
}

function shieldPaint(px, frame, n) {
  const c = new CP(px);
  const t = frame / Math.max(1, n - 1);
  const r = 8 + sin(t * TAU) * 1.2;
  c.ring(0, 0, r, r, C.shield, 180);
  c.ring(0, 0, r - 1.6, r - 1.6, C.shieldHi, 120);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + t;
    c.rect(sin(a) * (r + 2.4) - 0.6, cosSafe(a) * (r + 2.4) - 0.6, 1.4, 1.4, C.shield, 200);
  }
}
const cosSafe = Math.cos;

function beamPaint(px, frame, n) {
  const c = new CP(px);
  const flick = frame % 2 ? 1 : 0.75;
  c.rect(-7, 0, 14, 52 * flick, C.beam, 60);
  c.rect(-4, 0, 8, 52 * flick, C.beam, 110);
  c.rect(-2, 0, 4, 52 * flick, C.beamCore, 200);
}

// torch (candle) + banner (icon) reuse the wizard-castle painters
function torchPaint(px, frame, n) {
  const c = new CP(px);
  drawShadow(c, 0.4);
  c.rect(-1, 0, 3, 22, C.woodD);
  c.rect(-3, 22, 7, 3, C.iron);
  c.ellipse(0, 29, 3, 5, C.flameD);
  c.ellipse(0, 31, 2.6, 4.2, C.flame);
  const f = frame % 2;
  c.ellipse(f ? -1 : 1, 32, 1.6, 2.6, C.flameHi);
  c.ellipse(f ? 1 : -1, 33, 0.8, 1.4, C.flameCore);
  c.ellipse(-3, 26, 1, 1, C.flameHi, 150);
  c.ellipse(3, 27, 1, 1, C.flameHi, 130);
}

function bannerPaint(px, frame, n) {
  const c = new CP(px);
  const sway = frame % 2 === 0 ? 0 : 1;
  c.rect(-14, 26, 3, 18, C.woodD);
  c.rect(-14, 26, 3, 2, C.iron);
  c.rect(-11, 30 + sway, 22, 26, C.cloth);
  c.rect(-11, 30 + sway, 22, 2, C.clothGold);
  // cross emblem
  c.rect(-1, 36 + sway, 2, 10, C.clothGold);
  c.rect(-4, 40 + sway, 8, 2, C.clothGold);
  c.shade(-11, 30 + sway, 4, 26, 0.75);
}

// ---------------------------------------------------------------------------
const ASSETS = [
  { name: 'heart', height: 0.7, shadow: false, anims: [
    { name: 'idle', n: 4, paint: (px, f, n) => heartPaint(px, f, n, { t: f / n }) },
  ] },
  { name: 'tempter', height: 2.0, shadow: true, anims: [
    { name: 'idle', n: 4, paint: (px, f, n) => tempterPaint(px, f, n, { t: f / n, bob: f % 2 ? 1 : 0 }) },
    { name: 'walk', n: 6, paint: (px, f, n) => tempterPaint(px, f, n, { walk: true, t: f / n, bob: sin((f / n) * TAU * 2) }) },
    { name: 'attack', n: 4, paint: (px, f, n) => tempterPaint(px, f, n, { attack: true, t: f / (n - 1) }) },
    { name: 'death', n: 5, paint: (px, f, n) => {
        const p = f / (n - 1);
        tempterPaint(px, f, n, { bob: p * 6, attack: p < 0.5 });
      } },
  ] },
  { name: 'brother', height: 2.2, shadow: true, anims: [
    { name: 'idle', n: 4, paint: (px, f, n) => brotherPaint(px, f, n, { t: f / n, bob: f % 2 ? 1 : 0 }) },
    { name: 'walk', n: 6, paint: (px, f, n) => brotherPaint(px, f, n, { t: f / n, bob: sin((f / n) * TAU * 2) }) },
    { name: 'attack', n: 4, paint: (px, f, n) => brotherPaint(px, f, n, { attack: true, t: f / (n - 1) }) },
    { name: 'forgiven', n: 4, paint: (px, f, n) => brotherPaint(px, f, n, { forgiven: 1, t: f / n }) },
    { name: 'death', n: 5, paint: (px, f, n) => brotherPaint(px, f, n, { bob: (f / (n - 1)) * 5 }) },
  ] },
  { name: 'pride', height: 3.0, shadow: true, anims: [
    { name: 'idle', n: 4, paint: (px, f, n) => pridePaint(px, f, n, { t: f / n, bob: f % 2 ? 1 : 0 }) },
    { name: 'walk', n: 6, paint: (px, f, n) => pridePaint(px, f, n, { t: f / n, bob: sin((f / n) * TAU * 2) * 1.5 }) },
    { name: 'attack', n: 6, paint: (px, f, n) => pridePaint(px, f, n, { attack: true, t: f / (n - 1) }) },
    { name: 'death', n: 8, paint: (px, f, n) => {
        const p = f / (n - 1);
        pridePaint(px, f, n, { dead: p, bob: p * 4 });
      } },
  ] },
  { name: 'elder', height: 2.2, shadow: true, anims: [
    { name: 'idle', n: 4, paint: (px, f, n) => elderPaint(px, f, n, { bob: f % 2 ? 1 : 0 }) },
  ] },
];

const PROPS = [
  { name: 'torch', height: 1.25, anims: [{ name: 'idle', n: 4, paint: (px, f, n) => torchPaint(px, f, n) }] },
  { name: 'banner', height: 2.6, anims: [{ name: 'idle', n: 2, paint: (px, f, n) => bannerPaint(px, f, n) }] },
  { name: 'shard', height: 1.0, anims: [{ name: 'idle', n: 2, paint: (px, f, n) => shardPaint(px, f, n) }] },
  { name: 'prayer_shield', height: 1.6, anims: [{ name: 'idle', n: 4, paint: (px, f, n) => shieldPaint(px, f, n) }] },
  { name: 'beam', height: 3.4, anims: [{ name: 'idle', n: 2, paint: (px, f, n) => beamPaint(px, f, n) }] },
  { name: 'explosion', height: 2.4, anims: [{ name: 'idle', n: 6, paint: (px, f, n) => explosionPaint(px, f, n) }] },
  { name: 'puff', height: 1.8, anims: [{ name: 'idle', n: 4, paint: (px, f, n) => puffPaint(px, f, n) }] },
  { name: 'shadow', height: 1.0, anims: [{ name: 'idle', n: 1, paint: (px) => shadowPaint(px) }] },
];

function explosionPaint(px, frame, n) {
  const c = new CP(px);
  const t = frame / Math.max(1, n - 1);
  const r = 3 + t * 13;
  const pal = t < 0.35 ? [0xff, 0xfc, 0xf0] : t < 0.65 ? C.flameHi : t < 0.85 ? C.flame : C.flameD;
  c.ellipse(0, 0, r, r * 0.9, pal, 230);
  c.ellipse(0, 0, r * 0.6, r * 0.6, C.flameHi, 235);
  c.ellipse(0, 0, r * 0.3, r * 0.3, [0xff, 0xff, 0xff], 255);
  const rnd = mulberry32(frame * 7919 + 13);
  for (let i = 0; i < 8; i++) {
    const a = rnd() * TAU, d = r * (0.5 + rnd() * 0.9);
    c.ellipse(sin(a) * d, cosSafe(a) * d * 0.8, 1.5, 1.5, i % 2 ? C.flameHi : C.flame, 220);
  }
}

function puffPaint(px, frame, n) {
  const c = new CP(px);
  const t = frame / Math.max(1, n - 1);
  const r = 3 + t * 9;
  const a = Math.round(200 * (1 - t * 0.8));
  c.ellipse(0, 0, r, r * 0.8, [0xd8, 0xd0, 0xc0], a);
  c.ellipse(-r * 0.5, 2, r * 0.5, r * 0.4, [0xbf, 0xb8, 0xa8], Math.round(a * 0.8));
}

function shadowPaint(px) {
  const c = new CP(px);
  c.ellipse(0, 1, 12, 3.5, C.shadow, 120);
}

// ---------------------------------------------------------------------------
// Render one sheet: 1 row of n cells, sprite centered, pink background.
function renderSheet(name, anim, cell = CELL) {
  const px = new PX(cell * anim.n, cell);
  px.fillPink();
  const mask = new Uint8Array(anim.n * cell * cell);
  for (let f = 0; f < anim.n; f++) {
    const tmp = new PX(cell, cell);
    anim.paint(tmp, f, anim.n);
    let minX = cell, maxX = -1, minY = cell, maxY = -1;
    for (let y = 0; y < cell; y++) {
      for (let x = 0; x < cell; x++) {
        const i = (y * cell + x) * 4;
        if (tmp.data[i + 3] === 0) continue;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
    const w = maxX - minX + 1, h = maxY - minY + 1;
    const ox = Math.round((cell - w) / 2) - minX;
    const oy = Math.round((cell - h) / 2) - minY;
    for (let y = 0; y < cell; y++) {
      for (let x = 0; x < cell; x++) {
        const i = (y * cell + x) * 4;
        if (tmp.data[i + 3] === 0) continue;
        const dx = x + ox, dy = y + oy;
        if (dx < 0 || dy < 0 || dx >= cell || dy >= cell) continue;
        const j = (dy * (cell * anim.n) + f * cell + dx) * 4;
        px.data[j] = tmp.data[i];
        px.data[j + 1] = tmp.data[i + 1];
        px.data[j + 2] = tmp.data[i + 2];
        px.data[j + 3] = tmp.data[i + 3];
        mask[(f * cell + dy) * cell + dx] = 1;
      }
    }
  }
  // validation: pink only as background
  for (let f = 0; f < anim.n; f++) {
    for (let y = 0; y < cell; y++) {
      for (let x = 0; x < cell; x++) {
        if (!mask[(f * cell + y) * cell + x]) continue;
        const i = (y * (cell * anim.n) + f * cell + x) * 4;
        const r = px.data[i], g = px.data[i + 1], b = px.data[i + 2], a = px.data[i + 3];
        if (a === 0) continue;
        const near = Math.abs(r - 255) < 40 && g < 60 && Math.abs(b - 255) < 40;
        if (near) throw new Error(`[${name}/${anim.name}] pink-adjacent at frame ${f} (${x},${y}) rgb(${r},${g},${b})`);
      }
    }
  }
  return px;
}

// ---------------------------------------------------------------------------
const manifest = { cell: CELL, animations: {}, actors: {} };
const files = [];

for (const actor of ASSETS) {
  manifest.actors[actor.name] = { anims: {}, height: actor.height, shadow: !!actor.shadow };
  for (const anim of actor.anims) {
    const file = `${actor.name}_${anim.name}.png`;
    const px = renderSheet(actor.name, anim, CELL);
    savePNG(path.join(OUT, file), px.w, px.h, px.data);
    manifest.animations[file] = { frames: anim.n, cols: anim.n, rows: 1, cell: CELL };
    manifest.actors[actor.name].anims[anim.name] = file;
    files.push(file);
  }
}
for (const prop of PROPS) {
  manifest.actors[prop.name] = { anims: {}, height: prop.height, shadow: false };
  for (const anim of prop.anims) {
    const file = `${prop.name}_${anim.name}.png`;
    const px = renderSheet(prop.name, anim, CELL);
    savePNG(path.join(OUT, file), px.w, px.h, px.data);
    manifest.animations[file] = { frames: anim.n, cols: anim.n, rows: 1, cell: CELL };
    manifest.actors[prop.name].anims[anim.name] = file;
    files.push(file);
  }
}

fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log(`Generated ${files.length} spritesheets -> ${path.relative(process.cwd(), OUT)}`);
for (const f of files) console.log('  ' + f);
