// Playwright end-to-end tests for Pride & Humility.
// Drives both full journeys (humility run, pride run) with keyboard input
// only, asserts the branch state and endings, and fails on unexpected
// console errors. Run: npm test  (builds then serves via vite preview).
import { chromium } from 'playwright';
import { spawn, execSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PORT = 5310;

function startServer() {
  execSync('npx vite build', { cwd: ROOT, stdio: 'inherit' });
  const proc = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
    cwd: ROOT,
    stdio: 'ignore',
    shell: process.platform === 'win32',
  });
  return proc;
}

async function waitForServer(url) {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch { /* not up yet */ }
    await sleep(250);
  }
  throw new Error('vite preview did not start');
}

let failures = 0;
let checks = 0;
function check(name, ok, detail) {
  checks++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  if (!ok) failures++;
}

const ALLOWED_CONSOLE = [
  /favicon\.ico/,
  /Pointer Lock API/,
];

async function newPage(browser) {
  const page = await browser.newPage();
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (ALLOWED_CONSOLE.some((re) => re.test(text))) return;
    errors.push(text);
  });
  page.on('pageerror', (err) => errors.push('PAGEERROR: ' + err.message));
  await page.goto(`http://localhost:${PORT}/?debug`);
  await page.waitForFunction(() => window.__game);
  return { page, errors };
}

async function resetState(page) {
  await page.evaluate(() => {
    const g = window.__game;
    g.branch.clearSave();
    localStorage.clear();
    g.branch.pride = 0; g.branch.grace = 0;
    g.branch.flags = {}; g.branch.encountersDone = {};
    g.branch.confessionGraceReceived = false;
    g.branch.confessions = 0; g.branch.prayerUses = 0;
    g.branch.hp = 20; g.branch.provisions = 3;
    document.getElementById('meters').classList.remove('revealed');
    g.setState('explore');
  });
}

async function doIntro(page) {
  await page.evaluate(() => {
    const g = window.__game;
    const n = g.battle._introLines().length;
    for (let i = 0; i < n; i++) g.key('KeyZ');
    g.tickBattle(3);
  });
}

async function spareBattle(page, prays, waits) {
  return page.evaluate(async ({ prays, waits }) => {
    const g = window.__game;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const dodgeTurn = (pray) => {
      const directions = ['KeyD', 'KeyW', 'KeyA', 'KeyS'];
      let result = null;
      for (let frame = 0; frame < 520 && g.battle.phase === 'enemy' && !result; frame++) {
        for (const key of directions) g.battle.keys[key] = false;
        g.battle.keys[directions[Math.floor(frame / 35) % directions.length]] = true;
        // Short prayer pulses keep the shield sustainable while still requiring
        // the deliberate hold gesture long enough to receive one prayer moment.
        g.battle.keys.Space = pray && frame % 50 < 18;
        result = g.battle.update(0.016, frame * 0.016);
      }
      for (const key of [...directions, 'Space']) g.battle.keys[key] = false;
      return result;
    };
    for (let i = 0; i < prays + waits; i++) {
      g.key('KeyD'); g.key('KeyD'); g.key('Enter');
      dodgeTurn(i < prays);
    }
    g.key('KeyD'); g.key('KeyD'); g.key('Enter');
    const r = g.tickBattle(400);
    await sleep(1800); // let the main loop apply the outcome
    return r;
  }, { prays, waits });
}

async function fightToKill(page) {
  return page.evaluate(async () => {
    const g = window.__game;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    let r = null, fights = 0;
    for (let i = 0; i < 14 && !r; i++) {
      g.key('KeyZ');
      g.battle.barMarker = 0.35;
      g.key('KeyZ');
      fights++;
      r = g.tickBattle(450);
    }
    await sleep(1800);
    return { r, fights };
  });
}

