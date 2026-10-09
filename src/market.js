import * as THREE from 'three';
import { CELL, LEVEL } from './config.js';

export const TRADES = [
  { name: 'Bread seller', goods: 'bread', text: 'A tired porter counts his coins. There is only one warm loaf left.', humble: 'Let the porter have it', proud: 'Demand the best loaf for yourself', after: 'The porter breaks the loaf and offers you half.', boast: 'You get the loaf. The porter leaves hungry.' },
  { name: 'Silk merchant', goods: 'silk', text: 'A bright sash would make everyone notice you at the races.', humble: 'Choose plain cloth and thank the weaver', proud: 'Ask for a sash worthy of someone important', after: 'The weaver shows you the patient work behind every thread.', boast: 'The sash gleams. You keep checking who is looking.' },
  { name: 'Potter', goods: 'pots', text: 'You knock a cup from the counter. It cracks; the potter has not seen.', humble: 'Admit it and help clean up', proud: 'Blame the passing crowd', after: 'The potter accepts your apology. Together you clear the shards.', boast: 'The potter scolds an innocent passerby. You slip away.' },
  { name: 'Olive seller', goods: 'olives', text: 'An older woman is ahead of you. The queue moves slowly.', humble: 'Wait and carry her basket', proud: 'Push ahead; your journey matters more', after: 'She tells you where to find shade along the road.', boast: 'You are served first. Conversation stops behind you.' },
  { name: 'Wreath seller', goods: 'wreaths', text: 'A wreath can make you look like a champion before you have raced.', humble: 'Ask about the workers who tend the horses', proud: 'Wear a champion’s wreath and seek applause', after: 'The seller points out the stable hands: victory depends on unseen work.', boast: 'A few spectators cheer. You wish the cheers would last.' },
  { name: 'Perfumer', goods: 'perfume', text: 'A visitor cannot afford the scented oil offered to wealthy patrons.', humble: 'Make room for the visitor to try a sample', proud: 'Ask that poorer customers be kept away', after: 'The visitor smiles at the scent of rosemary. The counter welcomes everyone.', boast: 'The merchant clears a space for you. The visitor steps away.' },
  ...[
    ['Shoemaker', 'shoes', 'A repaired pair has an uneven stitch, but the soles will last.', 'Value the sturdy repair', 'Mock the stitch in front of customers', 'The cobbler explains how he saved the old leather.', 'The apprentice hides her first repair beneath the counter.'],
    ['Scribe', 'ink', 'The scribe offers to write your name in a list of donors.', 'Ask that the gift remain anonymous', 'Ask for your name above the others', 'The empty space leaves room for the names of those needing help.', 'Your name takes the largest line. The need below it is unchanged.'],
    ['Grain merchant', 'grain', 'A sack of grain was delivered to you by mistake.', 'Return the sack to its owner', 'Keep it; no one has noticed', 'The miller can finish the workers’ bread today.', 'The miller searches the road for his missing sack.'],
    ['Fruit seller', 'fruit', 'A bruised fig is still sweet. A hungry apprentice watches the basket.', 'Set aside the good fruit for the apprentice', 'Claim every unmarked fig for yourself', 'The apprentice wraps a fig to take home to his sister.', 'You fill your basket and leave the bruised fruit for others.'],
    ['Blacksmith', 'iron', 'The smith credits his apprentice for a well-made hinge.', 'Ask the apprentice to show you the work', 'Tell the smith only a master deserves credit', 'The apprentice straightens and explains the careful fitting.', 'The apprentice falls silent while the master speaks for him.'],
    ['Water carrier', 'water', 'The carrier spills a jug. Racegoers laugh as she kneels to gather it.', 'Kneel beside her and help', 'Join the laughter', 'She offers water to the next weary traveler.', 'The laughter grows. She keeps her eyes on the ground.'],
    ['Fishmonger', 'fish', 'A porter is accused of taking a fish you saw fall behind the stall.', 'Speak up for the porter', 'Stay quiet to remain in the merchant’s favor', 'The fish is found. The porter can leave with his dignity.', 'The porter pays for a fish he never took.'],
    ['Lantern maker', 'lanterns', 'The plain lantern and the polished one cast the same light.', 'Choose the plain lantern for a dark stairway', 'Choose the polished one to impress your neighbors', 'The stairway is lit before the evening workers return.', 'The brass reflects your face more brightly than the stairway.'],
    ['Glassblower', 'glass', 'A kiln has cracked several cups. The maker is embarrassed.', 'Help sort the cups that can still be used', 'Demand a flawless cup before everyone else', 'A crate of useful cups is ready for travelers.', 'You leave with a perfect cup. The maker faces the broken batch alone.'],
    ['Rope maker', 'rope', 'A sailor offers to teach you a knot you do not know.', 'Listen and practice the knot', 'Pretend you already know it', 'The sailor waits patiently until the knot holds.', 'You hide the loose knot as the sailor walks away.'],
    ['Soup cook', 'soup', 'The cook serves workers first; your bowl must wait.', 'Help set out bowls while you wait', 'Insist that a pilgrim should be served first', 'The workers pull up a stool for you at their table.', 'Your bowl arrives early. You eat apart from the workers.'],
    ['Herbalist', 'herbs', 'You confidently name a herb. The herbalist gently corrects you.', 'Thank her and learn the difference', 'Argue so the customers do not see your mistake', 'She shows you the leaf’s edge and gives you time to look.', 'The customers move away while you defend your certainty.'],
    ['Icon painter', 'pigments', 'The painter asks who should be remembered in prayer.', 'Name someone you have found hard to forgive', 'List only people who praise you', 'The name you avoided is spoken gently over the unfinished panel.', 'Your friends’ names fill the list. One absence stays with you.'],
    ['Bookseller', 'books', 'A worn book contains a note from someone who once struggled as you do.', 'Read the note without judging its writer', 'Dismiss the writer as weaker than yourself', 'The margin feels like a hand offered across the years.', 'You shut the book before the writer’s hope can reach you.'],
  ].map(([name, goods, text, humble, proud, after, boast]) => ({ name, goods, text, humble, proud, after, boast })),
];

