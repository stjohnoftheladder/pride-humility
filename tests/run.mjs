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
function check(name, ok, detail) {
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
      for (let i = 0; i < 2; i++) {
        g.teleport(76.5, 13.5);
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
    await page.evaluate(() => window.__game.teleport(91.5, 55.5));
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
    await page.evaluate(() => window.__game.teleport(91.5, 55.5));
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
    g.teleport(74.4, 13.5);
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
    for (let i = 0; i < 2; i++) {
      g.teleport(76.5, 13.5);
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
  check('interactions: no console errors', errors.length === 0, JSON.stringify(errors));
  await page.close();
}

const server = startServer();
let exit = 1;
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
  console.error('TEST ERROR:', err.message);
  exit = 1;
} finally {
  server.kill();
}

console.log(failures === 0 ? '\nALL TESTS PASSED' : `\n${failures} CHECK(S) FAILED`);
process.exit(exit);