async function runJourney(browser, mode) {
  const { page, errors } = await newPage(browser);
  await resetState(page);
  const log = {};

  if (mode === 'humble') {
    // confession x2: restoration repeats, grace does not become farmable
    await page.evaluate(async () => {
      const g = window.__game;
      // Read the altar's cell off the level itself: the map can be re-laid out
      // without the tests pinning the old world coordinates.
      const altar = g.triggers().A;
      for (let i = 0; i < 2; i++) {
        g.teleport(altar.x, altar.z);
        await new Promise((r) => setTimeout(r, 350));
        g.key('KeyE');
        document.getElementById('confess-btn').click();
        await new Promise((r) => setTimeout(r, 250));
      }
    });
    log.afterConfess = await page.evaluate(() => window.__game.branch.grace);
    for (const id of ['tempter', 'brother', 'pride']) {
      await page.evaluate((id) => { const g = window.__game; g.startEncounter(id); }, id);
      await page.waitForFunction((id) => window.__game.battle.def?.id === id, id);
      await doIntro(page);
      const r = await spareBattle(page, id === 'pride' ? 2 : 1, id === 'pride' ? 0 : 1);
      log[id] = r?.outcome;
    }
    await page.evaluate(() => {
      const g = window.__game, gate = g.triggers().L;   // the Ladder gate cell
      g.teleport(gate.x, gate.z);
    });
    await sleep(900);
    log.endingTitle = await page.evaluate(() => document.getElementById('ending-title').textContent);
    log.final = await page.evaluate(() => {
      const b = window.__game.branch;
      return { grace: b.grace, pride: b.pride, done: b.encountersDone, flags: b.flags };
    });
  } else {
    for (const id of ['tempter', 'brother', 'pride']) {
      await page.evaluate((id) => { const g = window.__game; g.startEncounter(id); }, id);
      await page.waitForFunction((id) => window.__game.battle.def?.id === id, id);
      await doIntro(page);
      log[id] = (await fightToKill(page)).r?.outcome;
    }
    await page.evaluate(() => {
      const g = window.__game, gate = g.triggers().L;   // the Ladder gate cell
      g.teleport(gate.x, gate.z);
    });
    await sleep(900);
    log.endingTitle = await page.evaluate(() => document.getElementById('ending-title').textContent);
    log.final = await page.evaluate(() => {
      const b = window.__game.branch;
      return { grace: b.grace, pride: b.pride, done: b.encountersDone };
    });
  }
  log.consoleErrors = errors;
  await page.close();
  return log;
}

