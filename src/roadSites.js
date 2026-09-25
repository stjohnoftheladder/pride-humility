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
    // Stands on three sides; the open eastern side connects to the road.
    for (let tier = 0; tier < 4; tier++) {
      const rise = (tier + 1) * 0.9, inset = tier * 1.1;
      box(x * CELL + 5 - inset, rise / 2, cz, 1.1, rise, depth - 2, 'plaster', true);
      for (const sign of [-1, 1]) {
        box(cx - 2, rise / 2, cz + sign * (depth / 2 - 5 + inset), width - 7, rise, 1.1, 'plaster', true);
      }
    }
    box(cx, 0.35, cz, 2, 0.7, 12, 'stone_wall', true);
    for (const sign of [-1, 1]) {
      shape(new THREE.CylinderGeometry(0.2, 0.7, 6, 4), 'plaster', cx, 3.7, cz + sign * 3.6);
    }
    shape(new THREE.CylinderGeometry(0.2, 0.3, 3, 8), 'gold', cx, 2.2, cz);
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
