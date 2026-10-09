import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { FEATURES } from './config.js';

const START = { x: 61.5, z: 356.5 };
const PORTER = { x: 49, z: 354.9 };
const DOCK = { x: 34, z: 359.5 };

/** A small vehicle inside the existing quay. No second scene or renderer. */
export class HarbourCart {
  constructor({ level, player, camera, branch, hud, leave }) {
    Object.assign(this, { level, player, camera, branch, hud, leave });
    this.keys = {}; this.active = false;
    this.porter = { id: 'harbour-porter', name: 'Gregorios · Dock porter', role: 'worker', ...PORTER };
    level.npcs.push(this.porter);
    this.group = new THREE.Group(); this.group.name = 'harbour-cart-experience';
    level.featureGroups.harbour.add(this.group);
    this.cart = new THREE.Group(); this.cart.name = 'grain-handcart'; this.group.add(this.cart);
    const wood = level.mat.get('wood_floor');
    const parts = [];
    const box = (w,h,d,x,y,z) => { const g = new THREE.BoxGeometry(w,h,d); g.translate(x,y,z); parts.push(g); };
    box(1.35,0.16,1.7,0,0.65,0);
    for (const x of [-0.67,0.67]) { box(0.1,0.46,1.7,x,0.94,0); box(0.08,0.08,2.1,x,0.7,1.2); }
    box(1.35,0.46,0.1,0,0.94,-0.85);
    const frame = new THREE.Mesh(mergeGeometries(parts), wood); this.cart.add(frame); parts.forEach(g=>g.dispose());
    this.wheels = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.37,0.37,0.14,10).rotateZ(Math.PI/2), level.mat.get('stone_wall'), 4);
    this.cart.add(this.wheels);
    this.sacks = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.22,0.32,3,6), new THREE.MeshLambertMaterial({color:0xbdae79}),8);
    this.cart.add(this.sacks); this.dummy = new THREE.Object3D();
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.23,0.33,1.08,6), new THREE.MeshLambertMaterial({color:0x537887}));
    body.position.y=0.61;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.19,6,5), new THREE.MeshLambertMaterial({color:0xad805e})); head.position.y=1.35;
    this.worker = new THREE.Group(); this.worker.name=this.porter.id; this.worker.add(body,head); this.group.add(this.worker);
    const porterLoad = new THREE.Mesh(this.sacks.geometry,this.sacks.material);
    porterLoad.position.set(0.35,0.85,0.2);porterLoad.rotation.z=0.6;this.worker.add(porterLoad);
    const crateGeo = new THREE.BoxGeometry(1.1,1.1,1.1);
    this.crates = new THREE.InstancedMesh(crateGeo,wood,2);
    [{x:54,z:357.1},{x:43,z:356.4}].forEach((p,i)=>{
      this.dummy.position.set(p.x,0.55,p.z);this.dummy.updateMatrix();this.crates.setMatrixAt(i,this.dummy.matrix);
      level.addCollider(p.x,p.z,1.1,1.1,1.1,'harbour');
    }); this.group.add(this.crates);
    this.goal = new THREE.Mesh(new THREE.TorusGeometry(1.25,0.07,4,24).rotateX(Math.PI/2),new THREE.MeshLambertMaterial({color:0xf3d276}));
    this.goal.position.set(DOCK.x,0.09,DOCK.z);this.group.add(this.goal);
    this.el=document.createElement('div'); this.el.id='cart-hud';this.el.className='panel';this.el.style.display='none';
    this.el.innerHTML='<strong>THE LAST CART</strong><div class="cart-status"></div><div class="cart-controls">W / ↑ push · S / ↓ brake · A/D steer · E help · Q / Esc leave · R restart</div>';
    document.getElementById('hud').appendChild(this.el);
    window.addEventListener('blur',()=>{this.keys={};});
    this.reset();
  }
  reset() {
    this.x=START.x;this.z=START.z;this.yaw=Math.PI/2;this.speed=0;this.balance=0;this.cargo=100;this.time=0;
    this.helped=false;this.helpTime=0;this.wheelAngle=0;this.result=null;this.lookYaw=0;this.pitch=-0.15;this.keys={};
    this.worker.position.set(PORTER.x,0,PORTER.z);this.porter.x=PORTER.x;this.porter.z=PORTER.z;
    this.syncMeshes();
  }
  canBoard(pos) { return FEATURES.harbour!==false && Math.hypot(pos.x-this.x,pos.z-this.z)<3.4; }
  start() { this.active=true;this.reset();this.el.style.display='block';this.player.clearKeys();this.followCamera();this.status(); }
  lookBy(x,y) { this.lookYaw=THREE.MathUtils.clamp(this.lookYaw-x,-1.5,1.5);this.pitch=THREE.MathUtils.clamp(this.pitch-y,-1.1,0.7); }
  key(e,down) {
    const code=({ArrowUp:'KeyW',ArrowDown:'KeyS',ArrowLeft:'KeyA',ArrowRight:'KeyD'})[e.code] || e.code;
    if (['KeyW','KeyS','KeyA','KeyD','KeyE','KeyQ','KeyR','Escape'].includes(code)) e.preventDefault();
    this.keys[code]=down;
    if(!down||e.repeat)return;
    if(code==='KeyQ'||code==='Escape')this.close();
    else if(code==='KeyR')this.start();
    else if(code==='KeyE'&&!this.result&&!this.helped&&Math.hypot(this.x-PORTER.x,this.z-PORTER.z)<3.5&&this.speed<0.7){
      this.helped=true;this.helpTime=2.5;this.speed=0;
      this.hud.message('Gregorios: “Thank you. Let me steady your grain while we walk.”',3500);
    }
  }
  update(dt) {
    if(!this.active)return;
    if(FEATURES.harbour===false){this.close();return;}
    if(document.hidden){this.keys={};return;}
    if(!this.result){
      this.time+=dt;
      if(this.helpTime>0)this.helpTime=Math.max(0,this.helpTime-dt);
      else {
        const turn=(this.keys.KeyA?1:0)-(this.keys.KeyD?1:0);
        this.speed=THREE.MathUtils.clamp(this.speed+dt*(this.keys.KeyS?-6:this.keys.KeyW?2.8:-2.2),0,4.2);
        this.yaw+=turn*dt*0.9;
        this.balance=(this.balance+turn*this.speed*dt*0.48)*Math.exp(-dt*(this.helped?3:1.2));
        if(Math.abs(this.balance)>0.9)this.cargo=Math.max(0,this.cargo-dt*8);
        const nx=this.x-Math.sin(this.yaw)*this.speed*dt,nz=this.z-Math.cos(this.yaw)*this.speed*dt;
        const out={x:nx,z:nz};
        let hit=false;
        for(let i=0;i<3;i++){if(!this.level.collideCircle(out.x,out.z,0.92,out))break;hit=true;}
        // The pusher must fit behind the handles too: reuse the same quay collisions.
        const behind={x:out.x+Math.sin(this.yaw)*2.1,z:out.z+Math.cos(this.yaw)*2.1};
        const blocked=this.level.collideCircle(behind.x,behind.z,0.45,{...behind});
        if(!blocked){this.wheelAngle+=Math.hypot(out.x-this.x,out.z-this.z)/0.37;this.x=out.x;this.z=out.z;}
        if(hit||blocked){this.speed*=0.3;this.cargo=Math.max(0,this.cargo-dt*4);}
      }
      if(this.helped&&this.helpTime<=0){
        this.worker.position.set(this.x+Math.cos(this.yaw)*1.5,0,this.z-Math.sin(this.yaw)*1.5);
        this.porter.x=this.worker.position.x;this.porter.z=this.worker.position.z;
      }
      if(Math.hypot(this.x-DOCK.x,this.z-DOCK.z)<1.6&&this.speed<0.8)this.finish(this.helped?'humble':'proud');
      else if(this.time>=100||this.cargo<=0)this.finish('unfinished');
    }
    this.syncMeshes();this.followCamera();this.status();
  }
  syncMeshes() {
    this.cart.position.set(this.x,0,this.z);this.cart.rotation.y=this.yaw;
    for(let i=0;i<4;i++){
      this.dummy.position.set(i%2?0.77:-0.77,0.38,i<2?-0.52:0.52);this.dummy.rotation.set(this.wheelAngle,0,0);this.dummy.scale.set(1,1,1);
      this.dummy.updateMatrix();this.wheels.setMatrixAt(i,this.dummy.matrix);
    } this.wheels.instanceMatrix.needsUpdate=true;
    const remaining=Math.ceil(this.cargo/12.5);
    for(let i=0;i<8;i++){
      this.dummy.position.set((i%2?0.27:-0.27)+this.balance*0.07,1.01+(i>=4?0.38:0),(i%4<2?-0.3:0.3));
      this.dummy.rotation.set(0,0,Math.PI/2+this.balance*0.16);this.dummy.scale.setScalar(i<remaining?1:0);
      this.dummy.updateMatrix();this.sacks.setMatrixAt(i,this.dummy.matrix);
    }this.sacks.instanceMatrix.needsUpdate=true;
    // Small moving meshes: fixed local bounds avoid per-frame scans.
    this.wheels.boundingSphere??=new THREE.Sphere(new THREE.Vector3(0,0.6,0),2);
    this.sacks.boundingSphere??=new THREE.Sphere(new THREE.Vector3(0,1.2,0),2);
  }
  followCamera() {
    this.player.pos.set(this.x+Math.sin(this.yaw)*2.1,0,this.z+Math.cos(this.yaw)*2.1);
    this.player.vel.set(0,0,0);this.camera.position.set(this.player.pos.x,1.62,this.player.pos.z);
    this.camera.rotation.set(this.pitch,this.yaw+this.lookYaw,0);
  }
  finish(outcome) {
    this.result=outcome;this.speed=0;this.keys={};
    const key='activity:harbour',reward=outcome!=='unfinished'&&!this.branch.flags[key];
    if(reward){this.branch.setFlag(key,outcome);if(outcome==='humble')this.branch.addGrace(3);else this.branch.addPride(4);this.branch.save();this.hud.revealMeters();this.hud.setMeters(this.branch.pride,this.branch.grace);}
    const text=outcome==='humble'?'You bring the grain aboard together. The foreman thanks you both.' : outcome==='proud'?'You take the foreman’s praise. Gregorios is still struggling back on the quay.' : 'The bell rings before your delivery. Try again; the meters are unchanged.';
    this.hud.message(`${text}${outcome==='unfinished'?'':reward?outcome==='humble'?' (+3 grace)':' (+4 pride)':' (Practice: meters unchanged.)'}`,6500);
  }
  status() {
    const distance=Math.round(Math.hypot(this.x-DOCK.x,this.z-DOCK.z));
    this.el.querySelector('.cart-status').textContent=this.result?`${this.result==='unfinished'?'DELIVERY UNFINISHED':'DELIVERY COMPLETE'} · grain ${Math.round(this.cargo)}% · R retry / Q step away`:`Grain ${Math.round(this.cargo)}% · speed ${this.speed.toFixed(1)} · dock ${distance} paces · bell ${Math.max(0,Math.ceil(100-this.time))}s`;
    if(this.result)this.hud.showPrompt('R · another delivery     Q / Esc · step away');
    else if(this.helpTime>0)this.hud.showPrompt('You help Gregorios steady his load…');
    else if(!this.helped&&Math.hypot(this.x-PORTER.x,this.z-PORTER.z)<3.5)this.hud.showPrompt('Gregorios needs a hand · S to stop, then E to help');
    else if(distance<3)this.hud.showPrompt('Gold ring: S to stop at the ship’s loading point');
    else this.hud.showPrompt(this.helped?'Gregorios steadies the grain. Deliver to the gold ring beside the ship.':'Hold W to push. A/D turn. Stop for the porter or continue to the ship.');
  }
  close() {
    this.active=false;this.keys={};this.el.style.display='none';this.hud.hidePrompt();this.player.clearKeys();
    // Stay where you stepped away; the idle cart returns to the gate for replay.
    this.reset();this.leave();
  }
  snapshot(){return {active:this.active,outcome:this.result,x:this.x,z:this.z,yaw:this.yaw,speed:this.speed,cargo:this.cargo,helped:this.helped,time:this.time,porter:{...PORTER},dock:{...DOCK}};}
}