async function runInteractionRegressions(browser) {
  const { page, errors } = await newPage(browser);

  await page.getByRole('button', { name: 'BEGIN THE PILGRIMAGE' }).click();
  await sleep(250);
  check('input: rejected pointer lock falls back without page errors', errors.length === 0, JSON.stringify(errors));
  await resetState(page);

  const openingYaw = await page.evaluate(() => window.__game.camera.rotation.y);
  check(
    'opening: faces into the pilgrimage route',
    Math.abs(openingYaw + Math.PI / 2) < 0.01,
    `yaw ${openingYaw.toFixed(2)}`,
  );

  const lookAxes = await page.evaluate(() => {
    const camera = window.__game.camera;
    camera.rotation.y += 0.7;
    camera.rotation.x -= 0.4;
    return { order: camera.rotation.order, roll: camera.rotation.z };
  });
  check(
    'input: combined mouse look keeps the horizon level',
    lookAxes.order === 'YXZ' && Math.abs(lookAxes.roll) < 1e-9,
    JSON.stringify(lookAxes),
  );

  const quietUi = await page.evaluate(() => ({
    crosshair: !!document.getElementById('crosshair'),
    tutorial: !!document.getElementById('battle-help'),
    fpsDisplay: getComputedStyle(document.getElementById('top-right')).display,
    titleMentionsBattle: document.getElementById('title-screen').textContent.includes('In battle'),
  }));
  check(
    'ui: removes permanent crosshair/tutorial while preserving debug telemetry',
    !quietUi.crosshair && !quietUi.tutorial && quietUi.fpsDisplay !== 'none'
      && !quietUi.titleMentionsBattle,
    JSON.stringify(quietUi),
  );

  const story = await page.evaluate(() => {
    const group = window.__game.level.storytelling;
    return { name: group?.name, rooms: group?.children.map((c) => c.name) ?? [] };
  });
  check(
    'world: all thresholds have environmental storytelling',
    story.name === 'threshold-storytelling'
      && ['tempter-coins', 'brother-wound', 'pride-eyes'].every((n) => story.rooms.includes(n)),
    JSON.stringify(story),
  );

  const pastoral = await page.evaluate(() => {
    const level = window.__game.level;
    return {
      group: level.pastoralLandmarks?.name,
      children: level.pastoralLandmarks?.children.map((c) => c.name) ?? [],
      elderVisible: level.elder?.mesh.visible,
      altarVisible: level.altar?.visible,
    };
  });
  check(
    'world: elder and confession altar are visible landmarks',
    pastoral.group === 'pastoral-landmarks'
      && pastoral.children.includes('elder-visible')
      && pastoral.children.includes('confession-altar')
      && pastoral.elderVisible && pastoral.altarVisible,
    JSON.stringify(pastoral),
  );

  const ladderLandmark = await page.evaluate(() => {
    const level = window.__game.level;
    const before = level.ladderGuidance.visible;
    level.setLadderRevealed(true);
    const result = {
      gate: level.ladderGate?.name,
      guidance: level.ladderGuidance?.name,
      parts: level.ladderGuidance?.children.map((c) => c.name) ?? [],
      before,
      after: level.ladderGuidance.visible,
    };
    level.setLadderRevealed(false);
    return result;
  });
  check(
    'world: the Ladder is a gate landmark with revealed label, beam, and path',
    ladderLandmark.gate === 'ladder-gate-landmark'
      && ladderLandmark.guidance === 'ladder-guidance'
      && ladderLandmark.parts.includes('ladder-label')
      && ladderLandmark.parts.includes('ladder-light-beam')
      && ladderLandmark.parts.filter((n) => n.startsWith('ladder-path-')).length === 7
      && !ladderLandmark.before && ladderLandmark.after,
    JSON.stringify(ladderLandmark),
  );

  const intentionalConfession = await page.evaluate(async () => {
    const g = window.__game;
    const altar = g.triggers().A;
    g.teleport(altar.x - 2.1, altar.z);   // standing beside the altar, not on it
    await new Promise((r) => setTimeout(r, 220));
    const before = g.state();
    g.key('KeyE');
    const after = g.state();
    document.getElementById('confess-btn').click();
    return { before, after };
  });
  check(
    'world: confession requires an intentional E press',
    intentionalConfession.before === 'explore' && intentionalConfession.after === 'confess',
    JSON.stringify(intentionalConfession),
  );

  await resetState(page);

  const confession = await page.evaluate(async () => {
    const g = window.__game;
    const altar = g.triggers().A;
    for (let i = 0; i < 2; i++) {
      g.teleport(altar.x, altar.z);
      await new Promise((r) => setTimeout(r, 350));
      g.key('KeyE');
      document.getElementById('confess-btn').click();
      await new Promise((r) => setTimeout(r, 250));
    }
    return { grace: g.branch.grace, count: g.branch.confessions, received: g.branch.confessionGraceReceived };
  });
  check(
    'confession: repeated restoration grants grace only once',
    confession.grace === 6 && confession.count === 2 && confession.received,
    JSON.stringify(confession),
  );

  await resetState(page);
  const intentionalEnemy = await page.evaluate(async () => {
    const g = window.__game;
    const p = g.triggers().K;
    g.teleport(p.x + 2.1, p.z);
    await new Promise((r) => setTimeout(r, 220));
    const before = g.state();
    g.key('Space');
    const explorationUsesSpace = !!g.player.keys.Space;
    g.key('KeyE');
    return { before, after: g.state(), explorationUsesSpace };
  });
  check(
    'world: enemy encounters require E and exploration has no jump key',
    intentionalEnemy.before === 'explore'
      && intentionalEnemy.after === 'battle'
      && !intentionalEnemy.explorationUsesSpace,
    JSON.stringify(intentionalEnemy),
  );
  await doIntro(page);
  const choice = await page.evaluate(() => {
    const g = window.__game;
    g.battle.phase = 'menu';
    g.battle.prayActions = 0;
    g.battle.round = 0;
    g.battle._openMenu();
    const lockedText = document.getElementById('battle-condition').textContent;
    const menuHint = document.getElementById('battle-hints').textContent;
    const simpleMenu = [...document.querySelectorAll('#battle-main .menu-item')].map((e) => e.textContent);
    const metersInitiallyHidden = !document.getElementById('meters').classList.contains('revealed');
    g.battle.prayActions = 1;
    g.battle.round = 2;
    g.battle._openMenu();
    const readyText = document.getElementById('battle-condition').textContent;
    const readyMenu = [...document.querySelectorAll('#battle-main .menu-item')].map((e) => e.textContent);
    g.battle.prayActions = 0;
    g.battle.round = 0;
    g.battle._openMenu();
    g.key('Enter');
    const phase = g.battle.phase;
    g.branch.hp = 10;
    g.battle.enemyHp = 100;
    g.battle._resolveFight(1);
    const dodgeHint = document.getElementById('battle-hints').textContent;
    const startX = g.battle.heartPos.x;
    g.battle.keys.KeyD = true;
    g.battle._updateEnemyTurn(0.25);
    g.battle.keys.KeyD = false;
    const movedX = g.battle.heartPos.x;
    g.battle.keys.Space = true;
    g.battle._updateEnemyTurn(1.3);
    g.battle.keys.Space = false;
    const sustainedPrayer = {
      actions: g.battle.prayActions,
      grace: g.branch.grace,
      condition: document.getElementById('battle-condition').textContent,
    };
    const dialogBefore = document.getElementById('battle-dialog').innerHTML;
    g.key('Enter');
    const dialogAfter = document.getElementById('battle-dialog').innerHTML;
    return {
      phase,
      lockedText,
      readyText,
      menuHint,
      simpleMenu,
      readyMenu,
      metersInitiallyHidden,
      metersRevealed: document.getElementById('meters').classList.contains('revealed'),
      dodgeHint,
      startX,
      movedX,
      enemyEnterDidNothing: dialogBefore === dialogAfter,
      sustainedPrayer,
      hp: g.branch.hp,
      pride: g.branch.pride,
      forceMomentum: g.battle.forceMomentum,
    };
  });
  check(
    'choice: FIGHT remains available when MERCY is ready',
    choice.phase === 'fight',
    `phase ${choice.phase}`,
  );
  check(
    'choice: WAIT becomes direct MERCY when the heart is ready',
    choice.lockedText.includes('MERCY CLOSED') && choice.readyText === 'MERCY READY'
      && choice.simpleMenu.length === 3 && choice.simpleMenu[2] === 'WAIT'
      && choice.readyMenu[2].includes('MERCY') && !choice.simpleMenu.some((x) => x.includes('PRAY')),
    JSON.stringify({ locked: choice.lockedText, ready: choice.readyText }),
  );
  check(
    'input: battle hints show only controls that work in the current phase',
    choice.menuHint.includes('ENTER') && !choice.menuHint.includes('back')
      && choice.dodgeHint.includes('WASD') && choice.dodgeHint.includes('SPACE')
      && !choice.dodgeHint.includes('ENTER') && !choice.dodgeHint.includes('back')
      && choice.enemyEnterDidNothing,
    JSON.stringify(choice),
  );
  check(
    'prayer: sustained SPACE during dodging advances mercy',
    choice.sustainedPrayer.actions === 1 && choice.sustainedPrayer.grace === 3,
    JSON.stringify(choice.sustainedPrayer),
  );
  check(
    'hud: heart meters stay hidden until the first consequential choice',
    choice.metersInitiallyHidden && choice.metersRevealed,
    JSON.stringify({ before: choice.metersInitiallyHidden, after: choice.metersRevealed }),
  );
  check(
    'input: WASD moves the heart during 2D dodging',
    choice.movedX > choice.startX,
    `x ${choice.startX.toFixed(2)} → ${choice.movedX.toFixed(2)}`,
  );
  check(
    'temptation: accurate FIGHT grants immediate relief with long-term pride',
    choice.hp === 11 && choice.pride === 6 && choice.forceMomentum === 1,
    JSON.stringify(choice),
  );
  // ---- the HUD mini-map and the dev feature toggles -------------------------
  // Back to explore: the map only lives there, and the checks below walk around.
  await resetState(page);
  await sleep(200);
  const map = await page.evaluate(() => {
    const el = document.getElementById('minimap');
    const c = document.getElementById('minimap-canvas');
    const px = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    let painted = 0;
    for (let i = 3; i < px.length; i += 4) if (px[i] > 0) painted++;
    const rect = el.getBoundingClientRect();
    const stage = document.getElementById('stage').getBoundingClientRect();
    return {
      display: getComputedStyle(el).display, on: window.__game.minimapOn(),
      w: c.width, h: c.height, painted,
      inside: rect.width > 0 && rect.height > 0 && rect.left >= stage.left && rect.right <= stage.right,
    };
  });
  check(
    'minimap: the whole-city strip is drawn on the HUD while exploring',
    map.display !== 'none' && map.on && map.painted > 2000 && map.inside
      && map.w / map.h > 0.2 && map.w / map.h < 0.4,   // the strip's 34:128 shape
    JSON.stringify(map),
  );

  const mapToggle = await page.evaluate(async () => {
    const el = document.getElementById('minimap');
    const g = window.__game;
    const shown = getComputedStyle(el).display;
    g.key('KeyM');
    await new Promise((r) => setTimeout(r, 250));
    const hidden = { display: getComputedStyle(el).display, on: g.minimapOn() };
    g.key('KeyM');
    await new Promise((r) => setTimeout(r, 250));
    return { shown, hidden, back: { display: getComputedStyle(el).display, on: g.minimapOn() } };
  });
  check(
    'minimap: M hides it and shows it again',
    mapToggle.shown !== 'none' && mapToggle.hidden.display === 'none' && !mapToggle.hidden.on
      && mapToggle.back.display !== 'none' && mapToggle.back.on,
    JSON.stringify(mapToggle),
  );

  const wings = await page.evaluate(() => ({
    groups: Object.keys(window.__game.level.featureGroups),
    additions: window.__game.additions(),
  }));
  check(
    'features: every addition ships built and flagged on',
    wings.groups.length === 13 && wings.additions.length === 13
      && wings.additions.every((a) => wings.groups.includes(a.id) && a.on),
    JSON.stringify({ groups: wings.groups, additions: wings.additions.map((a) => `${a.id}:${a.on}`) }),
  );

  const sites = await page.evaluate(() => window.__game.sites().map((s) => s.id));
  check(
    'sites: the quarter around Hagia Sophia is built',
    sites.length === 12 && ['augustaion', 'milion', 'chalke', 'zeuxippus', 'cistern', 'hagiaEirene']
      .every((id) => sites.includes(id)),
    JSON.stringify(sites),
  );

  // The approach card: walk up to a site and it names itself with its
  // explanation, written for the player (no dev keys); walk away and it goes.
  const card = await page.evaluate(async () => {
    const g = window.__game;
    const at = (l) => { g.teleport(l.x, l.z); };
    const read = () => {
      const el = document.getElementById('site-card');
      return {
        display: getComputedStyle(el).display,
        name: document.getElementById('site-card-name').textContent,
        note: document.getElementById('site-card-note').textContent.length,
        devText: /dev|toggle|config\.js/i.test(el.textContent),
      };
    };
    const mile = g.landmarks().find((l) => l.id === 'milion');
    at(mile); await new Promise((r) => setTimeout(r, 260));
    const onSite = read();
    const hagia = g.landmarks().find((l) => l.id === 'hagiaSophia');
    at(hagia); await new Promise((r) => setTimeout(r, 260));
    const atHagia = read();
    g.teleport(52.5, 40);                          // the empty road north of the roadside sites
    await new Promise((r) => setTimeout(r, 260));
    const away = read();
    return { onSite, atHagia, away };
  });
  check(
    'card: walking up to a site names it and explains it, with no dev text',
    card.onSite.display !== 'none' && card.onSite.name === 'THE MILION'
      && card.onSite.note > 120 && !card.onSite.devText
      && card.atHagia.name === 'HAGIA SOPHIA' && !card.atHagia.devText
      && card.away.display === 'none',
    JSON.stringify(card),
  );

  // ?debug: instant transport north and south along the walk, naming each stop.
  const transport = await page.evaluate(async () => {
    const g = window.__game;
    const stops = g.waypoints();
    const sorted = stops.every((w, i) => i === 0 || w.z > stops[i - 1].z);
    const visited = [];
    for (let i = 0; i < stops.length - 1; i++) {          // the last step wraps north
      g.key('PageDown');
      await new Promise((r) => setTimeout(r, 90));
      visited.push({ z: +g.player.pos.z.toFixed(1), label: document.getElementById('msg').textContent });
    }
    const southward = visited.every((p, i) => i === 0 || p.z > visited[i - 1].z);
    const atPort = /Port of Theodosius/.test(visited[visited.length - 1].label);
    g.key('PageDown');                                    // wraps to the first stop
    await new Promise((r) => setTimeout(r, 90));
    const wrapped = document.getElementById('msg').textContent;
    g.key('PageUp');
    await new Promise((r) => setTimeout(r, 90));
    const backNorth = document.getElementById('msg').textContent;
    return { count: stops.length, sorted, southward, atPort, wrapped, backNorth };
  });
  check(
    'transport: the stops run north to south, and PageDown/PageUp walk them',
    transport.count === 13 && transport.sorted && transport.southward && transport.atPort
      && /Gate Court/.test(transport.wrapped) && /Port of Theodosius/.test(transport.backNorth),
    JSON.stringify(transport),
  );

  // Each new roadside card and physical obstacle follows the actual keyboard
  // switch, including shifted digits; the map and road stay usable throughout.
  for (const [id, key, shifted] of [
    ['aqueduct', 'Digit8', false], ['pantokrator', 'Digit9', false],
    ['forumConstantine', 'Digit1', true], ['stoudios', 'Digit2', true],
    ['hippodrome', 'Digit3', true], ['mosaicPeristyle', 'Digit4', true],
  ]) {
    const result = await page.evaluate(async ({ id, key, shifted }) => {
      const g = window.__game;
      const landmark = g.landmarks().find((s) => s.id === id);
      g.teleport(landmark.x, landmark.z);
      const settle = () => new Promise((resolve) => setTimeout(resolve, 160));
      await settle();
      const name = document.getElementById('site-card-name').textContent;
      // The card answers anywhere on the road beside the site, and inside it,
      // not only at the one approach point.
      const cardAt = async (x, z) => {
        g.teleport(x, z); await settle();
        const shown = getComputedStyle(document.getElementById('site-card')).display !== 'none';
        return shown ? document.getElementById('site-card-name').textContent : null;
      };
      const b = landmark.box;
      const west = b.maxX <= 45;
      const roadFar = await cardAt(west ? 58.5 : 46.5, (b.minZ + b.maxZ) / 2);
      const inside = await cardAt(west ? b.maxX - 1.5 : b.minX + 1.5, b.maxZ - 1.5);
      g.teleport(landmark.x, landmark.z); await settle();
      const plan = () => g.minimap.plan.toDataURL();
      const before = plan();
      const flip = () => window.dispatchEvent(new KeyboardEvent('keydown', { code: key, shiftKey: shifted }));
      const obstacles = g.level.colliders.filter((c) => c.feature === id);
      flip(); await settle();
      const hidden = !g.level.featureGroups[id].visible && !g.features()[id]
        && getComputedStyle(document.getElementById('site-card')).display === 'none';
      const mapChanged = before !== plan();
      const nonblocking = obstacles.every((c) => !g.level.colliderLive(c));
      flip(); await settle();
      const restored = g.level.featureGroups[id].visible && g.features()[id] && before === plan();
      const site = g.sites().find((s) => s.id === id);
      const roadClear = !obstacles.some((c) => c.maxX > 45 && c.minX < 60);
      return { name, label: landmark.label, roadFar, inside, hidden, mapChanged, nonblocking,
        restored, roadClear, obstacles: obstacles.length, source: site.source };
    }, { id, key, shifted });
    check(`road site: ${id} card, keyboard, geometry, map and clear road`,
      result.name === result.label && result.roadFar === result.label && result.inside === result.label
        && result.hidden && result.mapChanged && result.nonblocking && result.restored
        && result.roadClear && result.obstacles > 0 && !!result.source, JSON.stringify(result));
  }

  // Every stop must be somewhere the pilgrim can actually stand.
  const standable = await page.evaluate(async () => {
    const g = window.__game;
    const out = [];
    for (const w of g.waypoints()) {
      g.teleport(w.x, w.z);
      await new Promise((r) => setTimeout(r, 300));
      out.push({ name: w.name, drift: +Math.hypot(g.player.pos.x - w.x, g.player.pos.z - w.z).toFixed(2) });
    }
    return out;
  });
  check(
    'transport: every stop is clear ground, not inside a wall or a prop',
    standable.every((p) => p.drift < 0.05),
    JSON.stringify(standable),
  );

  // The dev keys have to be findable without being told: the HUD lists them,
  // and the title screen repeats them for a ?debug build.
  const devHints = await page.evaluate(() => {
    const el = document.getElementById('dev-hints');
    const text = el ? el.textContent : '';
    return {
      display: el ? getComputedStyle(el).display : 'missing',
      travel: /PageDown/.test(text) && /PageUp/.test(text),
      toggle: /1/.test(text) && /7/.test(text),
      titleDev: getComputedStyle(document.getElementById('title-dev')).display,
    };
  });
  check(
    'dev: the HUD lists the dev keys, travel included',
    devHints.display !== 'none' && devHints.travel && devHints.toggle && devHints.titleDev !== 'none',
    JSON.stringify(devHints),
  );

  // Toggling an addition off must take its blocking with it: drop the pilgrim
  // into that wing's open water and see whether the world still pushes him out.
  const toggled = await page.evaluate(async () => {
    const g = window.__game;
    const wing = g.harbours().find((w) => w.id === 'harbour');
    const tx = ((wing.sea.x0 + wing.sea.x1 + 1) / 2) * 3;
    const tz = ((wing.sea.y0 + wing.sea.y1 + 1) / 2) * 3;
    const drift = async () => {
      g.teleport(tx, tz);
      await new Promise((r) => setTimeout(r, 320));
      return Math.hypot(g.player.pos.x - tx, g.player.pos.z - tz);
    };
    const on = await drift();
    const offFlag = g.setFeature('harbour', false);
    const invisible = g.level.featureGroups.harbour.visible;
    const off = await drift();
    g.setFeature('harbour', true);
    return { on, off, offFlag, invisible, restored: g.features().harbour };
  });
  check(
    'features: a toggled-off port hides and stops blocking (dev switch)',
    toggled.on > 0.3 && toggled.off < 0.05 && toggled.offFlag === false
      && toggled.invisible === false && toggled.restored === true,
    JSON.stringify(toggled),
  );

  // The map is drawn from the same flags, so a hidden wing empties out of it.
  const mapFollows = await page.evaluate(async () => {
    const sea = () => {
      const c = document.getElementById('minimap-canvas');
      const px = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let n = 0;
      for (let i = 0; i < px.length; i += 4) if (px[i] === 34 && px[i + 1] === 68 && px[i + 2] === 90) n++;
      return n;
    };
    const settle = () => new Promise((r) => setTimeout(r, 320));
    await settle();                 // let the map catch up with the toggle above
    const before = sea();
    window.__game.setFeature('harbour', false);
    await new Promise((r) => setTimeout(r, 300));
    const off = sea();
    window.__game.setFeature('harbour', true);
    await new Promise((r) => setTimeout(r, 300));
    return { before, off, back: sea() };
  });
  check(
    'minimap: the plan follows a toggled-off harbour',
    mapFollows.off < mapFollows.before * 0.7 && mapFollows.back >= mapFollows.before * 0.95,
    JSON.stringify(mapFollows),
  );

  // The plan is turned half about, so walking the pilgrimage (south) moves the
  // pilgrim UP the strip: the Gate Court sits low, the port high.
  const orientation = await page.evaluate(async () => {
    const g = window.__game;
    const c = document.getElementById('minimap-canvas');
    const markerRow = async (x, z) => {
      g.teleport(x, z);
      await new Promise((r) => setTimeout(r, 260));
      const px = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
      let sum = 0, n = 0;
      for (let y = 0; y < c.height; y++) {
        for (let x2 = 0; x2 < c.width; x2++) {
          const i = (y * c.width + x2) * 4;
          if (px[i] === 255 && px[i + 1] === 233 && px[i + 2] === 176) { sum += y; n++; }
        }
      }
      return n ? sum / n : null;
    };
    // the pilgrimage start is a spawn, not a trigger
    const start = g.level.spawns.S[0];
    const court = await markerRow(start.x, start.z);
    const ladder = await markerRow(g.triggers().L.x, g.triggers().L.z);
    const port = await markerRow(61.5, 355.5);           // the south quay
    return { court, ladder, port, height: c.height };
  });
  check(
    'minimap: walking south moves the pilgrim UP the strip (destination at the top)',
    orientation.court !== null && orientation.court > orientation.ladder
      && orientation.ladder > orientation.port && orientation.court > orientation.height * 0.75,
    JSON.stringify(orientation),
  );

  check('interactions: no console errors', errors.length === 0, JSON.stringify(errors));
  await page.close();
}

