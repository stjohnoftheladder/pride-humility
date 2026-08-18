// Undertale-style battle screen: orthographic 3D scene with a battle box, the
// heart (soul) the player dodges with, bullet patterns, a FIGHT/PRAY/ALMS/MERCY
// menu, and the hold-Space Jesus-Prayer shield.
import * as THREE from 'three';
import { AnimatedSprite } from '../SpriteSystem.js';
import { PATTERNS } from './patterns.js';
import { PLAYER_HP_MAX, PALETTE } from '../config.js';
import { esc } from '../hud.js';

const BOX = { minX: 2, maxX: 12, minY: -4, maxY: 3 };
BOX.w = BOX.maxX - BOX.minX;
BOX.h = BOX.maxY - BOX.minY;
const HEART_SPEED = 6.5;
const HEART_R = 0.28;
const BULLET_R = 0.34;
const PRAY_DRAIN = 24;   // stamina per second while holding Space
const PRAY_REGEN = 13;   // stamina per second while not holding

function makeBoxTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 384;
  const ctx = c.getContext('2d');
  // interior: dark but not dead — a faint warm gradient
  const ig = ctx.createLinearGradient(0, 0, 0, 384);
  ig.addColorStop(0, 'rgba(38, 28, 16, 0.97)');
  ig.addColorStop(1, 'rgba(24, 18, 10, 0.97)');
  ctx.fillStyle = ig;
  ctx.fillRect(4, 4, 504, 376);
  ctx.strokeStyle = '#e8b84a'; // deeper gold so it survives tone mapping
  ctx.lineWidth = 7;
  ctx.strokeRect(10, 10, 492, 364);
  ctx.strokeStyle = '#c4a46c';
  ctx.lineWidth = 2;
  ctx.strokeRect(22, 22, 468, 340);
  // corner ticks
  ctx.strokeStyle = '#e8b84a';
  ctx.lineWidth = 4;
  for (const [x, y] of [[10, 10], [502, 10], [10, 374], [502, 374]]) {
    ctx.beginPath();
    ctx.moveTo(x - 10, y); ctx.lineTo(x + 10, y);
    ctx.moveTo(x, y - 10); ctx.lineTo(x, y + 10);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeBgTexture() {
  const c = document.createElement('canvas');
  c.width = 640; c.height = 360;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(320, 200, 40, 320, 180, 340);
  g.addColorStop(0, '#2b2010');
  g.addColorStop(0.55, '#1c140a');
  g.addColorStop(1, '#0d0904');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 640, 360);
  // warm candle-glow pooling where the enemy stands (left of centre)
  const eg = ctx.createRadialGradient(210, 170, 10, 210, 170, 150);
  eg.addColorStop(0, 'rgba(243, 210, 118, 0.20)');
  eg.addColorStop(1, 'rgba(243, 210, 118, 0)');
  ctx.fillStyle = eg;
  ctx.fillRect(0, 0, 640, 360);
  // gold vignette
  ctx.strokeStyle = 'rgba(243,210,118,0.22)';
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, 630, 350);
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class BattleSystem {
  constructor() {
    this.active = false;
    this.done = null;      // { outcome: 'spared' | 'defeated' | 'fell' }
    this.def = null;
    this.ctx = null;
    this.bullets = [];
    this.sprites = [];     // everything to remove on dispose
    this.keys = {};
    this.round = 0;
    this.prayActions = 0;
    this.enemyHp = 0;
    this.prayerStamina = 100;
    this.difficulty = 1;
    this.phase = 'idle';   // intro | menu | fight | enemy | resolving | done
    this.phaseT = 0;
    this.introIdx = 0;
    this.menuIdx = 0;
    this.subIdx = 0;
    this.patternT = 0;
    this.patternIdx = 0;
    this.barT = 0;
    this.barDir = 1;
    this.barMarker = 0;
    this.enemyTalk = false;
    this.dialogDone = false;
    this.helpTimer = 0;
    this.forceMomentum = 0;
  }

  // ------------------------------------------------------------------ setup
  start(def, ctx) {
    this.def = def;
    this.ctx = ctx;
    this.box = BOX;
    const { scene, branch } = ctx;
    this.active = true;
    this.done = null;
    this.bullets = [];
    this.sprites = [];
    this.round = 0;
    this.prayActions = 0;
    this.enemyHp = def.hp ?? 40;
    this.prayerStamina = 100;
    this.difficulty = 1 + (branch.pride / 100) * 0.55;
    this.phase = 'intro';
    this.phaseT = 0;
    this.introIdx = 0;
    this.patternIdx = 0;
    this.forceMomentum = 0;

    // orthographic camera
    this.camera = new THREE.OrthographicCamera(-16, 16, 9, -9, 0.1, 100);
    this.camera.position.set(0, 0, 12);
    this.camera.lookAt(0, 0, 0);

    // background
    const bg = new THREE.Mesh(new THREE.PlaneGeometry(32, 18), new THREE.MeshBasicMaterial({ map: makeBgTexture() }));
    bg.position.z = -2;
    scene.add(bg);
    this.sprites.push(bg);

    // battle box
    const box = new THREE.Mesh(new THREE.PlaneGeometry(BOX.w + 0.2, BOX.h + 0.2), new THREE.MeshBasicMaterial({ map: makeBoxTexture(), transparent: true }));
    box.position.set((BOX.minX + BOX.maxX) / 2, (BOX.minY + BOX.maxY) / 2, 0);
    scene.add(box);
    this.sprites.push(box);

    // enemy billboard
    const enemyH = def.enemy === 'pride' ? 3.6 : def.enemy === 'brother' ? 2.9 : 2.7;
    this.enemyX = -9.2;
    this.enemyY = 0.8;
    this.enemy = new AnimatedSprite(def.enemy, enemyH);
    this.enemy.mesh.position.set(this.enemyX, this.enemyY + 0.05, 0.6);
    this.enemy.setAnimation('idle', { fps: 7 });
    scene.add(this.enemy.mesh);
    this.sprites.push(this.enemy);

    // shadow under enemy
    this.enemyShadow = new AnimatedSprite('shadow', 1);
    this.enemyShadow.size = enemyH * 0.8;
    this.enemyShadow.mesh.position.set(this.enemyX, -3.4, 0.5);
    this.enemyShadow.setAnimation('idle');
    scene.add(this.enemyShadow.mesh);
    this.sprites.push(this.enemyShadow);

    // the heart (soul)
    this.heart = new AnimatedSprite('heart', 0.7);
    this.heart.mesh.position.set(7, -0.5, 1.6);
    this.heart.setAnimation('idle', { fps: 6 });
    scene.add(this.heart.mesh);
    this.sprites.push(this.heart);
    this.heartPos = { x: 7, y: -0.5 };

    // prayer shield visual
    this.shield = new AnimatedSprite('prayer_shield', 1.7);
    this.shield.mesh.position.set(7, -0.5, 1.4);
    this.shield.setAnimation('idle', { fps: 8 });
    this.shield.mesh.visible = false;
    scene.add(this.shield.mesh);
    this.sprites.push(this.shield);

    // beam (mercy victory)
    this.beam = new AnimatedSprite('beam', 5);
    this.beam.mesh.position.set(this.enemyX, 1, 0.2);
    this.beam.setAnimation('idle', { fps: 6 });
    this.beam.mesh.visible = false;
    scene.add(this.beam.mesh);
    this.sprites.push(this.beam);

    this.hud = ctx.hud;
    this.hud.battleOn();
    this.hud.battleEnemy(def.name);
    this.hud.battleSetHp(branch.hp, PLAYER_HP_MAX);
    this.hud.setPrayer(100);
    // first battle: show "The Way of Battle" instructions (dismissable, non-blocking)
    if (localStorage.getItem('ph-battle-help') !== '1') {
      this.helpTimer = 8;
      this.hud.showBattleHelp();
    }
    this.hud.onHelpDismiss = () => this._dismissHelp();
    this._say(esc(this._introLines()[0] ?? ''));
    this.dialogDone = false;
  }

  _dismissHelp() {
    if (this.helpTimer <= 0) return;
    this.helpTimer = 0;
    try { localStorage.setItem('ph-battle-help', '1'); } catch { /* private mode */ }
    this.hud.hideBattleHelp();
  }

  // ---------------------------------------------------------------- helpers
  _say(html) {
    this.hud.battleDialog(html);
  }

  _who(text) {
    return `<span class="who">${esc(this.def.name)}</span><br>${esc(text)}`;
  }

  tick(interval, t) {
    // returns true once per `interval` seconds, using this.phaseT as clock
    const k = Math.floor(t / interval);
    if (this._lastTick === k) return false;
    this._lastTick = k;
    return true;
  }

  spawnBullet(x, y, vx, vy) {
    const b = new AnimatedSprite('shard', 0.55);
    b.mesh.position.set(x, y, 1.2);
    b.setAnimation('idle', { fps: 10 });
    this.ctx.scene.add(b.mesh);
    this.sprites.push(b);
    const bullet = { sprite: b, x, y, vx, vy, zig: 0, zigT: 0, t: 0 };
    this.bullets.push(bullet);
    return bullet;
  }

  spawnArc(x0, y0, tx, ty, dur) {
    const vx = (tx - x0) / dur;
    // solve vy so the arc lands at (tx, ty): y(t) = y0 + vy*t - 1.6*t^2
    const vy = (ty - y0 + 1.6 * dur * dur) / dur;
    const b = this.spawnBullet(x0, y0, vx, vy);
    b.arc = 1.6;
    b.t = 0;
    return b;
  }

  // ------------------------------------------------------------ public API
  onKey(e, down) {
    this.keys[e.code] = down;
    if (!down) return;
    if (this.helpTimer > 0) {
      this._dismissHelp(); // any key dismisses; the key still processes below
    }
    if (this.phase === 'intro') {
      if (e.code === 'KeyZ' || e.code === 'Enter' || e.code === 'Space') this._advanceDialog();
      return;
    }
    if (this.phase === 'enemy') {
      // Space is the prayer key — only Z/Enter advance the dialogue
      if (e.code === 'KeyZ' || e.code === 'Enter') this._advanceDialog();
      return;
    }
    if (this.phase === 'menu') this._menuKey(e.code);
    else if (this.phase === 'fight') {
      if (e.code === 'KeyZ' || e.code === 'Enter') this._resolveFight();
    }
  }

  update(dt) {
    if (!this.active) return null;
    this.phaseT += dt;
    const t = this.phaseT;

    if (this.helpTimer > 0) {
      this.helpTimer -= dt;
      if (this.helpTimer <= 0) this._dismissHelp();
    }

    switch (this.phase) {
      case 'intro': {
        this._updateSprites(dt);
        // wait for the player to read; Z advances
        if (this.dialogDone) {
          this.phase = 'menu';
          this.phaseT = 0;
          this._openMenu();
        }
        break;
      }
      case 'menu': {
        this._updateSprites(dt);
        break;
      }
      case 'fight': {
        this._updateFight(dt);
        break;
      }
      case 'enemy': {
        this._updateEnemyTurn(dt);
        break;
      }
      case 'resolving': {
        this._updateSprites(dt);
        if (this.phaseT > this.resolveDur) {
          this.phase = 'done';
          return this.done;
        }
        break;
      }
      case 'done': {
        return this.done;
      }
    }
    return null;
  }

  // ------------------------------------------------------- sprite upkeep
  _updateSprites(dt, opts = {}) {
    const cam = this.camera;
    this.enemy.update(dt, cam);
    this.enemyShadow.update(dt, cam);
    if (opts.heart !== false) this.heart.update(dt, cam);
    this.shield.update(dt, cam);
    this.beam.update(dt, cam);
    for (const b of this.bullets) b.sprite.update(dt, cam);
  }

  _introLines() {
    const intro = this.def.intro;
    return typeof intro === 'function' ? intro(this.ctx.branch) : (intro ?? []);
  }

  // ------------------------------------------------------------- dialog
  _advanceDialog() {
    if (this.phase === 'intro') {
      this.introIdx++;
      const lines = this._introLines();
      if (this.introIdx < lines.length) {
        this._say(esc(lines[this.introIdx]));
      } else {
        this.dialogDone = true;
      }
    } else if (this.phase === 'enemy') {
      this._say(`<span class="who">${this.def.name}</span><br>${this.def.lines?.round?.(this.round, this.ctx.branch) ?? '...'}`);
    }
  }

  // ---------------------------------------------------------------- menu
  _openMenu() {
    this.menuIdx = 0;
    this.subIdx = 0;
    this.heart.mesh.visible = false;
    this._renderMenu();
  }

  _menuItems() {
    const mercyReady = this._mercyReady();
    return [
      { id: 'fight', label: 'FIGHT!' },
      { id: 'pray', label: 'PRAY' },
      { id: 'alms', label: 'ALMS' },
      { id: 'mercy', label: mercyReady ? 'MERCY ✦' : 'MERCY' },
    ];
  }

  _renderMenu() {
    this.hud.renderMenu(this._menuItems(), this._menuItems()[this.menuIdx]?.id);
    this._renderMercyCondition();
  }

  _menuKey(code) {
    const items = this._menuItems();
    if (this._submode) {
      const sub = this._subItems();
      if (code === 'ArrowUp') { this.subIdx = (this.subIdx + sub.length - 1) % sub.length; this._renderSub(); }
      else if (code === 'ArrowDown') { this.subIdx = (this.subIdx + 1) % sub.length; this._renderSub(); }
      else if (code === 'KeyZ' || code === 'Enter') { this._chooseSub(sub[this.subIdx]?.id); }
      else if (code === 'KeyX' || code === 'Escape') { this._submode = null; this._renderMenu(); }
      return;
    }
    if (code === 'ArrowLeft') { this.menuIdx = (this.menuIdx + items.length - 1) % items.length; this._renderMenu(); }
    else if (code === 'ArrowRight') { this.menuIdx = (this.menuIdx + 1) % items.length; this._renderMenu(); }
    else if (code === 'ArrowUp') { this.menuIdx = (this.menuIdx + items.length - 1) % items.length; this._renderMenu(); }
    else if (code === 'ArrowDown') { this.menuIdx = (this.menuIdx + 1) % items.length; this._renderMenu(); }
    else if (code === 'KeyZ' || code === 'Enter') this._choose(this._menuItems()[this.menuIdx].id);
  }

  _subItems() {
    if (this._submode === 'alms') return this._almsItems();
    return [
      { id: 'spare', label: 'Spare', enabled: this._mercyReady() },
      { id: 'wait', label: 'Wait', enabled: true },
    ];
  }

  _renderSub() {
    const sub = this._subItems();
    this.hud.renderMenu(this._menuItems(), this._submode === 'alms' ? 'alms' : 'mercy', sub, this.subIdx);
    this._renderMercyCondition();
  }

  _choose(id) {
    const { branch } = this.ctx;
    if (id === 'fight') {
      this.phase = 'fight';
      this.phaseT = 0;
      this.barMarker = 0;
      this.barDir = 1;
      this.barT = 0;
      this.hud.showFightBar(true);
      this._say('Choose your moment.');
    } else if (id === 'pray') {
      branch.addGrace(3);
      branch.prayerUses += 1;
      this.prayActions += 1;
      // Deliberate prayer advances mercy, but stillness costs breath. The
      // next assault begins with less shield stamina than a forceful turn.
      this.prayerStamina = Math.max(35, this.prayerStamina - 22);
      this.hud.setPrayer(this.prayerStamina);
      this.ctx.audio.pray();
      this._say(this._who(this.def.lines?.pray?.[this.prayActions - 1] ?? '\u201CLord Jesus Christ, have mercy on me, a sinner.\u201D'));
      this._endPlayerTurn();
    } else if (id === 'alms') {
      this.subIdx = 0;
      this._submode = 'alms';
      this._renderSub();
    } else if (id === 'mercy') {
      this.subIdx = 0;
      this._submode = 'mercy';
      this._renderSub();
    }
  }

  _almsItems() {
    const b = this.ctx.branch;
    return [
      { id: 'bread', label: `Bread \u00D7${b.items?.bread ?? 0}`, enabled: (b.items?.bread ?? 0) > 0 },
      { id: 'water', label: `Water \u00D7${b.items?.water ?? 0}`, enabled: (b.items?.water ?? 0) > 0 },
    ];
  }

  _mercyReady() {
    return this.def.mercy?.(this.ctx.branch, this) ?? false;
  }

  _renderMercyCondition() {
    const ready = this._mercyReady();
    if (ready) {
      this.hud.setBattleCondition('MERCY READY · choose MERCY → Spare', true);
      return;
    }
    const prayerNeed = this.def.prayerNeeded ?? 1;
    const prayer = `${Math.min(this.prayActions, prayerNeed)}/${prayerNeed} prayer`;
    const endurance = this.def.enemy === 'pride' ? '' : ` · ${Math.min(this.round, 2)}/2 endurance`;
    const grace = this.def.enemy === 'pride' ? ` · ${this.ctx.branch.grace}/45 grace` : '';
    this.hud.setBattleCondition(`MERCY CLOSED · ${prayer}${endurance}${grace}`);
  }

  _endPlayerTurn() {
    this.phaseT = 0;
    this.phase = 'enemy';
    this._startEnemyTurn();
  }

  // -------------------------------------------------------------- fight
  _updateFight(dt) {
    this.barT += dt;
    this.barMarker += this.barDir * dt * 1.15;
    if (this.barMarker > 1) { this.barMarker = 1; this.barDir = -1; }
    if (this.barMarker < 0) { this.barMarker = 0; this.barDir = 1; }
    this.hud.setFightMarker(this.barMarker);
    this._updateSprites(dt);
    // after a moment of indecision, resolve with the marker where it stands
    // (no free miss — but waiting isn't a guaranteed miss either)
    if (this.barT > 3.2) this._resolveFight();
  }

  _resolveFight(accOverride) {
    this.hud.showFightBar(false);
    const zone = 0.35; // target zone center
    const acc = accOverride ?? Math.max(0, 1 - Math.abs(this.barMarker - zone) * 2.2);
    const dmg = acc > 0 ? Math.max(2, Math.round(4 + acc * 8)) : 0; // a clean miss deals nothing
    this.enemyHp -= dmg;
    const { branch } = this.ctx;
    branch.addPride(6);
    this.enemy.setTint(3.2, 1.0, 1.0);
    this.ctx.audio.hit();
    this._spawnExplosion(this.enemyX, this.enemyY);
    const d = this.def.lines?.fight?.(dmg, this.enemyHp) ?? `The enemy takes ${dmg} damage.`;
    const forceRelief = dmg > 0 && acc >= 0.7 && this.enemyHp > 0;
    if (forceRelief) {
      branch.hp = Math.min(PLAYER_HP_MAX, branch.hp + 1);
      this.forceMomentum = 1;
      this.hud.battleSetHp(branch.hp, PLAYER_HP_MAX);
    }
    this._say(this._who(forceRelief
      ? `${d} The rush steadies you: +1 HP, and the next assault will be shorter.`
      : d));
    if (this.enemyHp <= 0) {
      this._resolveDefeat();
    } else {
      this._endPlayerTurn();
    }
  }

  _resolveDefeat() {
    this.phase = 'resolving';
    this.phaseT = 0;
    this.resolveDur = 1.8;
    this.enemy.playOnce('death', null, 14);
    this.ctx.audio.enemyDie();
    this._say(this._who(this.def.lines?.defeated ?? 'The enemy crumbles into dust.'));
    this.done = { outcome: 'defeated' };
  }

  // ------------------------------------------------------------ enemy turn
  _startEnemyTurn() {
    this.patternT = 0;
    this._lastTick = -1;
    this.patternIdx = 0;
    this.enemyTalk = true;
    this.heart.mesh.visible = true;
    this.enemy.setAnimation('attack', { fps: 8 });
    this._say(`<span class="who">${this.def.name}</span><br>${this.def.lines?.round?.(this.round, this.ctx.branch) ?? '\u2026'}`);
  }

  _updateEnemyTurn(dt) {
    this.phaseT += 0; // t already advanced; use this.patternT for pattern clock
    this.patternT += dt;
    const t = this.patternT;

    // enemy animation
    this.enemy.update(dt, this.camera);

    // praying (hold Space): slow bullets + shield
    const praying = this.keys.Space;
    const shieldOn = praying && this.prayerStamina > 0;
    this.prayerStamina = Math.max(0, Math.min(100,
      this.prayerStamina + (praying ? -PRAY_DRAIN : PRAY_REGEN) * dt));
    this.hud.setPrayer(this.prayerStamina);
    this.shield.mesh.visible = shieldOn;
    if (shieldOn) this.shield.mesh.position.set(this.heartPos.x, this.heartPos.y, 1.4);
    if (this.heart.mesh.visible === false && this.phase === 'enemy') this.heart.mesh.visible = true;

    // run pattern
    const patterns = this.def.patterns ?? ['words'];
    const pat = PATTERNS[patterns[this.patternIdx % patterns.length]];
    pat(this, t);

    // move heart
    let hx = this.heartPos.x, hy = this.heartPos.y;
    if (this.keys.ArrowLeft || this.keys.KeyA) hx -= HEART_SPEED * dt;
    if (this.keys.ArrowRight || this.keys.KeyD) hx += HEART_SPEED * dt;
    if (this.keys.ArrowUp || this.keys.KeyW) hy += HEART_SPEED * dt;
    if (this.keys.ArrowDown || this.keys.KeyS) hy -= HEART_SPEED * dt;
    const m = 0.55;
    this.heartPos.x = Math.max(BOX.minX + m, Math.min(BOX.maxX - m, hx));
    this.heartPos.y = Math.max(BOX.minY + m, Math.min(BOX.maxY - m, hy));
    this.heart.mesh.position.set(this.heartPos.x, this.heartPos.y, 1.6);
    if (shieldOn) this.shield.update(dt, this.camera);
    this.heart.update(dt, this.camera);

    // bullets
    const slow = shieldOn ? 0.45 : 1;
    const toRemove = [];
    for (const b of this.bullets) {
      b.t += dt;
      if (b.arc) b.vy -= b.arc * slow * dt; // parabolic arcs (coins)
      b.x += b.vx * slow * dt;
      b.y += b.vy * slow * dt;
      if (b.zig) { b.zigT += dt; b.y += Math.sin(b.zigT * 5) * b.zig * dt; }
      b.sprite.mesh.position.set(b.x, b.y, 1.2);
      b.sprite.update(dt, this.camera);
      // once a bullet has entered the box, cull it when it leaves (spawn-side
      // bullets like coins/vanity are allowed to travel in)
      if (!b.entered && b.x > BOX.minX && b.x < BOX.maxX && b.y > BOX.minY && b.y < BOX.maxY) b.entered = true;
      if (b.t > 7 || (b.entered && (b.x < BOX.minX - 1.5 || b.x > BOX.maxX + 1.5 || b.y < BOX.minY - 1.5 || b.y > BOX.maxY + 1.5))) {
        toRemove.push(b);
        continue;
      }
      // hit heart?
      const dx = b.x - this.heartPos.x, dy = b.y - this.heartPos.y;
      if (dx * dx + dy * dy < (HEART_R + BULLET_R) ** 2) {
        toRemove.push(b);
        if (shieldOn) {
          // prayer turns the shard aside
          this.ctx.audio.pickup();
          this._spawnPuff(b.x, b.y);
        } else {
          this._hitHeart();
          if (this.done) return;
        }
      }
    }
    for (const b of toRemove) this._removeBullet(b);

    // enemy turn length
    const baseDur = 4.4 + (this.def.enemy === 'pride' ? 1.6 : 0) + this.round * 0.3;
    const dur = baseDur * (this.forceMomentum ? 0.72 : 1);
    if (this.patternT >= dur) {
      this.forceMomentum = 0;
      this.patternIdx++;
      this.round++;
      this.enemy.setAnimation('idle', { fps: 7 });
      // clear remaining bullets
      for (const b of [...this.bullets]) this._removeBullet(b);
      this.phase = 'menu';
      this.phaseT = 0;
      this._openMenu();
    }
  }

  _hitHeart() {
    const { branch } = this.ctx;
    branch.hp -= 1;
    this.ctx.audio.hurt();
    this.heart.setTint(3, 0.6, 0.6);
    this.hud.battleSetHp(branch.hp, PLAYER_HP_MAX);
    this.hud.battleHpFlash();
    if (branch.hp <= 0) {
      this.phase = 'resolving';
      this.phaseT = 0;
      this.resolveDur = 1.6;
      this.heart.setAlpha(0.4);
      this.ctx.audio.fallSting();
      this.done = { outcome: 'fell' };
    }
  }

  _removeBullet(b) {
    const i = this.bullets.indexOf(b);
    if (i >= 0) this.bullets.splice(i, 1);
    this.ctx.scene.remove(b.sprite.mesh);
    const j = this.sprites.indexOf(b.sprite);
    if (j >= 0) this.sprites.splice(j, 1);
    b.sprite.dispose();
  }

  // ------------------------------------------------------------- mercy
  _chooseSub(id) {
    const { branch } = this.ctx;
    if (this._submode === 'alms') {
      if (id === 'bread' && branch.items.bread > 0) {
        branch.items.bread -= 1;
        branch.hp = Math.min(PLAYER_HP_MAX, branch.hp + 4);
        branch.addGrace(1);
        this.ctx.audio.pickup();
        this._say(this._who('You share the bread. Strength returns. (+4 HP)'));
      } else if (id === 'water' && branch.items.water > 0) {
        branch.items.water -= 1;
        branch.hp = Math.min(PLAYER_HP_MAX, branch.hp + 2);
        this.ctx.audio.pickup();
        this._say(this._who('Cold water. The soul drinks too. (+2 HP)'));
      } else {
        this._say(this._who('Nothing left but the words of the prayer.'));
      }
      this.hud.battleSetHp(branch.hp, PLAYER_HP_MAX);
      this._endPlayerTurn();
    } else if (this._submode === 'mercy') {
      if (id === 'spare' && this._mercyReady()) {
        this._resolveSpared();
      } else if (id === 'wait') {
        branch.addGrace(1);
        this._say(this._who(this.def.lines?.wait ?? 'You wait, and watch. (+1 grace)'));
        this._endPlayerTurn();
      } else {
        this._say(this._who(this.def.lines?.mercyReady ?? 'Not yet. The heart is not ready to spare.'));
        this._endPlayerTurn();
      }
    }
    this._submode = null;
  }

  _resolveSpared() {
    this.phase = 'resolving';
    this.phaseT = 0;
    this.resolveDur = 2.2;
    this.beam.mesh.visible = true;
    this.beam.playOnce('idle', null, 8);
    this.enemy.setAlpha(0.6);
    if (this.def.enemy === 'brother') this.enemy.playOnce('forgiven', null, 8);
    this.ctx.audio.mercy();
    this._say(this._who(this.def.lines?.spared ?? '\u201CGo in peace.\u201D'));
    this.done = { outcome: 'spared' };
  }

  // ------------------------------------------------------------- effects
  _spawnExplosion(x, y) {
    const e = new AnimatedSprite('explosion', 2.2);
    e.mesh.position.set(x, y, 1.1);
    e.playOnce('idle', () => {
      this.ctx.scene.remove(e.mesh);
      const j = this.sprites.indexOf(e);
      if (j >= 0) this.sprites.splice(j, 1);
      e.dispose();
    }, 16);
    this.ctx.scene.add(e.mesh);
    this.sprites.push(e);
    this.ctx.audio.explode();
  }

  _spawnPuff(x, y) {
    const p = new AnimatedSprite('puff', 1.2);
    p.mesh.position.set(x, y, 1.3);
    p.playOnce('idle', () => {
      this.ctx.scene.remove(p.mesh);
      const j = this.sprites.indexOf(p);
      if (j >= 0) this.sprites.splice(j, 1);
      p.dispose();
    }, 10);
    this.ctx.scene.add(p.mesh);
    this.sprites.push(p);
  }

  // -------------------------------------------------------------- cleanup
  dispose() {
    this.active = false;
    this.hud.onHelpDismiss = null;
    this.hud.hideBattleHelp();
    for (const s of this.sprites) {
      this.ctx.scene.remove(s.mesh ?? s);
      if (s.dispose && typeof s.dispose === 'function') s.dispose();
    }
    this.sprites = [];
    this.bullets = [];
    this.hud.battleOff();
    this.hud.showFightBar(false);
  }
}
