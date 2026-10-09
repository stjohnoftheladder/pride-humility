// Bootstraps the pilgrimage: explore state + triggers + battle/ending flow.
import * as THREE from 'three';
import { LEVEL as LEVEL_CFG, validateLevel, HARBOURS, SITES, ADDITIONS, FEATURES } from './config.js';
import { Materials } from './textures.js';
import { Level } from './level.js';
import { Player } from './player.js';
import { BattleSystem } from './battle/battle.js';
import { ENCOUNTERS, ENCOUNTER_ORDER } from './encounters.js';
import { Branch } from './branch.js';
import { AudioFX } from './audio.js';
import { Hud } from './hud.js';
import { Minimap } from './minimap.js';
import { ChariotRace, RACE_RESULTS } from './race.js';
import { RoadMarket } from './market.js';
import { ACTIVITY_STOPS, nearbyActivity } from './activitySites.js';
import { HarbourCart } from './harbourCart.js';

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
    canvas, antialias: true, powerPreference: 'high-performance',
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
  const minimap = new Minimap(document.getElementById('minimap-canvas'));
  let minimapOn = true;            // the city is long; the map is on to start with
  // The deployed dev build is built with VITE_DEBUG_DEFAULT=1, so the dev tools
  // are simply on there; any other build opts in with ?debug.
  const debugMode = import.meta.env.VITE_DEBUG_DEFAULT === '1'
    || new URLSearchParams(location.search).has('debug');
  if (debugMode) {
    document.getElementById('top-right').style.display = 'flex';
    document.getElementById('dev-hints').style.display = 'block';
    document.getElementById('title-dev').style.display = 'block';
  }
  const materials = new Materials();
  materials.load();

  const level = new Level(scene, materials);
  const spawns = level.build();
  const market = new RoadMarket(level);
  level.npcs = [...market.npcs];
  // Every addition and landmark the approach card knows about, with positions.
  const landmarks = level.landmarks();
  const player = new Player(camera, canvas, level);
  scene.add(camera);

  const branch = Branch.load();
  // Small, feature-owned entry signs make the new activities discoverable.
  for (const stop of ACTIVITY_STOPS) {
    const signCanvas = document.createElement('canvas'); signCanvas.width = 512; signCanvas.height = 96;
    const ink = signCanvas.getContext('2d'); ink.fillStyle = '#20180f'; ink.fillRect(0, 0, 512, 96);
    ink.strokeStyle = '#f3d276'; ink.lineWidth = 5; ink.strokeRect(3, 3, 506, 90);
    ink.fillStyle = '#f3d276'; ink.font = '22px monospace'; ink.textAlign = 'center';
    ink.fillText(stop.label.toUpperCase(), 256, 38); ink.font = '17px monospace'; ink.fillText('APPROACH · E', 256, 72);
    const texture = new THREE.CanvasTexture(signCanvas);
    const marker = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture }));
    marker.name = `activity-${stop.id}`; marker.position.set(stop.x, 2.6, stop.z); marker.scale.set(3.4, 0.64, 1);
    level.featureGroups[stop.id]?.add(marker);
  }
  level.setLadderRevealed(!!branch.encountersDone.pride);
  const battle = new BattleSystem();
  // The chariot race in the Hippodrome, wherever that site is built.
  const hippodrome = SITES.find((s) => s.kind === 'hippodrome');
  const race = hippodrome ? new ChariotRace(level, hippodrome, camera, audio, hud) : null;
  const raceOpen = () => !!race && FEATURES[hippodrome.id] !== false;

  const v = validateLevel();
  if (!v.ok) console.warn('level problems:', v.problems);

  // ----- state -------------------------------------------------------------------
  let state = 'menu';            // menu | explore | battle | race | raceResult | fall | confess | ending | paused
  let resumeTo = 'explore';      // where CONTINUE on the rest screen goes back to
  let startTime = 0;
  let elderIdx = 0;
  let elderCooldown = 0;
  let confessCooldown = 0;
  const armed = { tempter: true, brother: true, pride: true };
  let battleEncounterId = null;
  let encounterReturnPos = null;
  const leaveEncounterButton = document.createElement('button');
  leaveEncounterButton.id = 'leave-encounter';
  leaveEncounterButton.className = 'btn';
  leaveEncounterButton.textContent = 'Leave · Q / Esc';
  leaveEncounterButton.style.cssText = 'position:absolute;right:14px;bottom:34px;z-index:8;font-size:11px;padding:6px 10px;letter-spacing:0;display:none';
  leaveEncounterButton.onclick = leaveEncounter;
  document.getElementById('stage').appendChild(leaveEncounterButton);
  let activeVendor = null;
  let marketChoices = [];
  const marketScreen = document.createElement('div');
  marketScreen.className = 'screen';
  marketScreen.style.display = 'none';
  marketScreen.style.overflowY = 'auto';
  marketScreen.setAttribute('role', 'dialog');
  marketScreen.setAttribute('aria-modal', 'true');
  marketScreen.setAttribute('aria-label', 'Market conversation');
  document.getElementById('confess-screen').parentElement.appendChild(marketScreen);
  const errandHud = document.getElementById('errand-info');
  const playDock = document.createElement('div');
  playDock.id = 'world-play-dock'; document.getElementById('hud').appendChild(playDock);
  function arrangePlayHud() {
    const playing = ['activity', 'cart', 'race'].includes(state)
      || (state === 'paused' && ['activity', 'cart', 'race'].includes(resumeTo));
    playDock.style.display = playing ? 'flex' : 'none';
    for (const id of ['msg', 'world-activity-hud', 'cart-hud', 'race-hud', 'race-call', 'engage-prompt']) {
      const el = document.getElementById(id); if (!el) continue;
      const parent = playing ? playDock : document.getElementById(id === 'engage-prompt' ? 'explore-info' : 'hud');
      if (el.parentElement !== parent) parent.appendChild(el);
    }
  }
  let activities = null;
  const harbourCart = new HarbourCart({ level, player, camera, branch, hud,
    leave: () => { state = 'explore'; hud.setRoom(roomLabel()); },
  });
  function startCart() {
    if (state !== 'explore' || !harbourCart.canBoard(player.pos)) return;
    state = 'cart'; hud.showExplore(); hud.setRoom('The Port of Theodosius'); harbourCart.start();
  }
  async function startActivity(stop) {
    if (state !== 'explore' || FEATURES[stop.id] === false) return;
    if (stop.id === 'harbour') { startCart(); return; }
    state = 'activityLoading';
    hud.showExplore();
    player.clearKeys(); hud.hidePrompt();
    try {
      const module = await import('./activities.js');
      activities ??= new module.LocationActivities({
        level, player, hud, branch, parent: document.getElementById('hud'),
        leave: async () => { state = 'explore'; player.clearKeys(); await player.lock(); },
        onResult: () => { hud.setMeters(branch.pride, branch.grace); hud.revealMeters(); },
      });
      state = 'activity';
      hud.setRoom(stop.id === 'aqueduct' ? 'The Aqueduct of Valens' : 'The Forum of Constantine');
      activities.start(module.ACTIVITIES.find(a => a.id === stop.id));
    } catch (error) {
      state = 'explore';
      hud.message('This activity could not load. Press E to try again.', 3500);
      console.error(error);
    }
  }
  async function closeMarket() {
    marketScreen.style.display = 'none';
    activeVendor = null;
    marketChoices = [];
    state = 'explore';
    player.clearKeys();
    await player.lock();
  }
  function showMarket(npc) {
    activeVendor = npc;
    state = 'market';
    player.clearKeys();
    player.unlock();
    hud.hidePrompt();
    marketScreen.replaceChildren();
    marketScreen.style.display = 'flex';
    const title = document.createElement('h2');
    title.textContent = npc.name;
    const text = document.createElement('p');
    const conversation = market.conversation(npc, branch);
    marketChoices = conversation.choices;
    text.textContent = conversation.paragraphs.join(' ');
    marketScreen.append(title, text);
    const button = (label, action) => {
      const b = document.createElement('button'); b.className = 'btn'; b.textContent = label; b.onclick = action;
      marketScreen.appendChild(b); return b;
    };
    for (const [i, choice] of marketChoices.entries()) button(`${i + 1} · ${choice.label}`, () => resolveMarket(choice.action));
    button('Leave · Escape', closeMarket);
    marketScreen.querySelector('button').focus();
  }
  function resolveMarket(choice) {
    if (!activeVendor || !marketChoices.some(c => c.action === choice)) return;
    const changed = ['humble', 'proud'].includes(choice)
      ? market.choose(activeVendor, choice, branch)
      : market.errandAction(activeVendor, choice, branch);
    if (!changed) return;
    hud.setMeters(branch.pride, branch.grace);
    if (choice !== 'accept') hud.revealMeters();
    showMarket(activeVendor);
  }

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
    if (raceOpen() && race.canBoard(player.pos)) { startRace(); return; }
    const stop = nearbyActivity(player.pos, FEATURES);
    if (stop) { startActivity(stop); return; }
    const citizen = !near('E', 2.6) && !near('A', 2.6) && market.nearest(player.pos);
    if (citizen) {
      if (citizen.trade) showMarket(citizen);
      else hud.message(`${citizen.name}: “${citizen.line}”`, 6500);
      return;
    }
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
    encounterReturnPos = player.pos.clone();
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

  function leaveEncounter() {
    if (state !== 'battle' || battle.done) return;
    battle.keys = {};
    battle.dispose();
    level.group.visible = true;
    player.clearKeys();
    if (encounterReturnPos) player.setStart(encounterReturnPos);
    player.vel.set(0, 0, 0);
    branch.save();
    state = 'explore';
    hud.showExplore();
    hud.setRoom(roomLabel());
    hud.message('You step away. The encounter waits if you choose to return.', 2600);
    leaveEncounterButton.style.display = 'none';
    // Leave mouse capture to the next click, just like other exploration screens.
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

  function startRace() {
    if (state !== 'explore') return;
    state = 'race';
    player.clearKeys();
    hud.hidePrompt();
    hud.setRoom('The Hippodrome');
    race.start();
  }

  /** The race is over: the result screen (moving the meters the first time
   *  only, like the confession's grace), or straight back onto the sand if
   *  the pilgrim stepped down mid-race. */
  function finishRace(res) {
    if (state !== 'race') return;
    race.restoreCamera();
    if (res.outcome === 'abandoned') {
      stepDownFromChariot();
      hud.message('You hand back the reins. The crowd whistles, then forgets you.', 2600);
      return;
    }
    const r = RACE_RESULTS[res.outcome];
    let note = '(You have raced before; the meters do not move again.)';
    if (!branch.flag('raced')) {
      branch.setFlag('raced');
      if (r.flag) branch.setFlag(r.flag);
      if (r.pride) { branch.addPride(r.pride); note = `(+${r.pride} pride)`; }
      if (r.grace) { branch.addGrace(r.grace); note = `(+${r.grace} grace)`; }
      branch.save();
      hud.setMeters(branch.pride, branch.grace);
      hud.revealMeters();
    }
    state = 'raceResult';
    player.unlock();
    hud.showRace(false);
    hud.showRaceResult(r.title, `${r.text(res.place)} ${note}`, r.verse);
    if (res.outcome === 'helped') audio.mercy(); else audio.win();
  }

  /** Back on foot on the north straight, the chariots home on their line. */
  function stepDownFromChariot() {
    race.reset();
    const spot = race.stepDownSpot();
    player.clearKeys();
    player.setStart(new THREE.Vector3(spot.x, 0, spot.z));
    camera.rotation.set(0, spot.yaw, 0);
    state = 'explore';
    hud.showExplore();
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
    if (state === 'cart') { harbourCart.key(e, true); return; }
    if (state === 'activity') { activities.key(e, true); return; }
    if (state === 'activityLoading') return;
    if (state === 'market') {
      if (e.repeat) return;
      if (/^Digit[1-9]$/.test(e.code)) {
        const choice = marketChoices[Number(e.code.slice(5)) - 1];
        if (choice) resolveMarket(choice.action);
      }
      else if (e.code === 'Escape') closeMarket();
      return;
    }
    if (state === 'battle') {
      if (e.code === 'KeyQ' || e.code === 'Escape') { e.preventDefault(); leaveEncounter(); }
      else battle.onKey(e, true);
      return;
    }
    if (state === 'race') {
      if (e.code === 'KeyE') race.help();
      else if (e.code === 'KeyQ') race.abandon();
      else race.onKey(e, true);
      return;
    }
    if (state === 'explore') {
      if (e.code === 'KeyE') { tryEngage(); return; }
      if (e.code === 'KeyM') { minimapOn = !minimapOn; return; }
      // ?debug: instant transport along the road, one stop at a time.
      if (debugMode && (e.code === 'PageDown' || e.code === 'PageUp')) {
        travel(e.code === 'PageDown' ? 1 : -1);
        return;
      }
      // ?debug: 1..9 toggle the additions in ADDITIONS order, so the candidate
      // sites and the quarter can be walked one at a time without reloading.
      if (debugMode && /^Digit[1-9]$/.test(e.code)) {
        if (e.repeat || e.ctrlKey || e.altKey || e.metaKey) return;
        const addition = ADDITIONS[Number(e.code.slice(5)) - 1 + (e.shiftKey ? 9 : 0)];
        if (addition) {
          const now = level.setFeature(addition.id, FEATURES[addition.id] === false);
          hud.message(`${addition.label} ${now ? 'on' : 'off'}`, 1400);
        }
        return;
      }
      player.onKey(e, true);
    }
  });
  window.addEventListener('keyup', (e) => {
    if (state === 'cart') { harbourCart.key(e, false); return; }
    if (state === 'activity') { activities.key(e, false); return; }
    if (state === 'battle') { battle.onKey(e, false); return; }
    if (state === 'race') { race.onKey(e, false); return; }
    if (state === 'explore') player.onKey(e, false);
  });

  let dragLook = false;
  canvas.addEventListener('mousedown', async (e) => {
    if (state === 'explore' || state === 'race' || state === 'cart' || state === 'activity') {
      if (document.pointerLockElement !== canvas) dragLook = true;
      if (document.pointerLockElement === canvas) return;
      await player.lock();
    }
  });
  window.addEventListener('mousemove', (e) => {
    if (state !== 'explore' && state !== 'race' && state !== 'cart' && state !== 'activity') return;
    const captured = document.pointerLockElement === canvas;
    if (!captured && !dragLook) return;
    const s = 0.0026;
    if (state === 'race') { race.lookBy(e.movementX * s, e.movementY * s); return; }
    if (state === 'cart') { harbourCart.lookBy(e.movementX * s, e.movementY * s); return; }
    camera.rotation.y -= e.movementX * s;
    camera.rotation.x -= e.movementY * s;
    camera.rotation.x = Math.max(-1.5, Math.min(1.5, camera.rotation.x));
  });
  window.addEventListener('mouseup', () => { dragLook = false; });

  document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement === canvas) {
      if (state === 'menu') { state = 'explore'; hud.showExplore(); }
      else if (state === 'paused') { state = resumeTo; resumeTo = 'explore'; hud.hidePause(); audio.resume(); }
    } else if (state === 'explore' || state === 'race' || state === 'cart' || state === 'activity') {
      if (state === 'race') race.keys = {};   // a key let go on the rest screen never reaches the race
      if (state === 'cart') harbourCart.keys = {};
      if (state === 'activity') { activities.keys = {}; player.clearKeys(); }
      resumeTo = state;
      state = 'paused';
      hud.hidePrompt();
      hud.showPause();
      audio.suspend();            // the rest screen is quiet
    }
  });

  // Leaving the tab or window silences the game; coming back restores it,
  // unless the pilgrim is resting on the pause screen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) audio.suspend();
    else if (audio.ctx && state !== 'paused') audio.resume();
  });

  const enterDragFallback = (message = true) => {
    if (state === 'menu' || state === 'paused') {
      state = resumeTo;
      resumeTo = 'explore';
      hud.hidePause();
      audio.resume();
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
  hud.onRaceContinue = async () => {
    stepDownFromChariot();
    await player.lock();
  };

  // ----- update ------------------------------------------------------------------------
  function isInRoom(r) {
    const x = Math.floor(player.pos.x / 3), z = Math.floor(player.pos.z / 3);
    return x >= r.x && x < r.x + r.w && z >= r.y && z < r.y + r.h;
  }

  /** A wing counts only while it is live: turning it off empties its quay. */
  function wingLive(w) { return FEATURES[w.id] !== false; }
  const wingGate = (w) => ({ x: w.gateX, y: w.stairY0, w: 1, h: w.wall.y - w.stairY0 + 1 });

  // ----- the approach card, and the dev's instant transport -----------------
  // Walk up to a landmark and it names itself: what it was, for the player.
  // (The dev keys live in the DEV panel, not here.) It is a caption, not a
  // threshold; nothing in the world gates on it.
  const CARD_RANGE = 7;          // world units, from a landmark's point
  // From a roadside site's footprint: the road is 15 units wide, so anywhere
  // on the road beside a site is in range. Where two sites' reach overlaps,
  // the nearer one wins.
  const CARD_RANGE_BOX = 15;
  let cardFor = null;

  function cardDistance(l) {
    if (!l.box) return Math.hypot(player.pos.x - l.x, player.pos.z - l.z);
    const dx = Math.max(l.box.minX - player.pos.x, 0, player.pos.x - l.box.maxX);
    const dz = Math.max(l.box.minZ - player.pos.z, 0, player.pos.z - l.box.maxZ);
    return Math.hypot(dx, dz) * (CARD_RANGE / CARD_RANGE_BOX);   // same scale as a point
  }

  function updateSiteCard() {
    let near = null, best = CARD_RANGE;
    for (const l of landmarks) {
      if (!l.fixed && FEATURES[l.id] === false) continue;   // a hidden addition says nothing
      const d = cardDistance(l);
      if (d < best) { best = d; near = l; }
    }
    if (!near) { hud.showSiteCard(false); cardFor = null; return; }
    if (near !== cardFor) {
      cardFor = near;
      hud.setSiteCard({ label: near.label, note: near.note });
    }
    hud.showSiteCard(true);
  }

  // Instant transport north and south (?debug, PageUp / PageDown): the stops of
  // the walk, in order, so a dev can be anywhere in a keystroke.
  const CELL_W = 3;
  const WAYPOINTS = (() => {
    const { court, ladder } = LEVEL_CFG.rooms;
    const stop = (name, cx, cy, yaw) => ({ name, x: (cx + 0.5) * CELL_W, z: (cy + 0.5) * CELL_W, yaw });
    return [
      stop('The Gate Court', court.x + 4, court.y + 2),
      stop('The Bottom Spine', 17, 13),
      stop('The Pilgrim Way', 17, 55),
      ...SITES.filter((s) => s.approach).map((s) =>
        stop(s.label, s.approach.x - 0.5, s.approach.y - 0.5,
          s.area.x < 15 ? Math.PI / 2 : -Math.PI / 2)),
      stop('The Ladder Chamber', ladder.x + 2, ladder.y + 2),
      stop('Hagia Sophia', 17, 103, -Math.PI / 2),   // looking east, up at the dome
      stop('The Chapel', 17, 110),
      stop('The Port of Theodosius', 17, 118),
    ].sort((a, b) => a.z - b.z);
  })();
  let waypoint = 0;
  function travel(step) {
    waypoint = (waypoint + step + WAYPOINTS.length) % WAYPOINTS.length;
    const w = WAYPOINTS[waypoint];
    player.keys = {};
    player.pos.set(w.x, 0, w.z);
    player.vel.set(0, 0, 0);
    camera.position.set(w.x, camera.position.y, w.z);
    if (w.yaw !== undefined) camera.rotation.y = w.yaw;
    hud.message(`${w.name}  (${waypoint + 1}/${WAYPOINTS.length})`, 1500);
  }

  function roomLabel() {
    const { court, chapel, tempter, brother, ladder } = LEVEL_CFG.rooms;
    if (isInRoom(court)) return 'The Gate Court';
    if (isInRoom(chapel)) return 'The Chapel';
    if (isInRoom(tempter)) return 'The Tempter\u2019s Chamber';
    if (isInRoom(brother)) return 'The Brother\u2019s Cell';
    if (isInRoom(ladder)) return 'The Ladder Chamber';
    // every live wing answers to the one name for now (they are candidate sites)
    if (HARBOURS.some((w) => wingLive(w) && isInRoom(w.quay))) return 'The Port of Theodosius';
    if (HARBOURS.some((w) => wingLive(w) && isInRoom(wingGate(w)))) return 'The Sea Gate';
    if (raceOpen() && isInRoom(hippodrome.area)) return 'The Hippodrome';
    return 'The Pilgrim Way';
  }

  function update(dt, time) {
    arrangePlayHud();
    if (debugMode) document.getElementById('dev-hints').style.display = ['cart', 'activity'].includes(state) ? 'none' : 'block';
    if (state === 'cart') harbourCart.update(dt);
    leaveEncounterButton.style.display = state === 'battle' && !battle.done ? 'block' : 'none';
    if (state === 'activity') activities.update(dt);
    const objective = state === 'explore' ? market.objective(branch, player.pos) : null;
    errandHud.textContent = objective ?? '';
    errandHud.style.display = objective ? 'block' : 'none';
    if (state === 'explore') market.update(dt, time, player.pos);
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
      else if (raceOpen() && race.canBoard(player.pos)) promptText = 'The Greens need a driver: press E to take the reins';
      else if (nearbyActivity(player.pos, FEATURES)) promptText = `${nearbyActivity(player.pos, FEATURES).label} — press E`;
      else if (market.nearest(player.pos)) promptText = `Speak with ${market.nearest(player.pos).name} — press E`;
      else if (branch.encountersDone.pride && isInRoom(LEVEL_CFG.rooms.ladder)) promptText = 'Follow the gold path to THE LADDER';
      if (promptText) hud.showPrompt(promptText); else hud.hidePrompt();

      if (near('L', 1.6) && branch.encountersDone.pride) {
        finishEnding();
      }
      elderCooldown = Math.max(0, elderCooldown - dt);
      confessCooldown = Math.max(0, confessCooldown - dt);

      // a live harbour wing fades its surf over the street ambience
      audio.setHarbour(HARBOURS.some((w) => wingLive(w) && isInRoom(w.quay)));

      const label = roomLabel();
      if (label !== hud.el.room.textContent) hud.setRoom(label);
    }

    // The map and the index are part of the explore HUD: they go for battle too.
    hud.setMinimap(state === 'explore' && minimapOn);
    if (state === 'explore') {
      minimap.update(player.pos.x, player.pos.z, camera.rotation.y);
      updateSiteCard();
    } else {
      hud.showSiteCard(false);
    }

    if (state === 'race') {
      const res = race.update(dt);
      if (res) finishRace(res);
    }
    race?.animate(dt, time, player.pos);
    hud.showRace(state === 'race');

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
      market,
      activityStops: ACTIVITY_STOPS,
      activities: () => activities,
      harbourCart,
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
      // mini-map + the feature registry, so a test can drive both
      minimap,
      minimapOn: () => minimapOn,
      setMinimap: (on) => { minimapOn = !!on; },
      features: () => ({ ...FEATURES }),
      setFeature: (id, on) => level.setFeature(id, on),
      harbours: () => HARBOURS.map((wing) => JSON.parse(JSON.stringify(wing))),
      sites: () => SITES.map((site) => JSON.parse(JSON.stringify(site))),
      additions: () => ADDITIONS.map((a) => ({ ...a, on: FEATURES[a.id] !== false })),
      landmarks: () => landmarks.map((l) => ({ ...l })),
      waypoints: () => WAYPOINTS.map((w) => ({ ...w })),
      travel,
      audioState: () => audio.ctx?.state ?? 'none',
      race: race && {
        start: () => startRace(),
        canBoard: () => raceOpen() && race.canBoard(player.pos),
        boardSpot: () => ({ x: race.me.x + 3.4, z: race.me.z }),
        snapshot: () => race.snapshot(),
        /** run the race frame by frame at 60 fps, holding these keys */
        tick: (frames, keys = {}) => {
          race.keys = { ...keys };
          let res = null;
          for (let f = 0; f < frames && !res && state === 'race'; f++) {
            res = race.update(1 / 60);
            if (res) finishRace(res);
          }
          race.keys = {};
          return res && { ...res };
        },
        /** drive like a player would: steer at a point on the racing line ahead */
        autopilot: (frames, { lane = 0.9, ahead = 3.2, lash = false } = {}) => {
          let res = null;
          for (let f = 0; f < frames && !res && state === 'race'; f++) {
            const me = race.me;
            const s = race.track.project(me.x, me.z) + ahead;
            const p = race.track.at(s, lane);
            let turn = Math.atan2(p.z - me.z, p.x - me.x) - me.heading;
            turn = Math.atan2(Math.sin(turn), Math.cos(turn));
            race.keys = { KeyW: true, KeyD: turn > 0.05, KeyA: turn < -0.05 };
            if (lash && race.lash > 0.95) race.layOnLash();
            res = race.update(1 / 60);
            if (res) finishRace(res);
          }
          race.keys = {};
          return res && { ...res };
        },
        advance: (o) => race.debugAdvance(o),
        stopByWreck: () => race.debugStopBy(race.crashSpot),
      },
    };
  }
}

boot().catch((err) => {
  console.error(err);
  document.getElementById('fatal')?.classList.add('show');
  document.getElementById('fatal-msg').textContent = String(err?.message || err);
});