const server = startServer();
let exit = 1;
let aborted = null;
try {
  await waitForServer(`http://localhost:${PORT}/`);
  const browser = await chromium.launch();

  // ---- humility run ----
  const hum = await runJourney(browser, 'humble');
  check('humility: all three spared', hum.tempter === 'spared' && hum.brother === 'spared' && hum.pride === 'spared', JSON.stringify({ t: hum.tempter, b: hum.brother, p: hum.pride }));
  check('humility: confession grace cannot be farmed', hum.afterConfess === 6, `grace ${hum.afterConfess}`);
  check('humility: humble ending', hum.endingTitle === 'THE LADDER IS NOT CLIMBED', hum.endingTitle);
  check('humility: grace dominates', hum.final.grace >= 60 && hum.final.pride === 0, `grace ${hum.final.grace} / pride ${hum.final.pride}`);
  check('humility: flags set', hum.final.flags.sparedTempter && hum.final.flags.forgaveBrother && hum.final.flags.sparedPride, JSON.stringify(hum.final.flags));
  check('humility: no console errors', hum.consoleErrors.length === 0, JSON.stringify(hum.consoleErrors));

  // ---- pride run ----
  const prd = await runJourney(browser, 'pride');
  check('pride: all three defeated', prd.tempter === 'defeated' && prd.brother === 'defeated' && prd.pride === 'defeated', JSON.stringify({ t: prd.tempter, b: prd.brother, p: prd.pride }));
  check('pride: proud ending', prd.endingTitle === 'THE EMPTY SUMMIT', prd.endingTitle);
  check('pride: pride dominates', prd.final.pride >= 70 && prd.final.grace < 30, `pride ${prd.final.pride} / grace ${prd.final.grace}`);
  check('pride: no console errors', prd.consoleErrors.length === 0, JSON.stringify(prd.consoleErrors));

  // ---- opening and choice regressions ----
  await runInteractionRegressions(browser);

  // ---- bullet physics check (patterns must produce finite bullets, incl.
  // the pride boss's ring burst which spawns at the heart) ---------------------
  const bp = await newPage(browser);
  const coords = await bp.page.evaluate(async () => {
    const g = window.__game;
    g.setState('explore');
    g.startEncounter('pride');
    await new Promise((r) => setTimeout(r, 250));
    g.battle.phase = 'enemy';
    g.battle.patternT = 0;
    g.battle._startEnemyTurn();
    g.tickBattle(130); // past vanity (0.16s) and crown (1.4s) spawns
    return g.battle.bullets.map((b) => ({ x: b.x, y: b.y, vx: b.vx, vy: b.vy }));
  });
  const allFinite = coords.length > 0 && coords.every((c) =>
    Number.isFinite(c.x) && Number.isFinite(c.y) && Number.isFinite(c.vx) && Number.isFinite(c.vy));
  check('bullets: pride patterns produce finite coordinates', allFinite, `count ${coords.length}`);
  check('bullets: no console errors', bp.errors.length === 0, JSON.stringify(bp.errors));
  await bp.page.close();

  await browser.close();
  exit = failures === 0 ? 0 : 1;
} catch (err) {
  // A thrown check aborts the run: say so, and never report the run as passed —
  // a crash part-way through used to print "ALL TESTS PASSED" over exit code 1.
  aborted = err;
  console.error('TEST ERROR:', err.message);
  exit = 1;
} finally {
  server.kill();
}

if (aborted) {
  console.log(`\nRUN ABORTED after ${checks} check(s): ${aborted.message}`);
  process.exit(1);
}
console.log(failures === 0 ? `\nALL TESTS PASSED (${checks} checks)` : `\n${failures} CHECK(S) FAILED`);
process.exit(exit);
