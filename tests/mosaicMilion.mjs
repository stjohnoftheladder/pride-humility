// Mosaic Peristyle and Milion: keyboard-driven, in the 3D world.
export async function testMosaicMilion(browser, newPage, check) {
  const { page, errors } = await newPage(browser);
  async function enter(id) {
    await page.evaluate(id => {
      const g = window.__game, stop = g.activityStops.find(a => a.id === id);
      if (g.state() === 'activity') g.key('KeyQ');
      g.setState('explore'); g.teleport(stop.x, stop.z); g.key('KeyE');
    }, id);
    await page.waitForFunction(id => window.__game.state() === 'activity' && window.__game.activities()?.snapshot()?.id === id, id);
  }
  const run = (fn, arg) => page.evaluate(fn, arg);

  await enter('mosaicPeristyle');
  check('mosaic: E at the court loads the activity in the world with a docked HUD', await run(() => {
    const g = window.__game, el = document.getElementById('site-activity-hud');
    return g.level.group.visible && el.style.display === 'block' && el.parentElement.id === 'world-play-dock';
  }));
  check('mosaic: tiles and figures stand on open floor inside the court', await run(() => {
    const g = window.__game, a = g.activities();
    return [a.master, a.novice].every(p => !g.level.collideCircle(p.x, p.z, 0.4, { x: p.x, z: p.z }))
      && !g.level.collideCircle(76, 264, 0.4, { x: 76, z: 264 });
  }));
  const tiles = await run(() => {
    const g = window.__game, a = g.activities();
    const before = a.game.rotation.join();
    g.teleport(71, 256); g.key('KeyE');
    const remote = before === a.game.rotation.join();
    // Turn each tile with E until its gold quarter meets the sinopia mark.
    const pieces = [];
    for (let i = 0; i < 8; i++) {
      const p = a.targets()[i]; g.teleport(p.x, p.z);
      let presses = 0;
      while (a.game.rotation[i] !== p.target && presses < 4) { g.key('KeyE'); presses++; }
      pieces.push(presses);
    }
    for (let i = 0; i < 30; i++) a.update(1 / 30);
    return { remote: remote ? 'blocked' : 'turned', ...a.snapshot(), pieces };
  });
  check('mosaic: E turns only the tile underfoot until all eight align', tiles.remote === 'blocked' && tiles.aligned === 8 && tiles.loose >= 0 && tiles.pieces.every(n => n > 0), JSON.stringify(tiles));
  const lifted = await run(() => {
    const a = window.__game.activities(), m = new (a.dummy.matrix.constructor)();
    a.tiles.getMatrixAt(a.game.loose, m); return m.elements[13];
  });
  check('mosaic: the misplaced tile visibly lifts from the bed', lifted > 0.17, String(lifted));
  const early = await run(() => {
    const g = window.__game, a = g.activities();
    g.teleport(a.master.x + 0.8, a.master.z); g.key('KeyH');
    return a.snapshot();
  });
  check('mosaic: the master waits for the novice border before judging', !early.outcome && early.border < 16, JSON.stringify(early));
  const unrepaired = await run(() => {
    const g = window.__game, a = g.activities();
    for (let i = 0; i < 40 * 30 && a.game.border < 16; i++) a.update(1 / 30);
    g.key('KeyH');
    return a.snapshot();
  });
  check('mosaic: crediting the novice requires repairing your own tile first', !unrepaired.outcome && unrepaired.border === 16 && !unrepaired.repaired, JSON.stringify(unrepaired));
  const humble = await run(() => {
    const g = window.__game, a = g.activities(), p = a.targets()[a.game.loose];
    g.teleport(p.x, p.z);
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    for (let i = 0; i < 50; i++) a.update(1 / 30);
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' }));
    g.teleport(a.master.x + 0.8, a.master.z); g.key('KeyH');
    a.update(1 / 30);
    return { ...a.snapshot(), grace: g.branch.grace, pride: g.branch.pride, flag: g.branch.flags['activity:mosaicPeristyle'],
      label: a.novice.label.userData.text, shared: a.shared.visible };
  });
  check('mosaic: repairing your tile and naming Irene resolves humbly with a shared pattern',
    humble.outcome === 'humble' && humble.repaired && humble.grace === 2 && humble.pride === 0 && humble.flag === 'humble'
    && humble.label === 'Irene · Your collaborator' && humble.shared, JSON.stringify(humble));
  const proud = await run(() => {
    const g = window.__game, a = g.activities(); g.key('KeyR');
    a.game.rotation = a.targets().slice(0, 8).map(p => p.target); a.game.loose = 0;
    for (let i = 0; i < 40 * 30 && a.game.border < 16; i++) a.update(1 / 30);
    g.teleport(a.master.x + 0.8, a.master.z); g.key('KeyF');
    return { ...a.snapshot(), grace: g.branch.grace, pride: g.branch.pride, flag: g.branch.flags['activity:mosaicPeristyle'] };
  });
  check('mosaic: claiming the novice border resolves pride; replay keeps the first outcome and meters',
    proud.outcome === 'proud' && proud.grace === 2 && proud.pride === 0 && proud.flag === 'humble', JSON.stringify(proud));
  const timeout = await run(() => { const g = window.__game, a = g.activities(); g.key('KeyR'); a.update(121); return { ...a.snapshot(), grace: g.branch.grace }; });
  check('mosaic: unfinished work is retryable without moral change', timeout.outcome === 'unfinished' && timeout.grace === 2, JSON.stringify(timeout));
  await page.keyboard.press('q');
  check('mosaic: Q returns to the road and hides the HUD', await run(() => window.__game.state() === 'explore' && document.getElementById('site-activity-hud').style.display === 'none'));

  await enter('milion');
  check('milion: the route board and porter stand inside the open crossing', await run(() => {
    const g = window.__game, stop = g.activityStops.find(s => s.id === 'milion');
    return !g.level.collideCircle(stop.x, stop.z, 0.4, { x: stop.x, z: stop.z }) && !g.level.collideCircle(68, 317, 0.4, { x: 68, z: 317 })
      && document.getElementById('site-activity-hud').parentElement.id === 'world-play-dock';
  }));
  const settle = 'for (let i = 0; i < 600 && a.game.travelers.some(t => ["walking","astray","thanking","guessed"].includes(t.state)) && !a.game.done; i++) a.update(1 / 30);';
  const astray = await run((settle) => {
    const g = window.__game, a = g.activities();
    g.teleport(64.2, 318); g.key('KeyF');   // pointer north; the first traveler seeks the dome
    a.update(0.5);
    const out = { ...a.game.travelers[0] };
    eval(settle);
    return { out, back: a.snapshot() };
  }, settle);
  check('milion: a wrong direction walks the traveler out and back to be corrected',
    astray.out.state === 'astray' && astray.out.x < 61 && astray.back.travelers[0].state === 'waiting' && astray.back.current === 0, JSON.stringify(astray));
  const guided = await run((settle) => {
    const g = window.__game, a = g.activities();
    const send = (arm) => { g.teleport(64.2, 318); while (a.game.pointer !== arm) g.key('KeyE'); g.key('KeyF'); eval(settle); };
    send(1); send(0);
    return a.snapshot();
  }, settle);
  check('milion: matching the carved dome and horses sends two travelers on their way', guided.arrived === 2 && guided.current === 2, JSON.stringify(guided));
  const thanked = await run((settle) => {
    const g = window.__game, a = g.activities();
    g.teleport(68, 318.2); g.key('KeyE');
    g.teleport(64.2, 318); while (a.game.pointer !== 2) g.key('KeyE'); g.key('KeyF');
    for (let i = 0; i < 900 && !a.game.done; i++) a.update(1 / 30);
    return { ...a.snapshot(), grace: g.branch.grace, pride: g.branch.pride, flag: g.branch.flags['activity:milion'] };
  }, settle);
  check('milion: asking Basil about the worn arm guides all three; one returns to thank him',
    thanked.outcome === "humble" && thanked.travelers[2].asked && thanked.travelers[0].state === "thanked" && thanked.grace === 4 && thanked.flag === "humble", JSON.stringify(thanked));
  const guess = await run((settle) => {
    const g = window.__game, a = g.activities(); g.key('KeyR');
    a.game.current = 2; a.game.travelers.forEach((t, i) => { if (i < 2) t.state = 'arrived'; });
    g.teleport(64.2, 318); while (a.game.pointer !== 2) g.key('KeyE'); g.key('KeyF');
    a.update(0.2); const walking = a.game.travelers[2].state;
    for (let i = 0; i < 900 && !a.game.done; i++) a.update(1 / 30);
    return { walking, ...a.snapshot(), grace: g.branch.grace, pride: g.branch.pride, flag: g.branch.flags['activity:milion'] };
  }, settle);
  check('milion: a confident guess at the worn arm resolves pride after the traveler leaves; replay is practice',
    guess.walking === 'guessed' && guess.outcome === 'proud' && guess.pride === 0 && guess.flag === 'humble', JSON.stringify(guess));
  await page.evaluate(() => { const g = window.__game; g.key('KeyR'); g.teleport(59, 290); g.activities().update(0); });
  check('milion: walking away releases the activity without changing meters', await run(() => window.__game.state() === 'explore' && window.__game.branch.grace === 4));
  await page.reload(); await page.waitForFunction(() => window.__game);
  check('mosaic and milion: first outcomes survive reload', await run(() => ['mosaicPeristyle', 'milion'].every(id => window.__game.branch.flags[`activity:${id}`] === 'humble')));
  check('mosaic and milion: no page or console errors', errors.length === 0, JSON.stringify(errors));
  await page.close();

  const fresh = await newPage(browser);
  await fresh.page.evaluate(() => {
    const g = window.__game, s = g.activityStops.find(a => a.id === 'milion');
    g.setState('explore'); g.teleport(s.x, s.z); g.key('KeyE');
  });
  await fresh.page.waitForFunction(() => window.__game.state() === 'activity');
  const first = await fresh.page.evaluate(() => {
    const g = window.__game, a = g.activities();
    a.game.current = 2; a.game.travelers.forEach((t, i) => { if (i < 2) t.state = 'arrived'; });
    g.teleport(64.2, 318); g.key('KeyF');
    for (let i = 0; i < 900 && !a.game.done; i++) a.update(1 / 30);
    return { pride: g.branch.pride, flag: g.branch.flags['activity:milion'] };
  });
  check('milion: a first proud resolution grants pride and saves it', first.pride === 3 && first.flag === 'proud', JSON.stringify(first));
  await fresh.page.evaluate(() => { const g = window.__game; g.setFeature('mosaicPeristyle', false); g.key('KeyQ'); });
  await fresh.page.waitForFunction(() => window.__game.state() === 'explore');
  await fresh.page.evaluate(() => { const g = window.__game, s = g.activityStops.find(a => a.id === 'mosaicPeristyle'); g.teleport(s.x, s.z); g.key('KeyE'); });
  check('mosaic: a disabled site cannot start its activity', await fresh.page.evaluate(() => !['activity', 'activityLoading'].includes(window.__game.state())));
  check('mosaic and milion: fresh page has no errors', fresh.errors.length === 0, JSON.stringify(fresh.errors));
  await fresh.page.close();
}
