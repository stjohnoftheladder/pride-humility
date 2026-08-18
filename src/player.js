// First-person pilgrim controller: pointer-lock look, WASD movement, collision.
// No combat — exploration only.
import * as THREE from 'three';
import {
  PLAYER_R, VIEW_H, GRAVITY, JUMP_V, WALK_SPEED, RUN_SPEED, ACCEL, FRICTION,
} from './config.js';

export class Player {
  constructor(camera, domElement, level) {
    this.camera = camera;
    this.domElement = domElement;
    this.level = level;
    this.pos = new THREE.Vector3();
    this.vel = new THREE.Vector3();
    this.onGround = false;
    this.keys = {};
  }

  setStart(pos) {
    this.pos.copy(pos);
    this.pos.y = 0;
    this.camera.position.set(pos.x, VIEW_H, pos.z);
    this.vel.set(0, 0, 0);
  }

  /** Forget all held keys (called when entering/leaving a battle, so a key
   *  released during the battle can't leave the pilgrim walking forever). */
  clearKeys() {
    this.keys = {};
  }

  /** Request pointer lock without letting a browser rejection become an
   * unhandled console error. Returns whether the request was accepted. */
  async lock() {
    if (!this.domElement?.requestPointerLock) return false;
    try {
      const result = this.domElement.requestPointerLock();
      if (result?.then) await result;
      return true;
    } catch {
      return false;
    }
  }
  unlock() {
    if (document.pointerLockElement === this.domElement) document.exitPointerLock();
  }

  onKey(e, down) {
    const k = e.code;
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'ShiftLeft', 'ShiftRight'].includes(k)) {
      this.keys[k] = down;
      if (k === 'Space' && down) e.preventDefault();
    }
  }

  update(dt) {
    const camera = this.camera;
    const fwd = new THREE.Vector3();
    camera.getWorldDirection(fwd);
    fwd.y = 0;
    fwd.normalize();
    const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();

    let wx = 0, wz = 0;
    if (this.keys.KeyW) { wx += fwd.x; wz += fwd.z; }
    if (this.keys.KeyS) { wx -= fwd.x; wz -= fwd.z; }
    if (this.keys.KeyA) { wx -= right.x; wz -= right.z; }
    if (this.keys.KeyD) { wx += right.x; wz += right.z; }
    const len = Math.hypot(wx, wz);
    if (len > 0) { wx /= len; wz /= len; }
    const run = this.keys.ShiftLeft || this.keys.ShiftRight;
    const maxSpeed = run ? RUN_SPEED : WALK_SPEED;
    const k = 1 - Math.exp(-(len > 0 ? ACCEL : FRICTION) * dt);
    this.vel.x += (wx * maxSpeed - this.vel.x) * k;
    this.vel.z += (wz * maxSpeed - this.vel.z) * k;

    this.vel.y -= GRAVITY * dt;
    if (this.keys.Space && this.onGround) {
      this.vel.y = JUMP_V;
      this.onGround = false;
    }

    let nx = this.pos.x + this.vel.x * dt;
    let nz = this.pos.z + this.vel.z * dt;
    let ny = this.pos.y + this.vel.y * dt;
    if (ny < 0) { ny = 0; this.vel.y = 0; this.onGround = true; }
    else this.onGround = false;

    const out = { x: nx, z: nz };
    for (let i = 0; i < 3; i++) {
      if (!this.level.collideCircle(out.x, out.z, PLAYER_R, out)) break;
    }
    if (Math.abs(out.x - nx) > 1e-4) this.vel.x *= 0.4;
    if (Math.abs(out.z - nz) > 1e-4) this.vel.z *= 0.4;
    this.pos.set(out.x, ny, out.z);
    camera.position.set(out.x, ny + VIEW_H, out.z);
  }

  aimDir(out) {
    this.camera.getWorldDirection(out);
    return out;
  }
}
