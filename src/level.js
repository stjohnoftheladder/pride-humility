// Pilgrimage level construction: geometry, collision, candle lights, triggers.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { LEVEL, CELL, WALL_H, MAP_W, MAP_H, PALETTE } from './config.js';
import { HOUSE, HAGIA, HAGIA_MINARETS, DOME_CELLS, TOWER_CELLS, roofKind } from './city.js';
import { Materials } from './textures.js';
import { AnimatedSprite } from './SpriteSystem.js';

// Light-blue daylight gradient sky, drawn once into a canvas texture and
// stretched over a back-side dome so the whole walk is open air.
function makeSkyTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const top = ctx.createLinearGradient(0, 0, 0, 256);
  top.addColorStop(0.0, '#5d9fd6');   // zenith blue
  top.addColorStop(0.55, '#9cc9e8');  // mid sky
  top.addColorStop(0.82, '#cfe4f2');  // high horizon
  top.addColorStop(1.0, '#e9f3fa');   // pale horizon
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, 64, 256);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.NearestFilter;
  return tex;
}

function makeWayfindingLabel(text) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(18, 13, 7, 0.94)';
  ctx.strokeStyle = '#f3d276';
  ctx.lineWidth = 8;
  ctx.fillRect(8, 8, 496, 112);
  ctx.strokeRect(8, 8, 496, 112);
  ctx.fillStyle = '#f3d276';
  ctx.font = 'bold 42px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 64);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.magFilter = THREE.NearestFilter;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
  sprite.scale.set(6.4, 1.6, 1);
  return sprite;
}

export class Level {
  constructor(scene, materials) {
    this.scene = scene;
    this.mat = materials;
    this.colliders = [];
    this.candleLights = [];
    this.group = new THREE.Group();
    scene.add(this.group);
    this.spawns = { S: [], E: [], A: [], K: [], B: [], P: [], L: [], V: [], c: [] };
    this.worldEnemies = {};  // id -> { sprite, shadow }
    this.animSprites = [];   // every animated billboard in the world
  }

  centerOf(x, z) {
    return new THREE.Vector3((x + 0.5) * CELL, 0, (z + 0.5) * CELL);
  }

  addCollider(cx, cz, w, h, top = WALL_H) {
    this.colliders.push({ minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - h / 2, maxZ: cz + h / 2, top });
  }

  trackFlicker(light, baseIntensity) {
    light.userData.flickerBase = baseIntensity;
    this.candleLights.push(light);
  }

