// Bootstraps the pilgrimage: explore state + triggers + battle/ending flow.
import * as THREE from 'three';
import { LEVEL as LEVEL_CFG, validateLevel } from './config.js';
import { Materials } from './textures.js';
import { Level } from './level.js';
import { Player } from './player.js';
import { BattleSystem } from './battle/battle.js';
import { ENCOUNTERS, ENCOUNTER_ORDER } from './encounters.js';
import { Branch } from './branch.js';
import { AudioFX } from './audio.js';
import { Hud } from './hud.js';

// ----- content (drafted; refined in the content pass) --------------------------
const ELDER_LINES = [
  'The elder: \u201CYou come to climb the Ladder. Good. But know this —\u201D',
  '\u201CThe proud man climbs to be seen. The humble man climbs to see.\u201D',
  '\u201CWhen you fall, do not despair. Rise, and pray: Lord Jesus Christ, have mercy on me, a sinner.\u201D',
];
const FALL_TEXT = {
  tempter: 'Greed pricks the heart. The gold scatters; the demon laughs.',
  brother: 'The wound reopens. The cell grows colder.',
  pride: 'The darkness closes in. \u201CSee how strong you are,\u201D it whispers.',
};

const ENDINGS = {
  humble: {
    title: 'THE LADDER IS NOT CLIMBED',
    text(branch) {
      const t = [];
      if (branch.flag('sparedTempter')) t.push('The Tempter you spared became your defender against the next temptation — and you found you could refuse the gold. What you thought were losses were healings.');
      else t.push('You turned from the gold when it mattered. Freedom tastes better than wealth.');
      if (branch.flag('forgaveBrother')) t.push('The Brother you forgave prays for you now, from the cell you warmed.');
      else t.push('You passed the wounded man without striking. His silence blesses you.');
      t.push('At the gate, the light does not shine FOR you — it receives you. You have not conquered; you have been forgiven.');
      return t.join(' ');
    },
    verse: '"God opposes the proud, but gives grace to the humble." — James 4:6',
  },
  mixed: {
    title: 'A PARTLY-WASHED PILGRIM',
    text(branch) {
      const t = ['You climbed with one hand on the Ladder and one on your own reputation. The gate opens — but you notice you are still carrying the coins,'];
      if (branch.flag('killedTempter')) t.push('the demon\u2019s dust on your hands,');
      else t.push('the weight of what you refused to forgive,');
      t.push('and the brother\u2019s face still haunts you. The way is not closed to you, but you must walk it again, lighter.');
      return t.join(' ');
    },
    verse: '"Come to your senses, and do not sin." — 1 Corinthians 15:34',
  },
  proud: {
    title: 'THE EMPTY SUMMIT',
    text(branch) {
      const t = ['You stand where the demon stood — alone, triumphant, and utterly still. Everything is yours:'];
      if (branch.flag('killedTempter') && branch.flag('killedPride')) t.push('two victories, two dust-heaps, and a silence that follows you.');
      else t.push('the victory, the gold, and the silence.');
      t.push('No one waits at the top of your Ladder. No one ever did.');
      return t.join(' ');
    },
    verse: '"How you have fallen from heaven, O day star!" — Isaiah 14:12',
  },
};

