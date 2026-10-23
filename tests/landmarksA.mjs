// Pantokrator, Stoudios and Hagia Eirene: keyboard-only checks, run from run.mjs.
export async function testLandmarksA(browser, newPage, check) {
  const { page, errors } = await newPage(browser);
  async function enter(id) {
    await page.evaluate((id) => {
      const g = window.__game, stop = g.activityStops.find((a) => a.id === id);
      if (['activity', 'cart'].includes(g.state())) g.key('KeyQ');
      g.setState('explore'); g.teleport(stop.x, stop.z); g.key('KeyE');
    }, id);
    await page.waitForFunction((id) => window.__game.state() === 'activity' && window.__game.activities().snapshot()?.id === id, id);
  }
  const meters = () => page.evaluate(() => ({ grace: window.__game.branch.grace, pride: window.__game.branch.pride }));

  // ---- Pantokrator ----------------------------------------------------------
  await enter('pantokrator');
  check('pantokrator: E at the road sign starts the hospital tray', await page.locator('#site-activity-hud').isVisible());
  await page.waitForFunction(() => document.getElementById('site-activity-hud').parentElement.id === 'world-play-dock');
  check('pantokrator: the activity panel joins the bottom dock', true);
  const remote = await page.evaluate(() => {
    const g = window.__game, a = g.activities(); g.teleport(60, 112); g.key('KeyE'); a.update(0);
    return a.snapshot().tray.length === 0 && a.snapshot().known.length === 0;
  });
  check('pantokrator: items and patients need to be approached', remote);
  const at = (x, z, ...codes) => page.evaluate(({ x, z, codes }) => {
    const g = window.__game; g.teleport(x, z); g.activities().update(1 / 60); for (const c of codes) g.key(c);
    return g.activities().snapshot();
  }, { x, z, codes });
  // item targets stand at x 62.4 / 63.6 / 64.8 / 66.0 in front of the table
  const ITEM = { water: 62.4, bread: 63.6, poultice: 64.8, wine: 66 }, ITEM_Z = 113.6, BEDS = { patron: 117, fever: 121.5, wound: 126 };
  await at(67.5, 117, 'KeyE');
  let s = await at(ITEM.water, ITEM_Z, 'KeyE');
  check('pantokrator: Theophano names every need when asked', s.asked && s.known.length === 3 && s.tray[0] === 'water', JSON.stringify(s));
  const spill = await page.evaluate(() => {
    const g = window.__game, a = g.activities();
    g.camera.rotation.set(0, Math.PI, 0); g.player.keys.KeyW = true; g.player.keys.ShiftLeft = true;
    for (let i = 0; i < 90 && a.snapshot().tray.length; i++) a.update(1 / 60);
    g.player.clearKeys();
    return { ...a.snapshot(), puddle: a.puddle.visible };
  });
  check('pantokrator: running with a cup spills it and leaves a puddle', spill.spills === 1 && spill.tray.length === 0 && spill.puddle, JSON.stringify(spill));
  await at(ITEM.water, ITEM_Z, 'KeyE'); await at(ITEM.poultice, ITEM_Z, 'KeyE');
  const walk = await page.evaluate(() => {
    const g = window.__game, a = g.activities(); g.camera.rotation.set(0, Math.PI, 0);
    g.player.keys.KeyW = true; let peak = 0;
    for (let i = 0; i < 60; i++) { a.update(1 / 60); peak = Math.max(peak, a.game.slosh); }
    g.player.clearKeys(); return { ...a.snapshot(), peak };
  });
  check('pantokrator: walking keeps the tray steady', walk.tray.length === 2 && walk.peak < 1, JSON.stringify(walk));
  await at(69.3, BEDS.fever, 'KeyE'); s = await at(69.3, BEDS.wound, 'KeyE');
  await at(ITEM.wine, ITEM_Z, 'KeyE'); await at(69.3, BEDS.patron, 'KeyE');
  s = await at(66.5, 129, 'KeyH');
  const m1 = await meters();
  check('pantokrator: serving by need and sharing credit is humble (+2 grace)', s.outcome === 'humble' && s.served.join() === 'fever,wound,patron' && s.credit === 'shared' && m1.grace === 2 && m1.pride === 0, JSON.stringify({ s, m1 }));
  const proud = await page.evaluate(() => {
    const g = window.__game, a = g.activities(); g.key('KeyR');
    const go = (x, z) => { g.teleport(x, z); a.update(1 / 60); g.key('KeyE'); };
    go(66, 113.6); go(69.3, 117); go(62.4, 113.6); go(64.8, 113.6); go(69.3, 121.5); go(69.3, 126);
    g.teleport(66.5, 129); a.update(1 / 60); g.key('KeyF');
    return { ...a.snapshot(), grace: g.branch.grace, pride: g.branch.pride, flag: g.branch.flags['activity:pantokrator'] };
  });
  check('pantokrator: patron first and claimed credit is proud; replay keeps the saved result', proud.outcome === 'proud' && proud.served[0] === 'patron' && proud.credit === 'claimed' && proud.pride === 0 && proud.flag === 'humble', JSON.stringify(proud));
  const early = await page.evaluate(() => {
    const g = window.__game, a = g.activities(); g.key('KeyR');
    g.teleport(66.5, 129); a.update(1 / 60); g.key('KeyH'); return a.snapshot().outcome;
  });
  check('pantokrator: credit cannot be settled before the patients are served', early === null);
  await page.keyboard.press('q');
  check('pantokrator: Q returns to the road and hides the panel', await page.evaluate(() => window.__game.state() === 'explore') && await page.locator('#site-activity-hud').isHidden());

  // ---- Stoudios -------------------------------------------------------------
  await enter('stoudios');
  // step frames until the ring closes, then press Space at the page
  const stroke = (onTime = true) => page.evaluate((onTime) => {
    const g = window.__game, a = g.activities(); g.teleport(66, 196.5);
    const phase = () => (a.game.time % 1.2) / 1.2;
    const ready = () => onTime ? phase() >= 0.9 && phase() < 0.98 : phase() >= 0.3 && phase() < 0.6;
    for (let i = 0; i < 200 && !ready(); i++) a.update(1 / 60);
    g.key('Space'); return a.snapshot();
  }, onTime);
  s = await stroke(false);
  check('stoudios: a mistimed stroke wavers and does not advance', s.stroke === 0 && s.wobbles === 1, JSON.stringify(s));
  for (let i = 0; i < 4; i++) s = await stroke();
  check('stoudios: timed strokes copy the pattern', s.stroke === 4, JSON.stringify(s));
  s = await stroke();
  check('stoudios: the quill catches and a wet blot spreads', s.blot?.wet && s.stroke === 4, JSON.stringify(s));
  s = await page.evaluate(() => { const g = window.__game; g.teleport(66, 196.5); g.key('Space'); return g.activities().snapshot(); });
  check('stoudios: wet ink cannot be scraped before asking', !s.repaired && s.blot.wet);
  await page.evaluate(() => { const g = window.__game; g.teleport(69.5, 193.4); g.activities().update(1 / 60); g.key('KeyE'); g.teleport(66, 196.5); g.activities().update(1 / 60); g.key('Space'); });
  for (let i = 0; i < 3; i++) s = await stroke();
  s = await page.evaluate(() => { const g = window.__game; g.teleport(69.5, 193.4); g.activities().update(1 / 60); g.key('KeyE'); return g.activities().snapshot(); });
  const m2 = await meters();
  check('stoudios: revealing the blot and accepting instruction is humble (+2 grace)', s.outcome === 'humble' && s.revealed && s.repaired && s.stroke === 8 && m2.grace === 4 && m2.pride === 0, JSON.stringify({ s, m2 }));
  check('stoudios: the finished page keeps its visible repair', await page.evaluate(() => {
    const a = window.__game.activities(); a.update(1 / 60); const [r, g, b] = a.ink.getImageData(108, 135, 1, 1).data; return r === 244 && g === 236 && b === 212;
  }));
  await page.keyboard.press('r');
  for (let i = 0; i < 5; i++) s = await stroke();
  s = await page.evaluate(() => { const a = window.__game.activities(); for (let i = 0; i < 11 * 60; i++) a.update(1 / 60); return a.snapshot(); });
  const m3 = await meters();
  check('stoudios: ink drying over the blot spoils the page without changing meters', s.outcome === 'unfinished' && s.blot.dried && m3.grace === 4 && m3.pride === 0, JSON.stringify(s));
  await page.keyboard.press('r');
  for (let i = 0; i < 5; i++) s = await stroke();
  await page.keyboard.press('f');
  for (let i = 0; i < 3; i++) s = await stroke();
  s = await page.evaluate(() => { const g = window.__game; g.teleport(69.5, 193.4); g.activities().update(1 / 60); g.key('KeyE'); return g.activities().snapshot(); });
  check('stoudios: gilding over the blot resolves pride; replay keeps the saved result', s.outcome === 'proud' && s.hidden && await page.evaluate(() => window.__game.branch.flags['activity:stoudios'] === 'humble' && window.__game.branch.pride === 0), JSON.stringify(s));
  await page.keyboard.press('q');

  // ---- Hagia Eirene ---------------------------------------------------------
  await enter('hagiaEirene');
  check('hagiaEirene: E at the road sign starts the shared phrase', await page.locator('#site-activity-hud').isVisible());
  // sing: press Space close to each of your beats (and Kassia's, when proud)
  const sing = (mode) => page.evaluate((mode) => {
    const g = window.__game, a = g.activities(); g.key('KeyR'); g.teleport(90, 317.6); a.update(1 / 60); g.key('KeyE');
    const PART = ['all', 'all', 'all', 'all', 'kassia', 'kassia', 'all', 'all'], sung = new Set();
    let kassiaDark = false;
    for (let i = 0; i < 40 * 60 && !a.game.done; i++) {
      a.update(1 / 60);
      const index = Math.round(a.game.time / 0.6), delta = a.game.time - index * 0.6;
      if (index < 8 || Math.abs(delta) > 0.03 || sung.has(index)) continue;
      const part = PART[index % 8];
      if (mode === 'silent' || part === 'kassia' && mode !== 'proud') continue;
      sung.add(index); g.key('Space');
      if (part === 'kassia') { a.update(1 / 60); kassiaDark ||= a.lamps.kassia.material.opacity < 0.35; }
    }
    return { ...a.snapshot(), kassiaDark, grace: g.branch.grace, pride: g.branch.pride };
  }, mode);
  const remoteSing = await page.evaluate(() => { const g = window.__game, a = g.activities(); g.teleport(86, 322); a.update(1 / 60); g.key('Space'); return a.snapshot(); });
  check('hagiaEirene: singing needs the pilgrim in their place and the phrase begun', !remoteSing.running && remoteSing.hits === 0);
  s = await sing('humble');
  check('hagiaEirene: entering on time and leaving Kassia her answer is humble (+2 grace)', s.outcome === 'humble' && s.overs === 0 && s.hits === 18 && s.grace === 6 && s.pride === 0, JSON.stringify(s));
  s = await sing('proud');
  check('hagiaEirene: singing over Kassia dims her lamp and resolves pride; replay keeps the result', s.outcome === 'proud' && s.overs >= 2 && s.kassiaDark && s.pride === 0, JSON.stringify(s));
  s = await sing('silent');
  check('hagiaEirene: a phrase that falls apart is retryable without changing meters', s.outcome === 'unfinished' && s.grace === 6, JSON.stringify(s));
  const away = await page.evaluate(() => { const g = window.__game, a = g.activities(); g.teleport(52.5, 300); a.update(0); return { state: g.state(), active: a.snapshot() }; });
  check('hagiaEirene: walking out of the court releases the activity', away.state === 'explore' && away.active === null, JSON.stringify(away));

  await page.reload(); await page.waitForFunction(() => window.__game);
  check('landmarks: first outcomes survive reload', await page.evaluate(() => ['pantokrator', 'stoudios', 'hagiaEirene'].every((id) => window.__game.branch.flags[`activity:${id}`] === 'humble')));
  check('landmarks: no page or console errors', errors.length === 0, JSON.stringify(errors));
  await page.close();

  // a fresh journey: the first proud outcome grants pride once
  const fresh = await newPage(browser);
  await fresh.page.evaluate(() => {
    const g = window.__game, s = g.activityStops.find((a) => a.id === 'pantokrator');
    g.setState('explore'); g.teleport(s.x, s.z); g.key('KeyE');
  });
  await fresh.page.waitForFunction(() => window.__game.state() === 'activity');
  const first = await fresh.page.evaluate(() => {
    const g = window.__game, a = g.activities();
    const go = (x, z) => { g.teleport(x, z); a.update(1 / 60); g.key('KeyE'); };
    const before = g.branch.pride;
    go(66, 113.6); go(69.3, 117); go(62.4, 113.6); go(64.8, 113.6); go(69.3, 121.5); go(69.3, 126);
    g.teleport(66.5, 129); a.update(1 / 60); g.key('KeyH');
    return { gained: g.branch.pride - before, flag: g.branch.flags['activity:pantokrator'] };
  });
  check('pantokrator: serving the patron first is proud even when credit is shared (+3 pride)', first.gained === 3 && first.flag === 'proud', JSON.stringify(first));
  await fresh.page.evaluate(() => { const g = window.__game; g.setFeature('stoudios', false); g.key('KeyQ'); const s = g.activityStops.find((a) => a.id === 'stoudios'); g.setState('explore'); g.teleport(s.x, s.z); g.key('KeyE'); });
  check('landmarks: a disabled site cannot start its activity', await fresh.page.evaluate(() => window.__game.state() === 'explore'));
  check('landmarks: fresh journey has no page or console errors', fresh.errors.length === 0, JSON.stringify(fresh.errors));
  await fresh.page.close();
}