  /** Give each passion a visual argument before it speaks: abundance without
   * use, a wound made into a room, and eyes that turn every surface inward. */
  addThresholdStorytelling() {
    const story = new THREE.Group();
    story.name = 'threshold-storytelling';

    const tempter = new THREE.Group();
    tempter.name = 'tempter-coins';
    const coinSpots = [
      [3.2, 15.2, 0], [4.1, 16.0, 1], [5.0, 15.5, 2], [7.7, 16.1, 0],
      [8.6, 15.4, 1], [9.4, 17.2, 0], [4.8, 17.3, 1], [8.0, 17.6, 2],
    ];
    for (const [gx, gz, stack] of coinSpots) {
      for (let i = 0; i <= stack; i++) {
        const coin = new THREE.Mesh(
          new THREE.CylinderGeometry(0.28, 0.28, 0.055, 10),
          this.mat.get('gold'),
        );
        coin.position.set((gx + 0.5) * CELL, 0.04 + i * 0.06, (gz + 0.5) * CELL);
        coin.rotation.y = (gx * 1.7 + gz) % Math.PI;
        tempter.add(coin);
      }
    }
    tempter.userData.storytelling = 'Abundance glitters, but nothing here is fed.';
    story.add(tempter);

    const brother = new THREE.Group();
    brother.name = 'brother-wound';
    const bedAt = this.centerOf(17, 16);
    const bed = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.45, 1.45), this.mat.get('wood_floor'));
    bed.position.set(bedAt.x, 0.32, bedAt.z);
    const pallet = new THREE.Mesh(
      new THREE.BoxGeometry(4.1, 0.16, 1.2),
      new THREE.MeshStandardMaterial({ color: 0x8a765f, roughness: 1 }),
    );
    pallet.position.set(bedAt.x, 0.63, bedAt.z);
    const bandage = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 0.34),
      new THREE.MeshBasicMaterial({ color: 0xd6c6aa, side: THREE.DoubleSide }),
    );
    bandage.rotation.x = -Math.PI / 2;
    bandage.rotation.z = -0.22;
    bandage.position.set(bedAt.x + 0.35, 0.73, bedAt.z);
    const stain = new THREE.Mesh(
      new THREE.CircleGeometry(0.2, 10),
      new THREE.MeshBasicMaterial({ color: 0x6d1d18, side: THREE.DoubleSide }),
    );
    stain.rotation.x = -Math.PI / 2;
    stain.position.set(bedAt.x + 0.45, 0.74, bedAt.z);
    const stool = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.18, 0.85), this.mat.get('wood_floor'));
    stool.position.set((22.5) * CELL, 0.25, (17.5) * CELL);
    stool.rotation.z = 0.72;
    brother.add(bed, pallet, bandage, stain, stool);
    brother.userData.storytelling = 'The grievance has become furniture.';
    story.add(brother);

    const pride = new THREE.Group();
    pride.name = 'pride-eyes';
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xd9c89a, emissive: 0x5a2a16, emissiveIntensity: 0.35, roughness: 0.55 });
    const pupilMat = new THREE.MeshBasicMaterial({ color: 0x160906 });
    for (const side of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 8), eyeMat);
        eye.scale.set(0.45, 1, 0.22);
        eye.position.set(side < 0 ? 81.4 : 95.6, 1.7 + i * 1.45, 46.5 + i * 2.15);
        const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 6), pupilMat);
        pupil.position.copy(eye.position);
        pupil.position.x += side < 0 ? 0.14 : -0.14;
        pride.add(eye, pupil);
      }
    }
    pride.userData.storytelling = 'Every eye watches for an audience.';
    story.add(pride);

    this.group.add(story);
    this.storytelling = story;
  }

  /** A destination, not a bright patch on a wall: a gold ladder held inside
   * a pointed gate. The label, floor path, and descending light appear only
   * once Pride has been resolved. */
  addLadderGate() {
    const p = this.spawns.L[0];
    if (!p) return;
    const gate = new THREE.Group();
    gate.name = 'ladder-gate-landmark';
    const z = p.z + 1.28;
    const gold = new THREE.MeshStandardMaterial({
      color: PALETTE.goldDim,
      emissive: PALETTE.accent,
      emissiveIntensity: 0.65,
      metalness: 0.7,
      roughness: 0.28,
    });
    const dark = new THREE.MeshStandardMaterial({ color: 0x090604, roughness: 1 });

    const doorway = new THREE.Mesh(new THREE.PlaneGeometry(5.2, 5.8), dark);
    doorway.name = 'ladder-dark-doorway';
    doorway.position.set(p.x, 3.0, z + 0.06);
    gate.add(doorway);

    for (const x of [-2.35, 2.35]) {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.3, 5.1, 0.32), gold);
      pillar.position.set(p.x + x, 2.55, z);
      gate.add(pillar);
    }
    for (const [x, angle] of [[-1.18, -0.52], [1.18, 0.52]]) {
      const crown = new THREE.Mesh(new THREE.BoxGeometry(0.28, 2.72, 0.32), gold);
      crown.position.set(p.x + x, 5.35, z);
      crown.rotation.z = angle;
      gate.add(crown);
    }

    // The Ladder itself is unmistakable even before its wayfinding light wakes.
    for (const x of [-0.72, 0.72]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.18, 4.4, 0.22), gold);
      rail.position.set(p.x + x, 2.55, z - 0.18);
      gate.add(rail);
    }
    for (let i = 0; i < 7; i++) {
      const rung = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.15, 0.24), gold);
      rung.position.set(p.x, 0.7 + i * 0.62, z - 0.2);
      gate.add(rung);
    }

    const guidance = new THREE.Group();
    guidance.name = 'ladder-guidance';
    guidance.visible = false;
    const pathMat = new THREE.MeshBasicMaterial({
      color: PALETTE.gold,
      transparent: true,
      opacity: 0.38,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    for (let i = 0; i < 7; i++) {
      const step = new THREE.Mesh(new THREE.PlaneGeometry(1.15, 1.15), pathMat);
      step.name = `ladder-path-${i + 1}`;
      step.rotation.x = -Math.PI / 2;
      step.rotation.z = Math.PI / 4;
      step.position.set(p.x, 0.055, p.z - 1.1 - i * 1.45);
      guidance.add(step);
    }
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.75, 2.0, 6.6, 18, 1, true),
      new THREE.MeshBasicMaterial({
        color: PALETTE.gold,
        transparent: true,
        opacity: 0.12,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    beam.name = 'ladder-light-beam';
    beam.position.set(p.x, 3.3, p.z - 0.15);
    guidance.add(beam);
    const label = makeWayfindingLabel('THE LADDER  ↑');
    label.name = 'ladder-label';
    label.position.set(p.x, 6.05, z - 0.35);
    guidance.add(label);
    gate.add(guidance);
    this.group.add(gate);
    this.ladderGate = gate;
    this.ladderGuidance = guidance;
    this.ladderPathMaterial = pathMat;
  }

  setLadderRevealed(revealed) {
    if (this.ladderGuidance) this.ladderGuidance.visible = !!revealed;
  }

  /** The nobleman's house, sitting on the wall band north of the Gate Court.
   * Faces south so the pilgrim steps out of his door onto the street. */
  addHouse() {
    const g = new THREE.Group();
    g.name = 'noble-house';
    const { x, y, w, h } = HOUSE;
    const cx = (x + w / 2) * CELL;
    const cz = (y + h / 2) * CELL;
    const depth = h * CELL;

    const base = new THREE.Mesh(new THREE.BoxGeometry(w * CELL, 2.5, depth), this.mat.get('stone_wall'));
    base.position.set(cx, 1.25, cz);
    const upper = new THREE.Mesh(
      new THREE.BoxGeometry(w * CELL - 0.4, 2.3, depth - 0.4),
      this.mat.get('plaster'),
    );
    upper.position.set(cx, 4.15, cz);
    const trim = new THREE.Mesh(
      new THREE.BoxGeometry(w * CELL + 0.3, 0.3, depth + 0.3),
      this.mat.get('gold'),
    );
    trim.position.set(cx, 5.35, cz);
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(Math.max(w, h) * CELL * 0.62, 2.4, 4),
      this.mat.get('roof'),
    );
    roof.position.set(cx, 6.8, cz);
    roof.rotation.y = Math.PI / 4;

    // door + window on the south facade (toward the court)
    const door = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 2.2, 0.18),
      new THREE.MeshStandardMaterial({ color: 0x2a1c10, roughness: 1 }),
    );
    door.position.set(cx, 1.7, cz + depth / 2 + 0.05);
    const doorArch = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.3, 0.24),
      this.mat.get('gold'),
    );
    doorArch.position.set(cx, 2.95, cz + depth / 2 + 0.06);
    const winL = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 1.1, 0.16),
      this.mat.get('gold'),
    );
    winL.position.set(cx - 1.9, 3.1, cz + depth / 2 + 0.04);
    const winR = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 1.1, 0.16),
      this.mat.get('gold'),
    );
    winR.position.set(cx + 1.9, 3.1, cz + depth / 2 + 0.04);

    g.add(base, upper, trim, roof, door, doorArch, winL, winR);
    this.group.add(g);
    this.house = g;
  }

  /** Hagia Sophia rises on the wall band south of the Ladder chamber — the
   * destination of the whole walk. The golden Ladder gate stands in front of
   * it, so the pilgrim climbs with the great dome behind. */
  addHagiaSophia() {
    const g = new THREE.Group();
    g.name = 'hagia-sophia-landmark';
    const cx = (HAGIA.x + HAGIA.w / 2) * CELL; // dome centre x
    const cz = (HAGIA.y + 0.5) * CELL;          // dome centre z
    const plaster = this.mat.get('plaster');
    const gold = this.mat.get('gold');

    const podium = new THREE.Mesh(new THREE.BoxGeometry(10.2, 1.2, 4.6), this.mat.get('stone_wall'));
    podium.position.set(cx, 0.6, cz);
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.5, 1.8, 20), plaster);
    drum.position.set(cx, WALL_H + 0.9, cz);
    const drumTrim = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.5, 0.3, 20), gold);
    drumTrim.position.set(cx, WALL_H + 1.7, cz);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(3.6, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), plaster);
    dome.position.set(cx, WALL_H + 1.8, cz);
    const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.5, 0.22), gold);
    crossV.position.set(cx, WALL_H + 5.3, cz);
    const crossH = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.85), gold);
    crossH.position.set(cx, WALL_H + 5.5, cz);

    // flanking semi-domes
    const semiMat = plaster;
    for (const s of [-1, 1]) {
      const semi = new THREE.Mesh(new THREE.SphereGeometry(1.7, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), semiMat);
      semi.position.set(cx + s * 4.1, WALL_H + 1.0, cz);
      g.add(semi);
    }

    // minarets at the four corners of the complex
    for (const m of HAGIA_MINARETS) {
      const mx = m.x * CELL;
      const mz = m.z * CELL;
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.52, 14, 10), plaster);
      shaft.position.set(mx, 7, mz);
      const balcony = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.75, 0.22, 10), gold);
      balcony.position.set(mx, 11.6, mz);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.62, 1.3, 10), this.mat.get('roof'));
      cap.position.set(mx, 14.9, mz);
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.6, 0.1), gold);
      fin.position.set(mx, 15.85, mz);
      g.add(shaft, balcony, cap, fin);
    }

    // grand golden arch doorway on the north face, toward the Ladder gate
    const archFrame = new THREE.Mesh(new THREE.BoxGeometry(5.4, 4.6, 0.35), gold);
    archFrame.position.set(cx, 3.4, cz - 2.32);
    const archDark = new THREE.Mesh(
      new THREE.BoxGeometry(4.0, 3.4, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x0d0a08, roughness: 1 }),
    );
    archDark.position.set(cx, 3.2, cz - 2.5);

    const glow = new THREE.PointLight(PALETTE.gold, 26, 16, 2);
    glow.position.set(cx, 8, cz - 2);
    this.group.add(glow);
    this.trackFlicker(glow, 26);

    g.add(podium, drum, drumTrim, dome, crossV, crossH, archFrame, archDark);
    this.group.add(g);
    this.hagiaSophia = g;
  }

  build() {
    const { grid, cells } = LEVEL;
    const wallGeo = [], colGeo = [], woodGeo = [];
    const corniceGeo = [], roofGeo = [], domeGeo = [], domeCrossGeo = [], towerGeo = [], towerCapGeo = [];

    const isHouse = (x, z) => x >= HOUSE.x && x < HOUSE.x + HOUSE.w && z >= HOUSE.y && z < HOUSE.y + HOUSE.h;
    const inHagia = (x, z) => x >= HAGIA.x && x < HAGIA.x + HAGIA.w && z >= HAGIA.y && z < HAGIA.y + HAGIA.h;
    const inSet = (cells, x, z) => cells.some(([a, b]) => a === x && b === z);

    for (let z = 0; z < MAP_H; z++) {
      for (let x = 0; x < MAP_W; x++) {
        const t = grid[z][x];
        const cx = (x + 0.5) * CELL;
        const cz = (z + 0.5) * CELL;
        switch (t) {
          case '#': {
            this.addCollider(cx, cz, CELL, CELL);
            // The house and Hagia Sophia cover their own cells — no wall mass
            // underneath them (the house mesh is solid; the dome sits on the
            // band), which also avoids coplanar faces z-fighting at their bases.
            if (isHouse(x, z) || inHagia(x, z)) break;
            // Building mass: light plaster facade up to the roofline.
            const g = new THREE.BoxGeometry(CELL, WALL_H, CELL);
            g.translate(cx, WALL_H / 2, cz);
            wallGeo.push(g);
            const kind = inSet(DOME_CELLS, x, z) ? 'dome' : inSet(TOWER_CELLS, x, z) ? 'tower' : roofKind(x, z);
            if (kind === 'dome') {
              const drum = new THREE.CylinderGeometry(1.0, 1.0, 0.7, 10);
              drum.translate(cx, WALL_H + 0.35, cz);
              domeGeo.push(drum);
              const hemis = new THREE.SphereGeometry(1.05, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2);
              hemis.translate(cx, WALL_H + 0.7, cz);
              domeGeo.push(hemis);
              const cv = new THREE.BoxGeometry(0.09, 0.52, 0.09);
              cv.translate(cx, WALL_H + 1.55, cz);
              domeCrossGeo.push(cv);
              const ch = new THREE.BoxGeometry(0.09, 0.09, 0.28);
              ch.translate(cx, WALL_H + 1.63, cz);
              domeCrossGeo.push(ch);
            } else if (kind === 'tower') {
              const shaft = new THREE.BoxGeometry(CELL * 0.7, 4.2, CELL * 0.7);
              shaft.translate(cx, WALL_H + 2.1, cz);
              towerGeo.push(shaft);
              const cap = new THREE.ConeGeometry(0.95, 1.1, 8);
              cap.translate(cx, WALL_H + 4.75, cz);
              towerCapGeo.push(cap);
              const cv = new THREE.BoxGeometry(0.09, 0.55, 0.09);
              cv.translate(cx, WALL_H + 5.6, cz);
              domeCrossGeo.push(cv);
            } else {
              const parapet = new THREE.BoxGeometry(CELL, 1.1, CELL);
              parapet.translate(cx, WALL_H + 0.55, cz);
              roofGeo.push(parapet);
              const cornice = new THREE.BoxGeometry(CELL + 0.42, 0.36, CELL + 0.42);
              cornice.translate(cx, WALL_H + 1.18, cz);
              corniceGeo.push(cornice);
            }
            break;
          }
          case 'c': {
            const g = new THREE.BoxGeometry(CELL * 0.8, WALL_H, CELL * 0.8);
            g.translate(cx, WALL_H / 2, cz);
            colGeo.push(g);
            this.addCollider(cx, cz, CELL * 0.8, CELL * 0.8);
            break;
          }
          case 'F': {
            // fountain in the gate court: stone basin + still water + glow
            const basin = new THREE.Mesh(
              new THREE.CylinderGeometry(1.1, 1.25, 0.7, 10),
              this.mat.get('stone_wall')
            );
            basin.position.set(cx, 0.35, cz);
            const water = new THREE.Mesh(
              new THREE.CylinderGeometry(0.9, 0.9, 0.06, 12),
              new THREE.MeshStandardMaterial({
                color: 0x22445a, emissive: 0x16384a, emissiveIntensity: 0.7, roughness: 0.25, metalness: 0.1,
              })
            );
            water.position.set(cx, 0.72, cz);
            const rim = new THREE.Mesh(
              new THREE.TorusGeometry(1.12, 0.08, 6, 14),
              this.mat.get('gold')
            );
            rim.position.set(cx, 0.72, cz);
            rim.rotation.x = Math.PI / 2;
            this.group.add(basin, water, rim);
            const fl = new THREE.PointLight(0x7fb4d8, 12, 9, 2);
            fl.position.set(cx, 1.6, cz);
            this.group.add(fl);
            this.trackFlicker(fl, 12);
            this.addCollider(cx, cz, 2.3, 2.3, 1.1);
            break;
          }
          case 'w': {
            // pew / bench in the chapel
            const pew = new THREE.Mesh(
              new THREE.BoxGeometry(CELL * 0.9, 0.55, 0.7),
              this.mat.get('wood_floor')
            );
            pew.position.set(cx, 0.28, cz);
            this.group.add(pew);
            this.addCollider(cx, cz, CELL * 0.9, 0.7, 0.6);
            break;
          }
          default: {
            if (t === '_') {
              const g = new THREE.PlaneGeometry(CELL - 0.08, CELL - 0.08);
              g.rotateX(-Math.PI / 2);
              g.translate(cx, 0.03, cz);
              woodGeo.push(g);
            }
            // open air — no ceiling tiles anywhere; the sky dome is the roof
          }
        }
      }
    }

    if (wallGeo.length) {
      const mesh = new THREE.Mesh(mergeGeometries(wallGeo), this.mat.get('plaster'));
      this.group.add(mesh);
      wallGeo.forEach((g) => g.dispose());
    }
    if (colGeo.length) {
      const mesh = new THREE.Mesh(mergeGeometries(colGeo), this.mat.get('stone_wall'));
      this.group.add(mesh);
      colGeo.forEach((g) => g.dispose());
    }
    if (woodGeo.length) {
      const mesh = new THREE.Mesh(mergeGeometries(woodGeo), this.mat.get('wood_floor'));
      this.group.add(mesh);
      woodGeo.forEach((g) => g.dispose());
    }
    if (roofGeo.length) {
      const mesh = new THREE.Mesh(mergeGeometries(roofGeo), this.mat.get('plaster'));
      this.group.add(mesh);
      roofGeo.forEach((g) => g.dispose());
    }
    if (corniceGeo.length) {
      const mesh = new THREE.Mesh(mergeGeometries(corniceGeo), this.mat.get('gold'));
      this.group.add(mesh);
      corniceGeo.forEach((g) => g.dispose());
    }
    if (domeGeo.length) {
      const mesh = new THREE.Mesh(mergeGeometries(domeGeo), this.mat.get('plaster'));
      this.group.add(mesh);
      domeGeo.forEach((g) => g.dispose());
    }
    if (domeCrossGeo.length) {
      const mesh = new THREE.Mesh(mergeGeometries(domeCrossGeo), this.mat.get('gold'));
      this.group.add(mesh);
      domeCrossGeo.forEach((g) => g.dispose());
    }
    if (towerGeo.length) {
      const mesh = new THREE.Mesh(mergeGeometries(towerGeo), this.mat.get('plaster'));
      this.group.add(mesh);
      towerGeo.forEach((g) => g.dispose());
    }
    if (towerCapGeo.length) {
      const mesh = new THREE.Mesh(mergeGeometries(towerCapGeo), this.mat.get('roof'));
      this.group.add(mesh);
      towerCapGeo.forEach((g) => g.dispose());
    }

    // floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(MAP_W * CELL, MAP_H * CELL),
      this.mat.get('stone_floor')
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set((MAP_W * CELL) / 2, 0, (MAP_H * CELL) / 2);
    this.group.add(floor);
    this.mat.get('stone_floor').map.repeat.set(MAP_W, MAP_H);

    // --- lights: daylight sun + warm sky; no candles — it is broad daylight ----
    const hemi = new THREE.HemisphereLight(0xbfd8ef, 0x8a7a5a, 1.0);
    this.group.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff1d6, 2.6);
    sun.position.set(-24, 36, -14);
    this.group.add(sun);

    // --- sky dome: the open-air roof of the whole walk -----------------------
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(75, 24, 12),
      new THREE.MeshBasicMaterial({
        map: makeSkyTexture(),
        side: THREE.BackSide,
        fog: false,
        depthWrite: false,
      }),
    );
    sky.renderOrder = -10;
    sky.position.set((MAP_W * CELL) / 2, 9, (MAP_H * CELL) / 2);
    this.group.add(sky);
    this.skyDome = sky;

    this.addHouse();
    this.addHagiaSophia();

    // --- decor + trigger positions ------------------------------------------------
    for (const [key, t] of cells) {
      const [x, z] = key.split(',').map(Number);
      const p = this.centerOf(x, z);
      switch (t) {
        case 'V': {
          const icon = new AnimatedSprite('banner', 2.6);
          icon.mesh.position.set(p.x, 2.6 / 2 + 0.8 + 0.05, p.z);
          icon.setAnimation('idle', { fps: 2 });
          this.group.add(icon.mesh);
          this.spawns.V.push(icon);
          this.animSprites.push(icon);
          break;
        }
        default: {
          if (this.spawns[t]) this.spawns[t].push(p.clone());
        }
      }
    }

    // gold trim on the Ladder gate (decorative, non-solid)
    const gateLight = new THREE.PointLight(PALETTE.gold, 18, 14, 2);
    gateLight.position.copy(this.spawns.L[0]);
    gateLight.position.y = 2.2;
    this.group.add(gateLight);
    this.gateLight = gateLight;
    this.addLadderGate();

    // the elder sits in candle-light so he is plainly visible
    const pastoral = new THREE.Group();
    pastoral.name = 'pastoral-landmarks';
    if (this.spawns.E.length) {
      const elderLight = new THREE.PointLight(0xffb45e, 30, 8, 2);
      elderLight.position.copy(this.spawns.E[0]);
      elderLight.position.y = 1.8;
      this.group.add(elderLight);
      this.trackFlicker(elderLight, 30);

      const elder = new AnimatedSprite('elder', 2.55);
      elder.mesh.position.copy(this.spawns.E[0]);
      elder.mesh.position.y = 1.32;
      elder.setAnimation('idle', { fps: 6 });
      const elderShadow = new AnimatedSprite('shadow', 1.45);
      elderShadow.mesh.position.copy(this.spawns.E[0]);
      elderShadow.mesh.position.y = 0.06;
      elderShadow.setAnimation('idle');
      elder.mesh.name = 'elder-visible';
      elderShadow.mesh.name = 'elder-shadow';
      pastoral.add(elder.mesh, elderShadow.mesh);
      this.animSprites.push(elder, elderShadow);
      this.elder = elder;
      this.addCollider(this.spawns.E[0].x, this.spawns.E[0].z, 0.8, 0.8, 2.4);
    }

    if (this.spawns.A.length) {
      const p = this.spawns.A[0];
      const altar = new THREE.Group();
      altar.name = 'confession-altar';
      const base = new THREE.Mesh(
        new THREE.BoxGeometry(1.35, 0.78, 2.35),
        this.mat.get('stone_wall'),
      );
      base.position.set(p.x, 0.39, p.z);
      const top = new THREE.Mesh(
        new THREE.BoxGeometry(1.48, 0.12, 2.5),
        this.mat.get('gold'),
      );
      top.position.set(p.x, 0.84, p.z);
      const crossVertical = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 1.25, 0.14),
        this.mat.get('gold'),
      );
      crossVertical.position.set(p.x, 1.55, p.z);
      const crossHorizontal = new THREE.Mesh(
        new THREE.BoxGeometry(0.13, 0.14, 0.82),
        this.mat.get('gold'),
      );
      crossHorizontal.position.set(p.x, 1.68, p.z);
      const rug = new THREE.Mesh(
        new THREE.PlaneGeometry(4.2, 2.4),
        this.mat.get('icon'),
      );
      rug.rotation.x = -Math.PI / 2;
      rug.rotation.z = Math.PI / 2;
      rug.position.set(p.x - 2.4, 0.045, p.z);
      altar.add(base, top, crossVertical, crossHorizontal, rug);

      const altarLight = new THREE.PointLight(PALETTE.gold, 32, 9, 2);
      altarLight.position.set(p.x - 0.45, 2.0, p.z);
      this.group.add(altarLight);
      this.trackFlicker(altarLight, 32);
      pastoral.add(altar);
      this.altar = altar;
      this.addCollider(p.x, p.z, 1.35, 2.35, 0.9);
    }
    this.group.add(pastoral);
    this.pastoralLandmarks = pastoral;

    // the three thresholds wait visibly in their rooms, so the pilgrim sees
    // who is coming before stumbling into the encounter
    const spots = { tempter: [6, 17], brother: [19, 17], pride: [29, 16] };
    const heights = { tempter: 2.0, brother: 2.2, pride: 3.0 };
    for (const [id, [gx, gz]] of Object.entries(spots)) {
      const p = this.centerOf(gx, gz);
      const h = heights[id];
      const spr = new AnimatedSprite(id, h);
      spr.mesh.position.set(p.x, h / 2 + 0.05, p.z);
      spr.setAnimation('idle', { fps: 7 });
      this.group.add(spr.mesh);
      const sh = new AnimatedSprite('shadow', 1);
      sh.size = h * 0.8;
      sh.mesh.position.set(p.x, 0.06, p.z);
      sh.setAnimation('idle');
      this.group.add(sh.mesh);
      this.worldEnemies[id] = { sprite: spr, shadow: sh };
      this.animSprites.push(spr, sh);
    }

    this.addThresholdStorytelling();

    return this.spawns;
  }

  /** Flicker candle lights + face world billboards toward the camera every frame. */
  update(dt, time, camera) {
    for (let i = 0; i < this.candleLights.length; i++) {
      const l = this.candleLights[i];
      const base = l.userData.flickerBase ?? 20;
      l.intensity = base * (1 + Math.sin(time * 11 + i * 2.7) * 0.08 + Math.sin(time * 27 + i * 5.1) * 0.04);
    }
    if (this.ladderGuidance?.visible && this.ladderPathMaterial) {
      this.ladderPathMaterial.opacity = 0.32 + Math.sin(time * 2.4) * 0.1;
    }
    // the Ladder gate shines brighter as grace grows (set externally)
    if (camera) {
      for (const s of this.animSprites) s.update(dt, camera);
    }
  }

  raycast(ox, oy, oz, dx, dy, dz, maxT) {
    let best = maxT;
    for (const c of this.colliders) {
      let tmin = 0, tmax = maxT;
      if (Math.abs(dx) < 1e-9) { if (ox < c.minX || ox > c.maxX) continue; }
      else {
        let t1 = (c.minX - ox) / dx, t2 = (c.maxX - ox) / dx;
        if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
        tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
        if (tmin > tmax) continue;
      }
      if (Math.abs(dy) < 1e-9) { if (oy < 0 || oy > c.top) continue; }
      else {
        let t1 = (0 - oy) / dy, t2 = (c.top - oy) / dy;
        if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
        tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
        if (tmin > tmax) continue;
      }
      if (Math.abs(dz) < 1e-9) { if (oz < c.minZ || oz > c.maxZ) continue; }
      else {
        let t1 = (c.minZ - oz) / dz, t2 = (c.maxZ - oz) / dz;
        if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
        tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
        if (tmin > tmax) continue;
      }
      if (tmin < best) best = tmin;
    }
    return best;
  }

  collideCircle(px, pz, radius, out) {
    for (const c of this.colliders) {
      const nx = Math.max(c.minX, Math.min(px, c.maxX));
      const nz = Math.max(c.minZ, Math.min(pz, c.maxZ));
      const ddx = px - nx, ddz = pz - nz;
      const d2 = ddx * ddx + ddz * ddz;
      if (d2 >= radius * radius) continue;
      const d = Math.sqrt(d2);
      if (d < 1e-6) {
        const pl = px - c.minX, pr = c.maxX - px;
        const pb = pz - c.minZ, pt = c.maxZ - pz;
        const m = Math.min(pl, pr, pb, pt);
        if (m === pl) out.x = c.minX - radius;
        else if (m === pr) out.x = c.maxX + radius;
        else if (m === pb) out.z = c.minZ - radius;
        else out.z = c.maxZ + radius;
      } else {
        const push = (radius - d) / d;
        out.x = px + ddx * push;
        out.z = pz + ddz * push;
      }
      return true;
    }
    return false;
  }
}
