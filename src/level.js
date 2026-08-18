// Pilgrimage level construction: geometry, collision, candle lights, triggers.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { LEVEL, CELL, WALL_H, MAP_W, MAP_H, PALETTE } from './config.js';
import { Materials } from './textures.js';
import { AnimatedSprite } from './SpriteSystem.js';

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
    this.spawns = { S: [], E: [], A: [], K: [], B: [], P: [], L: [], T: [], V: [], c: [] };
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

  build() {
    const { grid, cells } = LEVEL;
    const wallGeo = [], colGeo = [], ceilGeo = [], woodGeo = [];

    const court = LEVEL.rooms.court;
    const isOpen = (x, z) =>
      x >= court.x && x < court.x + court.w && z >= court.y && z < court.y + court.h;

    for (let z = 0; z < MAP_H; z++) {
      for (let x = 0; x < MAP_W; x++) {
        const t = grid[z][x];
        const cx = (x + 0.5) * CELL;
        const cz = (z + 0.5) * CELL;
        switch (t) {
          case '#': {
            const g = new THREE.BoxGeometry(CELL, WALL_H, CELL);
            g.translate(cx, WALL_H / 2, cz);
            wallGeo.push(g);
            this.addCollider(cx, cz, CELL, CELL);
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
            if (!isOpen(x, z)) {
              const g = new THREE.PlaneGeometry(CELL, CELL);
              g.rotateX(Math.PI / 2);
              g.translate(cx, WALL_H, cz);
              ceilGeo.push(g);
            }
          }
        }
      }
    }

    if (wallGeo.length) {
      const mesh = new THREE.Mesh(mergeGeometries(wallGeo), this.mat.get('stone_wall'));
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
    if (ceilGeo.length) {
      const mesh = new THREE.Mesh(
        mergeGeometries(ceilGeo),
        new THREE.MeshStandardMaterial({ color: 0x171008, roughness: 1 })
      );
      this.group.add(mesh);
      ceilGeo.forEach((g) => g.dispose());
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

    // --- lights: warm candle pools + dim blue night ambient ---------------------
    const hemi = new THREE.HemisphereLight(0x3a4a7a, 0x141008, 0.95);
    this.group.add(hemi);
    const moonlight = new THREE.DirectionalLight(0xcbb98a, 2.2);
    moonlight.position.set(-20, 30, -10);
    this.group.add(moonlight);

    // --- decor + trigger positions ------------------------------------------------
    for (const [key, t] of cells) {
      const [x, z] = key.split(',').map(Number);
      const p = this.centerOf(x, z);
      switch (t) {
        case 'T': {
          const candle = new AnimatedSprite('torch', 1.25);
          candle.mesh.position.set(p.x, 1.25 / 2 + 0.05, p.z);
          candle.setAnimation('idle', { fps: 9 });
          this.group.add(candle.mesh);
          this.spawns.T.push(candle);
          this.animSprites.push(candle);
          const light = new THREE.PointLight(0xffb45e, 28, 11, 2);
          light.position.set(p.x, 2.0, p.z);
          this.group.add(light);
          this.trackFlicker(light, 28);
          break;
        }
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

      for (const dz of [-0.72, 0.72]) {
        const candle = new THREE.Mesh(
          new THREE.CylinderGeometry(0.07, 0.08, 0.48, 8),
          this.mat.get('wax_emissive'),
        );
        candle.position.set(p.x - 0.35, 1.13, p.z + dz);
        altar.add(candle);
      }
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