export const ERRANDS = [
  { id: 'bread', from: 'vendor-4--1', to: 'vendor-5-1', parcel: 'a basket of bread', request: 'The miller sent bread with the grain today. Could you carry it to the water carrier for the stable hands?', received: 'The stable hands share the bread before returning to the horses.' },
  { id: 'cups', from: 'vendor-7--1', to: 'vendor-8--1', parcel: 'a crate of cups', request: 'The soup cook needs cups for weary travelers. Will you take this crate down the road?', received: 'The cups are set out for travelers who cannot afford a meal.' },
  { id: 'fruit', from: 'vendor-4-1', to: 'vendor-6--1', parcel: 'a basket of fruit', request: 'The fishmonger is preparing a meal for the porters. Can you bring this fruit?', received: 'The porters sit together and pass the fruit around.' },
];
const NAMES = ['Martha', 'Anna', 'Stephanos', 'Eirene', 'Theodoros', 'Marina', 'Petros', 'Helena', 'Demetrios', 'Sophia', 'Niketas', 'Theodora', 'Markos', 'Zoe', 'Leontios', 'Agatha', 'Andreas', 'Maria', 'Alexios', 'Damaris'];
const FAMILIES = ['of the quay', 'of the north gate', 'of the mill lane', 'of the orchard', 'of the hillside', 'of the old square'];
const CITIZENS = [
  ['Pilgrim', 'I am learning to ask the way rather than pretend I know it.'],
  ['Porter', 'My shoulder aches, but another porter offered to share the load.'],
  ['Racegoer', 'I shouted at a rival yesterday. Today I hope I can meet him without shouting.'],
  ['Apprentice', 'The first thing my teacher taught me was how to admit a mistake.'],
  ['Sailor', 'The youngest deckhand spotted the storm before our captain did.'],
  ['Weaver', 'Nobody sees the back of a cloth. I try to finish it carefully anyway.'],
  ['Messenger', 'I carry news for important people, but the letter for a sick mother comes first.'],
  ['Mason', 'My mark is hidden inside a wall. It still needs to stand straight.'],
  ['Gardener', 'The smallest garden feeds someone. That is enough reason to tend it.'],
  ['Musician', 'A child sang the tune better than I did. I am trying to be glad.'],
  ['Fisher', 'Another boat came back empty. We divided the catch before docking.'],
  ['Carpenter', 'My neighbor mended my door without leaving his name. I recognized his work.'],
];
const JOURNEYS = ['the quay to meet my brother', 'the north gate to welcome a traveler', 'the mill to collect flour', 'the orchard to help with the harvest', 'the baths to meet an old friend', 'the monastery to visit someone ill', 'the forum to return a borrowed tool', 'the chapel to sit quietly', 'the cistern to fetch water', 'the race gates to find my family'];
// Distinct goods silhouettes reuse the same instanced primitive.
const GOODS_SHAPES = [
  [1.4, 0.65, 1], [1.6, 0.4, 1.6], [1, 1.8, 1], [0.65, 0.65, 0.65],
  [1.6, 0.25, 1.6], [0.55, 1.7, 0.55], [0.8, 0.55, 1.8], [0.65, 1.1, 0.65],
  [1.3, 1.5, 1.3], [1, 1, 1], [0.45, 0.45, 2], [1.1, 2, 1.1],
  [0.65, 0.4, 2], [1, 1.6, 1], [0.8, 1.4, 0.8], [1.5, 0.45, 1.5],
  [1.6, 0.5, 1.6], [0.6, 1.3, 0.6], [1.2, 0.25, 1.5], [1.3, 0.4, 1.7],
];
const WORKERS = [
  { name: 'Isaak · Stable hand', goods: 'work', text: 'Isaak is hauling feed while the spectators cheer the drivers. “Could you steady this sack?”', humble: 'Help, then let him get back to work', proud: 'Help, but call the crowd over to watch', after: '“The horses are fed. That is thanks enough,” Isaak says. He makes room for you in the shade.', boast: 'Isaak thanks you loudly as you requested. You hardly hear him over the applause you were hoping for.' },
  { name: 'Euphemia · Street sweeper', goods: 'work', text: 'Dust from the race gates covers Euphemia’s freshly swept road. She offers you a spare broom.', humble: 'Sweep beside her without seeking credit', proud: 'Sweep, then insist she praise you to passersby', after: 'Euphemia rests her broom. “Now the older folk can pass safely. Thank you.”', boast: 'She tells passersby that you helped. The road is clean, but you linger to hear your name.' },
];

