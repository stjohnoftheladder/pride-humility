// Small procedural interpretations of the Byzantium 1200 references in config.
// All ground obstacles belong to the site's existing feature switch. Geometry
// is merged by material so the longer street does not add hundreds of draws.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CELL } from './config.js';

export function buildRoadSite(level, site, group) {
  const { x, y, w, h } = site.area;
  const cx = (x + w / 2) * CELL, cz = (y + h / 2) * CELL;
  const width = w * CELL, depth = h * CELL;
  const batches = new Map();
  function shape(geometry, material, px, py, pz, rotateY = 0, rotateZ = 0) {
    geometry.rotateZ(rotateZ);
    geometry.rotateY(rotateY);
    geometry.translate(px, py, pz);
    if (!batches.has(material)) batches.set(material, []);
    batches.get(material).push(geometry);
  }
  function box(px, py, pz, bw, bh, bd, mat = 'plaster', solid = false) {
    shape(new THREE.BoxGeometry(bw, bh, bd), mat, px, py, pz);
    if (solid) level.addCollider(px, pz, bw, bd, py + bh / 2, site.id);
  }
  function column(px, pz, height = 5, radius = 0.4) {
    shape(new THREE.CylinderGeometry(radius, radius * 1.12, height, 10), 'plaster', px, height / 2, pz);
    box(px, height + 0.15, pz, radius * 3, 0.3, radius * 3, 'gold');
    level.addCollider(px, pz, radius * 2.4, radius * 2.4, height + 0.3, site.id);
  }
  function cross(px, py, pz) {
    box(px, py, pz, 0.18, 1.5, 0.18, 'gold');
    box(px, py + 0.2, pz, 0.18, 0.18, 0.95, 'gold');
  }
  box(cx, 0.035, cz, width - 1, 0.07, depth - 1, 'stone_floor');

  if (site.kind === 'aqueduct') {
    const spans = 4, step = 4.8, start = cz - spans * step / 2;
    for (let tier = 0; tier < 2; tier++) {
      const base = tier * 6;
      for (let i = 0; i <= spans; i++) {
        box(cx, base + 2, start + i * step, 2.1, 4, 1.1, 'stone_wall', tier === 0);
      }
      for (let i = 0; i < spans; i++) {
        shape(new THREE.TorusGeometry(step / 2, 0.5, 6, 12, Math.PI),
          'stone_wall', cx, base + 3.7, start + (i + 0.5) * step, Math.PI / 2);
      }
      box(cx, base + 6, cz, 2.4, 0.65, spans * step + 1.2, 'stone_wall');
    }
    box(cx - 0.95, 12.65, cz, 0.35, 0.8, 20.4, 'brick');
    box(cx + 0.95, 12.65, cz, 0.35, 0.8, 20.4, 'brick');
  } else if (site.kind === 'monastery') {
    // Joined churches along the far side, leaving a generous road-facing court.
    for (let i = -1; i <= 1; i++) {
      const z = cz + i * 6, height = i === 0 ? 6.5 : 8;
      box(cx + 5, height / 2, z, 12, height, 5.7, 'brick', true);
      box(cx + 5, height - 0.2, z, 12.4, 0.35, 6, 'plaster');
      shape(new THREE.CylinderGeometry(2.3, 2.5, 1.8, 16), 'plaster', cx + 5, height + 0.9, z);
      shape(new THREE.SphereGeometry(2.6, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), 'brick', cx + 5, height + 1.8, z);
      cross(cx + 5, height + 4.9, z);
      // Dark recessed openings face west, toward the pilgrim.
      box(cx - 1.06, 2, z, 0.08, 4, 1.5, 'wood_floor');
    }
    for (let i = -2; i <= 2; i++) column(cx - 5, cz + i * 4, 4.4);
    box(cx - 5, 4.8, cz, 1.4, 0.45, 18, 'brick');
  } else if (site.kind === 'forum') {
    shape(new THREE.CylinderGeometry(10.7, 10.7, 0.12, 32), 'plaster', cx, 0.1, cz);
    // The eastern opening faces the road. The centre remains walkable around
    // the column base, with no collisions extending into the main road.
    for (let i = 2; i <= 14; i++) {
      const a = i * Math.PI * 2 / 16;
      column(cx + Math.cos(a) * 10, cz + Math.sin(a) * 10, 5.7);
    }
    box(cx, 0.6, cz, 3.4, 1.2, 3.4, 'stone_wall', true);
    shape(new THREE.CylinderGeometry(0.85, 1.05, 10, 16), 'brick', cx, 6.2, cz);
    for (let i = 0; i < 6; i++) {
      shape(new THREE.CylinderGeometry(1.08, 1.08, 0.18, 16), 'gold', cx, 1.6 + i * 1.8, cz);
    }
    box(cx, 11.4, cz, 2.4, 0.6, 2.4, 'plaster');
    cross(cx, 12.5, cz);
  } else if (site.kind === 'basilica') {
    box(cx + 5, 3.5, cz, 12, 7, 17, 'brick', true);
    box(cx + 5, 7, cz, 12.6, 0.4, 17.6, 'plaster');
    // A triangular prism gives Stoudios a timber basilica silhouette, not a dome.
    const roof = new THREE.Shape();
    roof.moveTo(-7, 0); roof.lineTo(0, 3); roof.lineTo(7, 0); roof.closePath();
    shape(new THREE.ExtrudeGeometry(roof, { depth: 18, bevelEnabled: false }), 'brick', cx + 5, 7.2, cz - 9);
    for (let i = -2; i <= 2; i++) column(cx - 4, cz + i * 3.6, 4.8);
    box(cx - 4, 5.1, cz, 2, 0.6, 17, 'plaster');
    for (const z of [cz - 5, cz, cz + 5]) box(cx - 1.08, 2.2, z, 0.1, 4.4, 1.7, 'wood_floor');
    cross(cx + 5, 11, cz);
  } else if (site.kind === 'hippodrome') {
    // The real course ran north to south: starting gates (carceres) at the
    // straight north end, the curved sphendone at the south, and the emperor's
    // Kathisma on the long side toward the Great Palace. Turned here so the
    // straight end with its gates faces the road and the Kathisma takes the
    // southern stands, the side the palace lies on in this map. The spina
    // carries the monuments as they stood in 1200, before the Crusaders
    // stripped them in 1204.
    const x0 = x * CELL;
    const half = 7.5;                      // the track's half-width
    const tiers = 5, tierDepth = 1.1, tierRise = 0.8;
    const curveX = x0 + 14;                // centre of the sphendone's curve
    const standEnd = 38;                   // the long stands stop short of the gates
    const gateX = 40.5;                    // the carceres, with the forecourt off the road
    const top = tiers * tierRise;
    for (let t = 0; t < tiers; t++) {
      const rise = (t + 1) * tierRise, r = half + tierDepth / 2 + t * tierDepth;
      for (const sign of [-1, 1]) {
        box((curveX + standEnd) / 2, rise / 2, cz + sign * r, standEnd - curveX, rise, tierDepth, 'plaster', true);
      }
      // The sphendone: the same tiers swept round the curved end.
      const n = 12, len = 2 * r * Math.sin(Math.PI / (2 * n)) * 1.08;
      for (let i = 0; i < n; i++) {
        const a = Math.PI / 2 + (i + 0.5) * Math.PI / n;
        const px = curveX + Math.cos(a) * r, pz = cz + Math.sin(a) * r;
        shape(new THREE.BoxGeometry(tierDepth, rise, len), 'plaster', px, rise / 2, pz, -a);
        const c = Math.abs(Math.cos(a)), s = Math.abs(Math.sin(a));
        level.addCollider(px, pz, c * tierDepth + s * len, s * tierDepth + c * len, rise, site.id);
      }
    }
    // A colonnade crowns the stands, round the curve and down both sides.
    const crown = half + tiers * tierDepth + 0.4;
    function crownColumn(px, pz) {
      shape(new THREE.CylinderGeometry(0.18, 0.2, 2.8, 8), 'plaster', px, top + 1.4, pz);
    }
    const kx = 30;   // the Kathisma's centre, where the south colonnade gives way to it
    for (let px = curveX; px <= standEnd; px += 3) {
      crownColumn(px, cz - crown);
      if (Math.abs(px - kx) > 3.6) crownColumn(px, cz + crown);
    }
    for (const sign of [-1, 1]) box((curveX + standEnd) / 2, top + 2.95, cz + sign * crown, standEnd - curveX, 0.3, 0.6, 'gold');
    for (let i = 1; i < 12; i++) {
      const a = Math.PI / 2 + i * Math.PI / 12;
      crownColumn(curveX + Math.cos(a) * crown, cz + Math.sin(a) * crown);
    }
    for (let i = 0; i < 12; i++) {
      const a = Math.PI / 2 + (i + 0.5) * Math.PI / 12;
      const len = 2 * crown * Math.sin(Math.PI / 24) * 1.05;
      shape(new THREE.BoxGeometry(0.6, 0.3, len), 'gold',
        curveX + Math.cos(a) * crown, top + 2.95, cz + Math.sin(a) * crown, -a);
    }

    // The Kathisma: the imperial lodge, reached from the palace behind it.
    const kz0 = cz + half + 0.1, kz1 = cz + half + tiers * tierDepth + 0.4;
    const kh = top + 0.4, kzc = (kz0 + kz1) / 2;
    box(kx, kh / 2, kzc, 6.4, kh, kz1 - kz0, 'stone_wall', true);
    box(kx, kh + 1.5, kz1 - 0.3, 6.4, 3, 0.4, 'brick');
    for (let i = 0; i < 4; i++) {
      shape(new THREE.CylinderGeometry(0.22, 0.25, 3, 10), 'plaster', kx - 2.7 + i * 1.8, kh + 1.5, kz0 + 0.5);
    }
    box(kx, kh + 3.15, kzc, 6.8, 0.3, kz1 - kz0 + 0.3, 'gold');
    shape(new THREE.ConeGeometry(4.4, 1.6, 4), 'roof', kx, kh + 4.1, kzc, Math.PI / 4);
    shape(new THREE.SphereGeometry(0.35, 10, 8), 'gold', kx, kh + 5.1, kzc);

    // The spina (euripos), with a turning post (meta) of three cones at each end.
    const spA = 21.5, spB = 37.5, spH = 0.9;
    box((spA + spB) / 2, spH / 2, cz, spB - spA, spH, 2.2, 'stone_wall', true);
    box((spA + spB) / 2, spH + 0.07, cz, spB - spA + 0.2, 0.14, 2.4, 'plaster');
    for (const mx of [spA - 1, spB + 1]) {
      shape(new THREE.CylinderGeometry(1.3, 1.4, 1.1, 16), 'stone_wall', mx, 0.55, cz);
      level.addCollider(mx, cz, 2.8, 2.8, 1.1, site.id);
      for (const dz of [-0.75, 0, 0.75]) {
        shape(new THREE.ConeGeometry(0.35, 3.4, 10), 'gold', mx, 2.8, cz + dz);
      }
    }
    // The Walled Obelisk, still sheathed in the gilded bronze plates Constantine
    // VII gave it, the tallest thing on the spina.
    box(23, spH + 0.5, cz, 2, 1, 2, 'stone_wall');
    shape(new THREE.CylinderGeometry(0.45, 0.95, 12, 4), 'gold', 23, spH + 7, cz, Math.PI / 4);
    // A gilded Victory on a column.
    shape(new THREE.CylinderGeometry(0.25, 0.3, 4, 10), 'plaster', 25.3, spH + 2, cz);
    shape(new THREE.CapsuleGeometry(0.22, 0.7, 4, 8), 'gold', 25.3, spH + 4.6, cz);
    for (const sign of [-1, 1]) {
      shape(new THREE.BoxGeometry(0.1, 0.9, 0.5).rotateX(sign * 0.5), 'gold', 25.3, spH + 4.9, cz + sign * 0.35);
    }
    // The Serpent Column from Delphi: three bronze snakes twisted together,
    // their heads holding up a tripod bowl.
    box(27.5, spH + 0.3, cz, 1.3, 0.6, 1.3, 'stone_wall');
    for (let k = 0; k < 3; k++) {
      const points = [];
      for (let i = 0; i <= 24; i++) {
        const t = i / 24, a = k * Math.PI * 2 / 3 + t * Math.PI * 6;
        points.push(new THREE.Vector3(Math.cos(a) * 0.28, t * 4.4, Math.sin(a) * 0.28));
      }
      shape(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 48, 0.13, 6), 'gold', 27.5, spH + 0.6, cz);
      const a = k * Math.PI * 2 / 3;
      shape(new THREE.SphereGeometry(0.2, 8, 6), 'gold', 27.5 + Math.cos(a) * 0.55, spH + 5.15, cz + Math.sin(a) * 0.55);
    }
    shape(new THREE.CylinderGeometry(0.85, 0.35, 0.45, 14), 'gold', 27.5, spH + 5.55, cz);
    // A bronze Herakles, one of the many statues gathered onto the spina.
    box(30, spH + 0.7, cz, 1, 1.4, 1, 'stone_wall');
    shape(new THREE.CapsuleGeometry(0.32, 1.1, 4, 8), 'gold', 30, spH + 2.4, cz);
    shape(new THREE.SphereGeometry(0.24, 10, 8), 'gold', 30, spH + 3.45, cz);
    // The Obelisk of Theodosius: Thutmose III's red granite from Karnak, set on
    // four bronze blocks above a marble base carved with the emperor in the
    // Kathisma.
    box(32.8, spH + 0.6, cz, 2.2, 1.2, 2.2, 'plaster');
    box(32.8, spH + 1.9, cz, 1.8, 1.4, 1.8, 'plaster');
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      box(32.8 + sx * 0.55, spH + 2.78, cz + sz * 0.55, 0.36, 0.36, 0.36, 'gold');
    }
    shape(new THREE.CylinderGeometry(0.32, 0.62, 7, 4), 'brick', 32.8, spH + 6.46, cz, Math.PI / 4);
    shape(new THREE.ConeGeometry(0.32, 0.6, 4), 'brick', 32.8, spH + 10.26, cz, Math.PI / 4);
    // The lap counter: seven bronze dolphins, one turned down for each lap.
    for (const px of [35, 37]) {
      shape(new THREE.CylinderGeometry(0.1, 0.12, 3, 8), 'gold', px, spH + 1.5, cz);
    }
    box(36, spH + 3.05, cz, 2.4, 0.16, 0.3, 'gold');
    for (let i = 0; i < 7; i++) {
      shape(new THREE.BoxGeometry(0.2, 0.45, 0.18), 'gold', 35.1 + i * 0.3, spH + 3.35, cz, 0, 0.5);
    }

    // The carceres: arched starting stalls facing the road, open for walking
    // through, with a tower at each end and the gilded quadriga on top.
    const piers = [-7.2, -4.8, -2.4, 0, 2.4, 4.8, 7.2];
    for (const dz of piers) box(gateX, 1.65, cz + dz, 1, 3.3, 0.6, 'plaster', true);
    for (let i = 0; i < piers.length - 1; i++) {
      shape(new THREE.TorusGeometry(0.9, 0.22, 6, 12, Math.PI), 'plaster',
        gateX, 3.3, cz + (piers[i] + piers[i + 1]) / 2, Math.PI / 2);
    }
    box(gateX, 4.4, cz, 1.2, 1.8, half * 2 + 0.6, 'plaster');
    box(gateX, 5.4, cz, 1.4, 0.2, half * 2 + 0.8, 'gold');
    for (const sign of [-1, 1]) {
      box(gateX, 3.6, cz + sign * 9.6, 3, 7.2, 3, 'brick', true);
      box(gateX, 7.3, cz + sign * 9.6, 3.3, 0.25, 3.3, 'plaster');
      shape(new THREE.ConeGeometry(2.2, 1.6, 4), 'roof', gateX, 8.2, cz + sign * 9.6, Math.PI / 4);
    }
    const base = 5.5;
    box(gateX, base + 0.3, cz, 2.4, 0.6, 3.2, 'stone_wall');
    for (const dz of [-1.05, -0.35, 0.35, 1.05]) {
      // Four gilded horses walking out toward the road, as they stand in Venice now.
      const hz = cz + dz, hb = base + 0.6;
      for (const lx of [-0.42, 0.42]) for (const lz of [-0.14, 0.14]) {
        box(gateX + lx, hb + 0.38, hz + lz, 0.12, 0.76, 0.12, 'gold');
      }
      box(gateX, hb + 1.0, hz, 1.25, 0.5, 0.42, 'gold');
      shape(new THREE.BoxGeometry(0.28, 0.72, 0.26), 'gold', gateX + 0.66, hb + 1.42, hz, 0, -0.5);
      shape(new THREE.BoxGeometry(0.5, 0.22, 0.22), 'gold', gateX + 0.95, hb + 1.74, hz, 0, -0.35);
    }
  } else if (site.kind === 'mosaicCourt') {
    for (let i = -2; i <= 2; i++) {
      for (const sign of [-1, 1]) column(cx + i * 4.5, cz + sign * 8, 5.3);
    }
    for (const sign of [-1, 1]) box(cx, 5.6, cz + sign * 8, 21, 0.5, 1.1, 'plaster');
    for (let ix = -4; ix <= 4; ix++) {
      for (let iz = -2; iz <= 2; iz++) {
        box(cx + ix * 2, 0.095, cz + iz * 2, 1.7, 0.04, 1.7, (ix + iz) % 2 === 0 ? 'brick' : 'gold');
      }
    }
    for (let i = 0; i <= 8; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 8;
      box(cx + 10 + Math.cos(a) * 4, 2, cz + Math.sin(a) * 4, 1.3, 4, 1.5, 'brick', true);
    }
  }
  for (const [material, geometries] of batches) {
    // Some primitive types carry UVs/normals with different indexing; merging
    // non-indexed geometry makes the material batches consistent.
    const plain = geometries.map((g) => g.index ? g.toNonIndexed() : g);
    const mesh = new THREE.Mesh(mergeGeometries(plain), level.mat.get(material));
    mesh.name = `${site.id}-${material}`;
    mesh.castShadow = true; mesh.receiveShadow = true;
    group.add(mesh);
    for (const geometry of new Set([...geometries, ...plain])) geometry.dispose();
  }
}
