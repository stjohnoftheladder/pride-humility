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
    g.branch.hp = 20; g.branch.items = { bread: 2, water: 3 };
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
    for (let i = 0; i < prays; i++) { g.key('ArrowRight'); g.key('KeyZ'); g.tickBattle(500, true); }
    for (let i = 0; i < waits; i++) {
      g.key('ArrowRight'); g.key('ArrowRight'); g.key('ArrowRight'); g.key('KeyZ');
      g.key('ArrowDown'); g.key('KeyZ');
      g.tickBattle(500, true);
    }
    g.key('ArrowRight'); g.key('ArrowRight'); g.key('ArrowRight'); g.key('KeyZ');
    g.key('KeyZ');
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
        document.getElementById('confess-btn').click();
        await new Promise((r) => setTimeout(r, 250));
      }
    });
    log.afterConfess = await page.evaluate(() => window.__game.branch.grace);
    for (const id of ['tempter', 'brother', 'pride']) {
      await page.evaluate((id) => { const g = window.__game; g.startEncounter(id); }, id);
      await page.waitForFunction((id) => window.__game.battle.def?.id === id, id);
      await doIntro(page);
      const r = await spareBattle(page, id === 'pride' ? 2 : 1, 1);
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

  const confession = await page.evaluate(async () => {
    const g = window.__game;
    for (let i = 0; i < 2; i++) {
      g.teleport(76.5, 13.5);
      await new Promise((r) => setTimeout(r, 350));
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

  await page.evaluate(() => window.__game.startEncounter('tempter'));
  await doIntro(page);
  const choice = await page.evaluate(() => {
    const g = window.__game;
    g.battle.phase = 'menu';
    g.battle.prayActions = 0;
    g.battle.round = 0;
    g.battle._openMenu();
    const lockedText = document.getElementById('battle-condition').textContent;
    g.battle.prayActions = 1;
    g.battle.round = 2;
    g.battle._openMenu();
    const readyText = document.getElementById('battle-condition').textContent;
    g.key('KeyZ');
    const phase = g.battle.phase;
    g.branch.hp = 10;
    g.battle.enemyHp = 100;
    g.battle._resolveFight(1);
    return {
      phase,
      lockedText,
      readyText,
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
    'choice: MERCY requirements become explicit and announce readiness',
    choice.lockedText.includes('MERCY CLOSED') && choice.readyText.includes('MERCY READY'),
    JSON.stringify({ locked: choice.lockedText, ready: choice.readyText }),
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