/** One registry for both ambient walkers and named, persistent vendors.
 * Bodies and stall parts use instancing so crowd size does not multiply draws. */
export class RoadMarket {
  constructor(level) {
    this.level = level;
    this.npcs = [];
    this.group = new THREE.Group();
    this.group.name = 'main-road-market';
    level.group.add(this.group);
    const road = LEVEL.rooms.mainroad;
    this.bounds = { minX: road.x * CELL + 3.5, maxX: (road.x + road.w) * CELL - 3.5,
      minZ: 8 * CELL, maxZ: (road.y + road.h - 4) * CELL };
    // Stall rows flank the road; breaks keep every landmark entrance open.
    const rows = [29, 33, 45, 58, 70, 74, 78, 82, 92, 101];
    const stalls = [];
    for (const [r, row] of rows.entries()) for (const side of [-1, 1]) {
      const x = side < 0 ? road.x * CELL + 1.25 : (road.x + road.w) * CELL - 1.25;
      const z = row * CELL;
      const trade = TRADES[stalls.length];
      const id = `vendor-${r}-${side}`;
      stalls.push({ x, z, side, trade });
      this.npcs.push({ id, role: 'vendor', name: `${NAMES[stalls.length - 1]} · ${trade.name}`, trade,
        x: x - side * 0.15, z: z + 1.55, phase: r, speed: 0 });
      level.addCollider(x, z, 1.9, 2, 1.05);
    }
    for (let i = 0; i < 120; i++) {
      const dense = i < 48;
      const z = dense ? (69 + (i * 7 % 47) / 3) * CELL : this.bounds.minZ + ((i * 73 % 997) / 997) * (this.bounds.maxZ - this.bounds.minZ);
      const x = this.bounds.minX + (i % 7) / 6 * (this.bounds.maxX - this.bounds.minX);
      const [occupation, thought] = CITIZENS[i % CITIZENS.length];
      this.npcs.push({ id: `walker-${i}`, role: 'walker', name: `${NAMES[i % NAMES.length]} ${FAMILIES[Math.floor(i / NAMES.length)]} · ${occupation}`,
        line: `${thought} I am heading to ${JOURNEYS[Math.floor(i / CITIZENS.length)]}.`,
        x, z, homeZ: z, direction: i % 2 ? 1 : -1, speed: 0.55 + (i % 5) * 0.16, phase: i * 1.7, wait: i % 4 });
    }
    // Workers remain in the registry, with stable positions so errands and
    // conversations can reliably bring the player back to a familiar person.
    WORKERS.forEach((trade, i) => Object.assign(this.npcs[20 + 48 + i], {
      role: 'worker', name: trade.name, trade, speed: 0,
      x: this.bounds.minX + 1.2 + i * 4.8, z: (76 + i * 4) * CELL,
    }));
    const dummy = new THREE.Object3D();
    const addInstances = (geometry, material, count, place) => {
      const mesh = new THREE.InstancedMesh(geometry, material, count);
      for (let i = 0; i < count; i++) { dummy.position.set(0, 0, 0); dummy.scale.set(1, 1, 1); place(dummy, i); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix); }
      this.group.add(mesh);
      return mesh;
    };
    const wood = level.mat.get('wood_floor');
    addInstances(new THREE.BoxGeometry(1.9, 0.9, 2), wood, stalls.length, (d, i) => d.position.set(stalls[i].x, 0.45, stalls[i].z));
    const canopy = addInstances(new THREE.BoxGeometry(2.4, 0.15, 2.5), new THREE.MeshLambertMaterial(), stalls.length, (d, i) => d.position.set(stalls[i].x, 2.4, stalls[i].z));
    addInstances(new THREE.BoxGeometry(0.09, 2.4, 0.09), wood, stalls.length * 4, (d, i) => {
      const s = stalls[Math.floor(i / 4)]; d.position.set(s.x + (i % 2 ? 1 : -1), 1.2, s.z + (i % 4 < 2 ? -1 : 1));
    });
    const goods = addInstances(new THREE.SphereGeometry(0.18, 6, 4), new THREE.MeshLambertMaterial(), stalls.length * 6, (d, i) => {
      const s = stalls[Math.floor(i / 6)]; d.position.set(s.x + (i % 3 - 1) * 0.42, 1.04, s.z + (i % 2 ? 0.35 : -0.35));
      d.scale.set(...GOODS_SHAPES[Math.floor(i / 6)]);
    });
    const colors = [0xa65c43, 0x52746e, 0xc5a65d, 0x6d6488, 0x58769c, 0x948366];
    stalls.forEach((s, i) => { canopy.setColorAt(i, new THREE.Color().setHSL((i * 0.61803398875) % 1, 0.32, 0.42)); for (let k = 0; k < 6; k++) goods.setColorAt(i * 6 + k, new THREE.Color(colors[(i + 2) % colors.length])); });
    this.bodies = addInstances(new THREE.CylinderGeometry(0.23, 0.34, 1.05, 6), new THREE.MeshLambertMaterial(), this.npcs.length, () => {});
    this.heads = addInstances(new THREE.SphereGeometry(0.19, 6, 5), new THREE.MeshLambertMaterial(), this.npcs.length, () => {});
    this.npcs.forEach((npc, i) => {
      npc.height = 0.86 + (i * 17 % 29) / 100;
      npc.width = 0.84 + (i * 11 % 31) / 100;
      this.bodies.setColorAt(i, new THREE.Color().setHSL((i * 0.61803398875) % 1, 0.24 + i % 4 * 0.06, 0.28 + i % 5 * 0.045));
      this.heads.setColorAt(i, new THREE.Color().setHSL(0.055 + i % 7 * 0.006, 0.25 + i % 5 * 0.04, 0.35 + i % 11 * 0.028));
    });
    this.dummy = dummy;
    const crowdBounds = new THREE.Sphere(new THREE.Vector3(
      (this.bounds.minX + this.bounds.maxX) / 2, 1.5,
      (this.bounds.minZ + this.bounds.maxZ) / 2),
    Math.hypot((this.bounds.maxX - this.bounds.minX) / 2 + 3, (this.bounds.maxZ - this.bounds.minZ) / 2 + 3));
    // Routes stay inside these bounds; avoid scanning every instance twice per frame.
    this.bodies.boundingSphere = crowdBounds;
    this.heads.boundingSphere = crowdBounds.clone();
    this.update(0, 0, null);
  }

  nearest(pos, radius = 2.5) {
    let best = null, distance = radius;
    for (const npc of this.npcs) {
      const d = Math.hypot(pos.x - npc.x, pos.z - npc.z);
      if (d < distance) { distance = d; best = npc; }
    }
    return best;
  }

  update(dt, time, player) {
    for (let i = 0; i < this.npcs.length; i++) {
      const npc = this.npcs[i];
      if (dt > 0 && !npc.speed) continue;
      let moving = false;
      if (npc.speed) {
        npc.wait = Math.max(0, npc.wait - dt);
        const blocked = player && Math.hypot(player.x - npc.x, player.z - npc.z) < 1.1;
        if (!npc.wait && !blocked) {
          npc.z += npc.direction * npc.speed * dt;
          moving = true;
          const low = Math.max(this.bounds.minZ, npc.homeZ - 13), high = Math.min(this.bounds.maxZ, npc.homeZ + 13);
          if (npc.z < low || npc.z > high) { npc.z = THREE.MathUtils.clamp(npc.z, low, high); npc.direction *= -1; npc.wait = 1.5 + i % 3; }
        }
      }
      const bob = moving ? Math.sin(time * 7 + npc.phase) * 0.045 : 0;
      this.dummy.scale.set(npc.width, npc.height, npc.width);
      this.dummy.position.set(npc.x, 0.6 * npc.height + bob, npc.z);
      this.dummy.updateMatrix(); this.bodies.setMatrixAt(i, this.dummy.matrix);
      this.dummy.scale.set(npc.width, 0.94 + i % 5 * 0.04, npc.width);
      this.dummy.position.y = 1.17 * npc.height + 0.19 + bob;
      this.dummy.updateMatrix(); this.heads.setMatrixAt(i, this.dummy.matrix);
    }
    this.bodies.instanceMatrix.needsUpdate = true;
    this.heads.instanceMatrix.needsUpdate = true;
  }

  choose(npc, choice, branch) {
    if (!npc.trade || !['humble', 'proud'].includes(choice)) return false;
    const key = `market:${npc.id}`;
    if (branch.flags[key]) return false;
    branch.setFlag(key, choice);
    if (choice === 'humble') branch.addGrace(1); else branch.addPride(2);
    branch.save();
    return true;
  }

  activeErrand(branch) {
    return ERRANDS.find(e => branch.flags[`errand:${e.id}`] === 'carrying') ?? null;
  }

  objective(branch, pos) {
    const errand = this.activeErrand(branch);
    if (!errand) return null;
    const recipient = this.npcs.find(n => n.id === errand.to);
    const distance = Math.round(Math.hypot(pos.x - recipient.x, pos.z - recipient.z));
    const direction = recipient.z > pos.z + 3 ? 'south' : recipient.z < pos.z - 3 ? 'north' : 'nearby';
    return `Carrying ${errand.parcel} → ${recipient.name} · ${direction} · ${distance} paces`;
  }

  errandAction(npc, action, branch) {
    const errand = ERRANDS.find(e => action === 'accept' ? e.from === npc.id : e.to === npc.id && branch.flags[`errand:${e.id}`] === 'carrying');
    if (!errand) return false;
    const key = `errand:${errand.id}`;
    if (action === 'accept') {
      if (branch.flags[key] || this.activeErrand(branch)) return false;
      branch.setFlag(key, 'carrying');
    } else if (['deliverQuietly', 'deliverForPraise'].includes(action)) {
      if (branch.flags[key] !== 'carrying') return false;
      const quiet = action === 'deliverQuietly';
      branch.setFlag(key, quiet ? 'quiet' : 'praise');
      if (quiet) branch.addGrace(2); else branch.addPride(3);
    } else return false;
    branch.save();
    return true;
  }

  conversation(npc, branch) {
    const previous = branch.flags[`market:${npc.id}`];
    const paragraphs = [previous ? (previous === 'humble' ? npc.trade.after : npc.trade.boast) : npc.trade.text];
    const choices = previous ? [] : [
      { label: npc.trade.humble, action: 'humble' }, { label: npc.trade.proud, action: 'proud' },
    ];
    if (npc.z >= 69 * CELL && npc.z <= 83 * CELL) {
      if (branch.flag('helpedCharioteer')) paragraphs.unshift('“You stopped for the Blue driver. His family sent word: he is alive. We remember that here.”');
      else if (branch.flag('wonRace')) paragraphs.unshift('“The Greens’ champion! The cheering has faded. The workers still have their day’s work to finish.”');
      else if (branch.flag('raced')) paragraphs.unshift('“Back from the track? Sit a moment. There is more to this road than the finishing line.”');
    }
    const active = this.activeErrand(branch);
    if (active?.to === npc.id) {
      choices.length = 0;
      paragraphs.push(`“You brought ${active.parcel}! Shall we put it out for the workers?”`);
      choices.unshift({ label: 'Hand it over quietly and help unpack', action: 'deliverQuietly' }, { label: 'Hand it over; ask them to announce your generosity', action: 'deliverForPraise' });
    } else {
      const offered = ERRANDS.find(e => e.from === npc.id);
      if (offered && !branch.flags[`errand:${offered.id}`]) {
        const target = this.npcs.find(n => n.id === offered.to);
        paragraphs.push(`${offered.request} Bring ${offered.parcel} to ${target.name}, ${target.z > npc.z ? 'south' : 'north'} along the road.`);
        if (!active) choices.push({ label: `Carry ${offered.parcel}`, action: 'accept' });
        else paragraphs.push('“Finish the delivery you are carrying first. I can wait.”');
      } else if (offered && branch.flags[`errand:${offered.id}`] === 'carrying') paragraphs.push('“Take your time. The parcel is still with you.”');
    }
    for (const e of ERRANDS.filter(e => e.to === npc.id || e.from === npc.id)) {
      const outcome = branch.flags[`errand:${e.id}`];
      if (outcome === 'quiet') paragraphs.push(`${e.received} “Thank you for lending your hands.”`);
      else if (outcome === 'praise') paragraphs.push(`${e.received} Your name was announced, as you asked. The workers have gone back to their tasks.`);
    }
    return { paragraphs, choices };
  }
}