async function boot() {
  const canvas = document.getElementById('game');
  const renderer = new THREE.WebGLRenderer({
    canvas, antialias: false, powerPreference: 'high-performance',
    preserveDrawingBuffer: true,
  });
  renderer.setSize(640, 360, false);
  renderer.setPixelRatio(1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x9cc9e8);
  scene.fog = new THREE.Fog(0xcfe3f2, 18, 62);

  const camera = new THREE.PerspectiveCamera(75, 640 / 360, 0.1, 80);
  // First-person look must yaw around the world-up axis before applying local
  // pitch. The default XYZ order couples these rotations and makes the horizon
  // sway diagonally after combined horizontal/vertical mouse movement.
  camera.rotation.order = 'YXZ';

  const audio = new AudioFX();
  const hud = new Hud();
  const debugMode = new URLSearchParams(location.search).has('debug');
  if (debugMode) document.getElementById('top-right').style.display = 'flex';
  const materials = new Materials();
  materials.load();

  const level = new Level(scene, materials);
  const spawns = level.build();
  const player = new Player(camera, canvas, level);
  scene.add(camera);

  const branch = Branch.load();
  level.setLadderRevealed(!!branch.encountersDone.pride);
  const battle = new BattleSystem();

  const v = validateLevel();
  if (!v.ok) console.warn('level problems:', v.problems);

  // ----- state -------------------------------------------------------------------
  let state = 'menu';            // menu | explore | battle | fall | confess | ending | paused
  let startTime = 0;
  let elderIdx = 0;
  let elderCooldown = 0;
  let confessCooldown = 0;
  const armed = { tempter: true, brother: true, pride: true };
  let battleEncounterId = null;

  player.setStart(spawns.S[0]);
  // Face the fountain and chapel route, not the north wall. The first frame
  // should invite movement into the pilgrimage.
  camera.rotation.y = -Math.PI / 2;
  hud.setMeters(branch.pride, branch.grace);
  if (branch.pride > 0 || branch.grace > 0) hud.revealMeters();
  hud.setRoom('The Gate Court');

  // ----- trigger positions ----------------------------------------------------------
  const triggerPos = (key) => spawns[key][0];
  const TRIGGER_KEY = { tempter: 'K', brother: 'B', pride: 'P' };

  /** Pressing E near a figure engages it (enemy threshold, elder, altar). */
  function tryEngage() {
    if (state !== 'explore') return;
    if (armed.tempter && near('K', 2.4)) { startEncounter('tempter'); return; }
    if (armed.brother && near('B', 2.4)) { startEncounter('brother'); return; }
    if (armed.pride && near('P', 2.4)) { startEncounter('pride'); return; }
    if (near('E', 2.4) && elderCooldown <= 0) {
      hud.message(ELDER_LINES[elderIdx % ELDER_LINES.length], 3200);
      if (elderIdx < ELDER_LINES.length) {
        branch.addGrace(2);
        hud.revealMeters();
      }
      elderIdx++;
      elderCooldown = 6;
      return;
    }
    if (near('A', 2.4) && confessCooldown <= 0) {
      state = 'confess';
      hud.showConfess('\u201CConfess your wanderings, child, and be restored.\u201D');
    }
  }
  const near = (key, r = 1.4) => {
    const p = triggerPos(key);
    return Math.hypot(player.pos.x - p.x, player.pos.z - p.z) < r;
  };

  function startEncounter(id) {    if (state !== 'explore') return;
    const def = ENCOUNTERS[id];
    state = 'battle';
    battleEncounterId = id;
    hud.setRoom(def.room);
    // Free the mouse for the battle and hide the monastery so only the 2D
    // screen shows.
    player.unlock();
    player.clearKeys();
    hud.hidePrompt();
    level.group.visible = false;
    battle.start(def, { hud, branch, audio, player, level, scene, renderer, camera });
  }

  function finishEncounter(outcome) {
    const def = ENCOUNTERS[battleEncounterId];
    const id = battleEncounterId;
    level.group.visible = true; // bring the monastery back after any outcome
    player.clearKeys();         // a key released during battle never reached us
    if (outcome === 'spared' || outcome === 'defeated') {
      // the threshold is passed — its world figure departs
      const we = level.worldEnemies[id];
      if (we) { we.sprite.mesh.visible = false; we.shadow.mesh.visible = false; }
      branch.encountersDone[id] = outcome;
      if (id === 'pride') level.setLadderRevealed(true);
      armed[id] = false;
      const o = def.outcomes?.[outcome] ?? {};
      if (o.grace) branch.addGrace(o.grace);
      if (o.pride) branch.addPride(o.pride);
      if (o.flags) for (const k of o.flags) branch.setFlag(k);
      branch.save();
      const thresholdMessages = {
        tempter: {
          spared: 'The Tempter shrinks back into the dark. The way onward opens.',
          defeated: 'Counterfeit coins settle into dust. The way opens, but the chamber feels colder.',
        },
        brother: {
          spared: 'The Brother turns, and for a moment, the cell is warm.',
          defeated: 'The Brother lies still. The way opens, and the cell keeps its cold.',
        },
        pride: {
          spared: 'The darkness thins. Follow the gold path to THE LADDER.',
          defeated: 'The shadow breaks. Follow the gold path to THE LADDER.',
        },
      };
      hud.message(thresholdMessages[id]?.[outcome] ?? 'The threshold is passed.', 2600);
      state = 'explore';
      hud.showExplore();
    } else if (outcome === 'fell') {
      branch.defeats += 1;
      branch.save();
      state = 'fall';
      hud.showFall(FALL_TEXT[id] ?? 'The pilgrim falls.');
      // step the pilgrim back so the trigger re-arms
      armed[id] = true;
      const t = triggerPos(TRIGGER_KEY[id] ?? 'K');
      player.pos.set(t.x + 2.2, 0, t.z + 2.2);
      player.vel.set(0, 0, 0);
    }
    hud.setMeters(branch.pride, branch.grace);
    hud.revealMeters();
  }

  function confess() {
    const receivesGrace = !branch.confessionGraceReceived;
    branch.hp = 20;
    if (receivesGrace) {
      branch.addGrace(6);
      branch.confessionGraceReceived = true;
    }
    branch.confessions += 1;
    branch.provisions = 3;
    branch.save();
    state = 'explore';
    hud.showExplore();
    hud.setMeters(branch.pride, branch.grace);
    if (receivesGrace) hud.revealMeters();
    hud.message(
      receivesGrace
        ? '\u201CGo in peace, child. Rise, and sin no more.\u201D (+6 grace)'
        : '\u201CGrace is not a tally. Your heart is restored; now walk.\u201D',
      3000,
    );
    // step off the altar so it doesn't re-trigger
    const a = triggerPos('A');
    player.pos.set(a.x - 2.2, 0, a.z);
    player.vel.set(0, 0, 0);
    confessCooldown = 4;
  }

  function finishEnding() {
    const d = branch.disposition();
    const e = ENDINGS[d];
    state = 'ending';
    player.unlock();
    hud.showEnding(e.title, e.text(branch), e.verse);
    audio.win();
  }

  // ----- input ------------------------------------------------------------------------
  window.addEventListener('keydown', (e) => {
    if (state === 'battle') { battle.onKey(e, true); return; }
    if (state === 'explore') {
      if (e.code === 'KeyE') { tryEngage(); return; }
      player.onKey(e, true);
    }
  });
  window.addEventListener('keyup', (e) => {
    if (state === 'battle') { battle.onKey(e, false); return; }
    if (state === 'explore') player.onKey(e, false);
  });

  let dragLook = false;
  canvas.addEventListener('mousedown', async (e) => {
    if (state === 'explore') {
      if (document.pointerLockElement !== canvas) dragLook = true;
      if (document.pointerLockElement === canvas) return;
      await player.lock();
    }
  });
  window.addEventListener('mousemove', (e) => {
    if (state !== 'explore') return;
    const captured = document.pointerLockElement === canvas;
    if (!captured && !dragLook) return;
    const s = 0.0026;
    camera.rotation.y -= e.movementX * s;
    camera.rotation.x -= e.movementY * s;
    camera.rotation.x = Math.max(-1.5, Math.min(1.5, camera.rotation.x));
  });
  window.addEventListener('mouseup', () => { dragLook = false; });

  document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement === canvas) {
      if (state === 'menu') { state = 'explore'; hud.showExplore(); }
      else if (state === 'paused') { state = 'explore'; hud.hidePause(); }
    } else if (state === 'explore') {
      state = 'paused';
      hud.hidePrompt();
      hud.showPause();
    }
  });

  const enterDragFallback = (message = true) => {
    if (state === 'menu' || state === 'paused') {
      state = 'explore';
      hud.hidePause();
      hud.showExplore();
      if (message) hud.message('Mouse capture unavailable — hold mouse button & drag to look', 3600);
    }
  };

  hud.onStart = async () => {
    audio.resume();
    audio.ensure();
    audio.startAmbient();
    if (startTime === 0) startTime = performance.now();
    const locked = await player.lock();
    if (!locked || !document.pointerLockElement) enterDragFallback();
  };
  hud.onResume = async () => {
    const locked = await player.lock();
    if (!locked || !document.pointerLockElement) enterDragFallback(false);
  };
  hud.onRestart = () => { branch.clearSave(); location.reload(); };
  hud.onMute = () => { audio.resume(); hud.message(audio.toggleMute() ? 'Sound muted' : 'Sound on', 1200); };
  hud.onFallContinue = () => {
    branch.hp = 20;
    state = 'explore';
    hud.showExplore();
    hud.setMeters(branch.pride, branch.grace);
    hud.message('Repentance restores the heart. Rise, and try again.', 2200);
  };
  hud.onConfess = () => confess();

  // ----- update ------------------------------------------------------------------------
  function isInRoom(r) {
    const x = Math.floor(player.pos.x / 3), z = Math.floor(player.pos.z / 3);
    return x >= r.x && x < r.x + r.w && z >= r.y && z < r.y + r.h;
  }

  function roomLabel() {
    const { court, chapel, tempter, brother, ladder } = LEVEL_CFG.rooms;
    if (isInRoom(court)) return 'The Gate Court';
    if (isInRoom(chapel)) return 'The Chapel';
    if (isInRoom(tempter)) return 'The Tempter\u2019s Chamber';
    if (isInRoom(brother)) return 'The Brother\u2019s Cell';
    if (isInRoom(ladder)) return 'The Ladder Chamber';
    return 'The Pilgrim Way';
  }

  function update(dt, time) {
    if (state === 'explore' || state === 'paused') {
      if (state === 'explore') player.update(dt);
      // world mood shifts with the heart (daylight base, cooling into dusk-red)
      const hemi = level.group.children.find((c) => c.isHemisphereLight);
      if (hemi) {
        const prideT = branch.pride / 100;
        hemi.color.setHex(0xbfd8ef).lerp(new THREE.Color(0x5c2a1e), prideT * 0.55);
        hemi.intensity = 1.0 - prideT * 0.28;
      }
      level.gateLight.intensity = 18 + (branch.grace / 100) * 20;
    }

    if (state === 'explore') {
      // Figures wait for a deliberate interaction; proximity only teaches E.
      let promptText = null;
      if (armed.tempter && near('K', 2.6)) promptText = 'Face the Tempter — press E';
      else if (armed.brother && near('B', 2.6)) promptText = 'Face the Wounded Brother — press E';
      else if (armed.pride && near('P', 2.6)) promptText = 'Face the Demon of Pride — press E';
      else if (near('E', 2.6)) promptText = 'Speak with the Elder — press E';
      else if (near('A', 2.6)) promptText = 'Confess at the altar — press E';
      else if (branch.encountersDone.pride && isInRoom(LEVEL_CFG.rooms.ladder)) promptText = 'Follow the gold path to THE LADDER';
      if (promptText) hud.showPrompt(promptText); else hud.hidePrompt();

      if (near('L', 1.6) && branch.encountersDone.pride) {
        finishEnding();
      }
      elderCooldown = Math.max(0, elderCooldown - dt);
      confessCooldown = Math.max(0, confessCooldown - dt);

      const label = roomLabel();
      if (label !== hud.el.room.textContent) hud.setRoom(label);
    }

    if (state === 'battle') {
      const res = battle.update(dt, time);
      if (res) {
        battle.dispose();
        finishEncounter(res.outcome);
      }
    }

    level.update(dt, time, camera);
    hud.setMeters(branch.pride, branch.grace);
  }

  function frame() {
    requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    time += dt;
    update(dt, time);
    renderer.render(scene, battle.active ? battle.camera : camera);
    fpsFrames++;
    fpsTime += dt;
    if (fpsTime >= 0.5) { hud.setFps(fpsFrames / fpsTime); fpsFrames = 0; fpsTime = 0; }
  }

  const clock = new THREE.Clock();
  let time = 0, fpsFrames = 0, fpsTime = 0;
  frame();

  // ----- debug / test hook --------------------------------------------------------------
  if (debugMode) {
    window.__game = {
      state: () => state,
      setState: (s) => { state = s; },
      player,
      branch,
      level,
      hud,
      battle,
      tickBattle: (frames, praying) => {
        if (praying) battle.keys.Space = true;
        let r = null;
        for (let f = 0; f < frames; f++) { r = battle.update(0.016, f * 0.016); if (r) break; }
        if (praying) battle.keys.Space = false;
        return r;
      },
      key: (code) => {
        window.dispatchEvent(new KeyboardEvent('keydown', { code }));
        window.dispatchEvent(new KeyboardEvent('keyup', { code }));
      },
      scene,
      camera,
      renderer,
      armed: () => ({ ...armed }),
      teleport: (x, z) => { player.pos.set(x, 0, z); player.vel.set(0, 0, 0); player.camera.position.set(x, player.camera.position.y, z); },
      startEncounter: (id) => { armed[id] = true; startEncounter(id); },
      forceEnding: (d) => { const e = ENDINGS[d]; state = 'ending'; hud.showEnding(e.title, e.text(branch), e.verse); },
      triggers: () => ({ K: spawns.K[0], B: spawns.B[0], P: spawns.P[0], A: spawns.A[0], E: spawns.E[0], L: spawns.L[0] }),
      finish: (o) => finishEncounter(o),
      roomLabel,
    };
  }
}

boot().catch((err) => {
  console.error(err);
  document.getElementById('fatal')?.classList.add('show');
  document.getElementById('fatal-msg').textContent = String(err?.message || err);
});
