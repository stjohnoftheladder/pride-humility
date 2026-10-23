import * as THREE from 'three';

export class PilgrimAvatars {
  constructor(parent) { this.group = new THREE.Group(); this.group.name = 'visiting-pilgrims'; parent.add(this.group); this.actors = new Map(); }
  create(peer) {
    const group = new THREE.Group(); group.name = `player:${peer.id}`;
    let hash = 0; for (const c of peer.id) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
    const robe = new THREE.MeshLambertMaterial({ color: new THREE.Color().setHSL((hash % 360) / 360, 0.36, 0.42) });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.36, 1.05, 7), robe); body.position.y = 0.65;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.19, 8, 6), new THREE.MeshLambertMaterial({ color: 0xd3ae87 })); head.position.y = 1.36;
    const hood = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.27, 7), robe); hood.position.set(0, 1.61, 0.02);
    const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.55, 5), new THREE.MeshLambertMaterial({ color: 0x936238 })); staff.position.set(0.43, 0.78, -0.12);
    const label = document.createElement('canvas'); label.width = 512; label.height = 64;
    const ink = label.getContext('2d'); ink.fillStyle = '#120d07df'; ink.fillRect(0, 0, 512, 64);
    ink.fillStyle = '#f3d276'; ink.font = 'bold 27px monospace'; ink.textAlign = 'center'; ink.fillText(peer.name, 256, 41);
    const texture = new THREE.CanvasTexture(label);
    const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: true })); tag.scale.set(3, 0.375, 1); tag.position.y = 2.05;
    group.add(body, head, hood, staff, tag); group.position.set(peer.x, 0, peer.z);
    this.group.add(group); this.actors.set(peer.id, { group, peer }); return this.actors.get(peer.id);
  }
  update(peers, dt, time) {
    for (const [id, actor] of this.actors) if (!peers.has(id)) {
      actor.group.traverse(object => {
        object.geometry?.dispose(); if (!object.material) return;
        object.material.map?.dispose(); object.material.dispose();
      });
      this.group.remove(actor.group); this.actors.delete(id);
    }
    for (const peer of peers.values()) {
      const actor = this.actors.get(peer.id) ?? this.create(peer), group = actor.group;
      const moving = Math.hypot(group.position.x - peer.x, group.position.z - peer.z) > 0.08;
      const t = 1 - Math.exp(-12 * dt);
      group.position.x += (peer.x - group.position.x) * t; group.position.z += (peer.z - group.position.z) * t;
      group.position.y = moving ? Math.sin(time * 8) * 0.035 : 0;
      group.rotation.y = peer.yaw;
      actor.peer = peer;
    }
  }
}
