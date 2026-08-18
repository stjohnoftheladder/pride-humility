// PBR material loader — same pipeline as wizard-castle, byzantine palette.
import * as THREE from 'three';

const loader = new THREE.TextureLoader();
const SETS = ['stone_wall', 'stone_floor', 'wood_floor', 'gold', 'icon', 'brick', 'wax_emissive'];

function loadMap(name, kind, opts = {}) {
  const tex = loader.load(`assets/textures/${name}_${kind}.png`);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  if (opts.srgb) tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class Materials {
  constructor() {
    this.byName = {};
  }

  load() {
    for (const name of SETS) {
      const maps = {
        map: loadMap(name, 'albedo', { srgb: true }),
        normalMap: loadMap(name, 'normal'),
        roughnessMap: loadMap(name, 'roughness'),
        metalnessMap: loadMap(name, 'metalness'),
        aoMap: loadMap(name, 'ao'),
      };
      this.byName[name] = new THREE.MeshStandardMaterial({
        roughness: 1,
        metalness: 0,
        ...maps,
      });
    }
  }

  get(name) {
    return this.byName[name];
  }
}
