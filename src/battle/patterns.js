// Bullet patterns for enemy turns. Each pattern is a function that receives a
// BattleSystem (bt) and a time t (seconds into the enemy turn) and spawns
// bullets via bt.spawnBullet(...). Returns after spawning its sequence.
// Patterns are drawn from the encounter def and scaled by the pilgrim's pride
// (the demon is stronger when you are proud).

export const PATTERNS = {
  /** Basic Undertale-style: shards crossing the box, one after another. */
  words(bt, t) {
    const speed = 3.2 * bt.difficulty;
    if (bt.tick(0.55, t)) {
      bt.spawnBullet(bt.box.minX - 0.6, bt.box.minY + 1 + Math.random() * (bt.box.h - 2), speed, 0);
    }
  },

  /** Tempter: arcs of coin-bullets with gravity. */
  coins(bt, t) {
    if (bt.tick(0.9, t)) {
      const fromX = bt.enemyX + 3, fromY = bt.enemyY;
      for (let i = 0; i < 3; i++) {
        const tx = bt.box.minX + Math.random() * bt.box.w;
        const ty = bt.box.minY + Math.random() * bt.box.h;
        const dur = 0.9 + Math.random() * 0.6;
        bt.spawnArc(fromX, fromY, tx, ty, dur);
      }
    }
  },

  /** Greed: zigzag stream. */
  greed(bt, t) {
    if (bt.tick(0.4, t)) {
      const y0 = bt.box.minY + 1.5 + Math.random() * (bt.box.h - 3);
      const b = bt.spawnBullet(bt.box.minX - 0.6, y0, 3.4 * bt.difficulty, 0);
      b.zig = (Math.random() * 2 - 1) * 1.6;
      b.zigT = 0;
    }
  },

  /** Wounded Brother: fast aimed shards from the cell wall. */
  wrath(bt, t) {
    if (bt.tick(0.5, t)) {
      const ang = (Math.random() - 0.5) * 1.4;
      const speed = 4.2 * bt.difficulty;
      bt.spawnBullet(bt.box.maxX + 0.6, bt.box.maxY - 0.6, -Math.cos(ang) * speed, -Math.sin(ang) * speed);
    }
  },

  /** Demon of Pride: rotating spiral of vanity. */
  vanity(bt, t) {
    if (bt.tick(0.16, t)) {
      const ang = t * 2.2;
      const speed = 2.6 * bt.difficulty;
      bt.spawnBullet(bt.enemyX, bt.enemyY, Math.cos(ang) * speed, Math.sin(ang) * speed);
    }
  },

  /** Demon of Pride: ring bursts centred on the heart (dodge outward). */
  crown(bt, t) {
    if (bt.tick(1.4, t)) {
      const n = 10;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        bt.spawnBullet(bt.heartPos.x, bt.heartPos.y, Math.cos(a) * 1.6, Math.sin(a) * 1.6);
      }
    }
  },

  /** Rain of prideful words from above. */
  fall(bt, t) {
    if (bt.tick(0.35, t)) {
      bt.spawnBullet(bt.box.minX + Math.random() * bt.box.w, bt.box.maxY + 0.6, 0, -3.0 * bt.difficulty);
    }
  },
};
