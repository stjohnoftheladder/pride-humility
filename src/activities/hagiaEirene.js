// Hagia Eirene: the shared phrase. Romanos sings, Kassia answers quietly, and
// the pilgrim enters on Romanos's beats. Singing over Kassia's answer draws
// listeners (pride); leaving her space lets the voices resolve (humility).
import * as THREE from 'three';
import { SiteActivity } from './siteKit.js';

export const BEAT = 0.6;
const CYCLE = 8, LISTEN = 1, SUNG = 3;
// beats 0-3 Romanos with you, 4-5 Kassia alone, 6-7 everyone
const PART = ['all', 'all', 'all', 'all', 'kassia', 'kassia', 'all', 'all'];
const NOTES = [293.7, 329.6, 349.2, 392, 440, 392, 349.2, 293.7];
const WINDOW = 0.16, YOURS = SUNG * PART.filter((p) => p === 'all').length;

export class HagiaEireneActivity extends SiteActivity {
  clock = false;
  listPeople = true;
  title = 'THE SHARED PHRASE';
  room = 'Hagia Eirene';
  controls = 'WASD walk · E begin · Space sing on your beats (Shift sings out) · Q / Esc leave · R retry';
  intro = 'Stand in your place between Romanos and Kassia. Listen once, then sing his beats and leave her answer to her.';
  area = { minX: 82, maxX: 99, minZ: 314.5, maxZ: 325 };
  build(group) {
    const lampGeometry = new THREE.SphereGeometry(0.16, 8, 6);
    const lamp = (x, color) => {
      const m = new THREE.Mesh(lampGeometry, new THREE.MeshBasicMaterial({ color })); m.position.set(x, 2.35, 316.4); group.add(m); return m;
    };
    this.site.targets.push({ ...this.person(group, 'Romanos · Cantor', 'cantor', 87.5, 316.4, 0x3d4a6b), role: 'cantor' });
    this.site.targets.push({ ...this.person(group, 'Kassia · Quiet singer', 'kassia', 92.5, 316.4, 0x6b4a5d), role: 'kassia' });
    this.site.targets.push({ name: 'Your place', role: 'place', x: 90, z: 317.6 });
    this.label(group, 'Your place', 90, 1.6, 317.2);
    this.lamps = { cantor: lamp(87.5, 0xf3d276), kassia: lamp(92.5, 0xf3d276), you: lamp(90, 0xf3d276) };
    for (const l of Object.values(this.lamps)) l.material.transparent = true;
  }
  reset() {
    for (const l of Object.values(this.lamps)) { l.material.opacity = 0.25; l.scale.setScalar(1); l.material.color.set(0xf3d276); }
    return { running: false, time: 0, beat: -1, hits: 0, misses: 0, strays: 0, overs: 0, listeners: 0, hit: new Set(), glow: { cantor: 0, kassia: 0, you: 0 }, drowned: 0 };
  }
  act(code, target, e) {
    const g = this.game;
    if (code === 'KeyE' && (target?.role === 'place' || target?.role === 'cantor') && !g.running) {
      g.running = true; g.time = -BEAT;     // a breath before the first beat
      this.hud.message('Romanos nods: listen once. Then sing with him, and let Kassia answer alone.', 5000);
      return;
    }
    if (code !== 'Space' || !g.running) return;
    if (target?.role !== 'place') { this.hud.message('Step into your place between them to sing.', 2500); return; }
    const index = Math.round(g.time / BEAT), delta = g.time - index * BEAT, cycle = Math.floor(index / CYCLE), part = PART[((index % CYCLE) + CYCLE) % CYCLE];
    if (cycle >= LISTEN + SUNG) return;
    if (cycle < LISTEN || index < 0) { this.hud.message('Listen first: watch the lamps as they sing.', 2500); return; }
    const loud = !!(e?.shiftKey || this.keys.ShiftLeft || this.keys.ShiftRight);
    if (Math.abs(delta) > WINDOW || g.hit.has(index)) { g.strays++; g.glow.you = -1; this.audio?._t(200, 0.12, 'square', 0.04); return; }
    if (part === 'kassia') {
      g.overs++; g.listeners += loud ? 3 : 2; g.drowned = 1.2; g.hit.add(index);
      g.glow.you = loud ? 2 : 1.5; this.audio?._t(NOTES[index % CYCLE] * 2, 0.45, 'sawtooth', loud ? 0.12 : 0.08);
      return;
    }
    g.hits++; g.hit.add(index); if (loud) g.listeners++;
    g.glow.you = loud ? 1.6 : 1; this.audio?._t(NOTES[index % CYCLE], 0.45, 'triangle', loud ? 0.12 : 0.07);
  }
  tick(dt) {
    const g = this.game;
    for (const k of Object.keys(g.glow)) g.glow[k] += (0 - g.glow[k]) * Math.min(1, dt * 4);
    g.drowned = Math.max(0, g.drowned - dt);
    if (g.running && !g.done) {
      g.time += dt;
      const beat = Math.floor(g.time / BEAT + 1e-6);
      while (g.beat < beat) {
        g.beat++;
        const index = g.beat, cycle = Math.floor(index / CYCLE), part = PART[index % CYCLE];
        if (index < 0) continue;
        // a beat of yours that passed unsung, judged once its window has closed
        const prev = index - 1;
        if (prev >= LISTEN * CYCLE && PART[prev % CYCLE] === 'all' && !g.hit.has(prev)) g.misses++;
        if (cycle >= LISTEN + SUNG) { this.end(); return; }
        if (part === 'all') { g.glow.cantor = 1; this.audio?._t(NOTES[index % CYCLE], 0.5, 'triangle', 0.07); }
        if (part === 'kassia' && g.drowned <= 0) { g.glow.kassia = 1; this.audio?._t(NOTES[index % CYCLE], 0.5, 'sine', 0.035); }
        if (part === 'all' && index % CYCLE === 6) { g.glow.kassia = 0.8; }
      }
    }
    // physical feedback: the lamps swell with each voice; Kassia's gutters when drowned
    const show = (lamp, v, color) => { lamp.material.opacity = 0.25 + Math.min(0.75, Math.abs(v)); lamp.scale.setScalar(1 + Math.min(1.5, Math.abs(v)) * 0.6); lamp.material.color.set(color); };
    show(this.lamps.cantor, g.glow.cantor, 0xf3d276);
    show(this.lamps.kassia, g.drowned > 0 ? 0.05 : g.glow.kassia, g.drowned > 0 ? 0x5a4a3a : 0xf3d276);
    show(this.lamps.you, g.glow.you, g.glow.you < 0 ? 0xb04030 : g.glow.you > 1.2 ? 0xffffff : 0xf3d276);
  }
  end() {
    const g = this.game; g.running = false;
    this.finish(g.overs >= 2 ? 'proud' : g.hits >= Math.ceil(YOURS * 0.7) ? 'humble' : 'unfinished');
  }
  status() {
    const g = this.game;
    if (!g.running && !g.done) return 'Stand in your place and press E to begin';
    const cycle = Math.floor(Math.max(0, g.time) / (BEAT * CYCLE));
    const phase = cycle < LISTEN ? 'Listening' : `Phrase ${Math.min(SUNG, cycle - LISTEN + 1)}/${SUNG}`;
    const next = PART[((Math.round(g.time / BEAT) % CYCLE) + CYCLE) % CYCLE] === 'kassia' ? 'Kassia’s answer' : 'Your beat';
    return `${phase} · ${next} · in time ${g.hits}/${YOURS} · listeners turned toward you ${g.listeners}`;
  }
  prompt(target) {
    const g = this.game;
    if (!g.running) return target?.role === 'place' || target?.role === 'cantor' ? 'E · Begin the phrase with Romanos' : 'Walk to your place between the singers';
    return target?.role === 'place' ? 'Space · Sing on the beat · Shift + Space · Sing out' : 'Step back into your place';
  }
  resultText(outcome) {
    const g = this.game;
    if (outcome === 'humble') return `The three voices resolve together. Kassia’s answer carried through the court${g.misses ? ', and your missed entries were covered by the others' : ''}.`;
    if (outcome === 'proud') return 'Heads turn toward your voice. Kassia falls silent, and the phrase ends without her answer.';
    return 'The phrase fell apart. Listen again and enter with Romanos.';
  }
  details() { const g = this.game; return { running: g.running, time: g.time, hits: g.hits, misses: g.misses, strays: g.strays, overs: g.overs, listeners: g.listeners }; }
}
export default HagiaEireneActivity;
