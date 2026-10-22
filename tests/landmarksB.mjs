// Basilica Cistern and Baths of Zeuxippus: keyboard-driven checks of each route.
export async function testLandmarksB(browser, newPage, check) {
  const { page, errors } = await newPage(browser);
  async function enter(id) {
    await page.evaluate(id => {
      const g = window.__game, stop = g.activityStops.find(a => a.id === id);
      if (g.state() === 'activity') g.key('KeyQ');
      g.setState('explore'); g.teleport(stop.x, stop.z); g.key('KeyE');
    }, id);
    await page.waitForFunction(id => window.__game.state() === 'activity' && window.__game.siteActivity()?.active?.id === id, id);
  }

  // ----- Basilica Cistern ---------------------------------------------------------
  await enter('cistern');
  check('cistern: E at the road sign lights the lamp in the 3D cistern', await page.locator('#site-activity-hud').isVisible()
    && await page.evaluate(() => window.__game.level.group.visible && window.__game.scene.fog.far === 16));
  await page.waitForFunction(() => document.getElementById('site-activity-hud').parentElement.id === 'world-play-dock');
  check('cistern: HUD sits in the bottom play dock', true);
  const early = await page.evaluate(() => {
    const g = window.__game, a = g.siteActivity();
    g.key('KeyF');
    g.camera.rotation.set(0, Math.PI / 2, 0);
    const x = g.player.pos.x; window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyW' })); a.update(0.15);
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyW' })); g.player.clearKeys();
    return { outcome: a.snapshot().outcome, moved: g.player.pos.x < x };
  });
  check('cistern: W walks into the dark; the exit claim needs a found worker', early.moved && early.outcome === null, JSON.stringify(early));
  const echo = await page.evaluate(() => {
    const g = window.__game, a = g.siteActivity();
    g.teleport(40.5, 281); for (let i = 0; i < 190; i++) a.update(1 / 60);
    g.teleport(20, 281); for (let i = 0; i < 190; i++) a.update(1 / 60);
    return { louder: a.game.louder, ring: a.site.ring.material.opacity >= 0 };
  });
  check('cistern: the echo grows louder as you near the far wall', echo.louder, JSON.stringify(echo));
  // Walk the north rim lanes at walking pace, weaving between the columns.
  const route = [[7.5, 288], [7.5, 281.2], [17, 281.2], [17, 279.6], [23, 279.6], [23, 281.2], [29, 281.2], [29, 279.6], [35, 279.6], [40.5, 281], [40.5, 291], [43.5, 291]];
  const guided = await page.evaluate(route => {
    const g = window.__game, a = g.siteActivity();
    g.teleport(8.5, 288); g.key('KeyE'); g.key('KeyE');
    const shared = a.game.sharing;
    // Racing ahead leaves Theodoros without light.
    g.teleport(20, 281.2); a.update(1 / 60);
    const before = { ...a.snapshot().worker }; for (let i = 0; i < 30; i++) a.update(1 / 60);
    const waited = a.game.waiting && a.snapshot().worker.x === before.x;
    g.teleport(7.5, 288); a.update(1 / 60);
    let index = 0;
    for (let i = 0; i < 6000 && !a.game.done; i++) {
      const [tx, tz] = route[Math.min(index, route.length - 1)], p = g.player.pos;
      const d = Math.hypot(tx - p.x, tz - p.z), step = 5.2 / 60;
      // Slow down for him: wait whenever he is more than three steps behind.
      if (a.workerGap() < 3) {
        if (d <= step) { g.teleport(tx, tz); index++; } else g.teleport(p.x + (tx - p.x) * step / d, p.z + (tz - p.z) * step / d);
      }
      a.update(1 / 60);
    }
    for (let i = 0; i < 120; i++) a.update(1 / 60);
    return { shared, waited, ...a.snapshot(), grace: g.branch.grace, pride: g.branch.pride, flag: g.branch.flags['activity:cistern'] };
  }, route);
  check('cistern: sharing the lamp and slowing down brings Theodoros out with grace', guided.shared && guided.outcome === 'humble' && guided.grace === 1 && guided.pride === 0 && guided.flag === 'humble', JSON.stringify(guided));
  check('cistern: racing ahead leaves him waiting in the dark', guided.waited, JSON.stringify(guided));
  check('cistern: the lamp is passed onward to the next bearer', guided.bearer.x < 43, JSON.stringify(guided.bearer));
  await page.keyboard.press('r');
  await page.evaluate(() => { const g = window.__game; g.teleport(8.5, 288); g.key('KeyE'); g.teleport(43.5, 291); g.siteActivity().update(1 / 60); });
  await page.keyboard.press('f');
  check('cistern: claiming the exploration alone resolves pride; replay keeps the first result', await page.evaluate(() => {
    const g = window.__game; return g.siteActivity().snapshot().outcome === 'proud' && g.branch.pride === 0 && g.branch.flags['activity:cistern'] === 'humble';
  }));
  check('cistern: running out of oil is retryable without moral change', await page.evaluate(() => {
    const g = window.__game, a = g.siteActivity(); g.key('KeyR'); a.update(91);
    return a.snapshot().outcome === 'unfinished' && g.branch.grace === 1 && g.branch.pride === 0;
  }));
  await page.keyboard.press('q');
  check('cistern: Q returns to the road and restores daylight', await page.evaluate(() => {
    const g = window.__game; return g.state() === 'explore' && g.scene.fog.far === 62 && g.siteActivity() === null;
  }));

  // ----- Baths of Zeuxippus -------------------------------------------------------
  await enter('zeuxippus');
  check('baths: E at the road sign opens the basin activity', await page.locator('#site-activity-hud').isVisible());
  const unsafe = await page.evaluate(() => {
    const g = window.__game, a = g.siteActivity();
    g.teleport(21.8, 312.2); g.key('KeyF');
    g.teleport(36.8, 312.2); g.key('KeyE');
    return { outcome: a.snapshot().outcome, walking: a.game.walking, wobble: a.game.wobble > 0 };
  });
  check('baths: a cold basin cannot be taken and Theodora will not cross wet tiles', unsafe.outcome === null && !unsafe.walking && unsafe.wobble, JSON.stringify(unsafe));
  const remote = await page.evaluate(() => {
    const g = window.__game, a = g.siteActivity(); g.teleport(30, 308); a.keys.Space = true; a.update(1); a.keys.Space = false;
    return a.game.warmth <= 0.15;
  });
  check('baths: taps only run when you stand at them', remote);
  const prepared = await page.evaluate(() => {
    const g = window.__game, a = g.siteActivity();
    for (const x of [32.5, 26.5, 23.5]) { g.teleport(37.5, 309.7); g.key('KeyE'); g.teleport(x, 312.2); g.key('KeyE'); }
    const cold = a.site.water.material.color.getHex();
    g.teleport(19.3, 309.6);
    for (let i = 0; i < 600 && a.game.warmth < 0.55; i++) { a.keys.Space = true; a.update(1 / 60); }
    a.keys.Space = false; a.update(1 / 60);
    const warm = a.site.water.material.color.getHex();
    g.teleport(36.8, 312.2); g.key('KeyE');
    for (let i = 0; i < 1500 && !a.game.done; i++) a.update(1 / 60);
    for (let i = 0; i < 600; i++) a.update(1 / 60);
    return { ...a.snapshot(), changed: cold !== warm, grace: g.branch.grace, pride: g.branch.pride, mats: a.site.mats.every(m => m.visible) };
  });
  check('baths: warm water and covered tiles let Theodora bathe, with grace', prepared.outcome === 'humble' && prepared.mats && prepared.changed && prepared.grace === 2 && prepared.pride === 0, JSON.stringify(prepared));
  check('baths: another visitor uses the space you prepared', prepared.guest > 0.5 && prepared.visitor.x < 23, JSON.stringify(prepared));
  await page.keyboard.press('r');
  await page.evaluate(() => {
    const g = window.__game, a = g.siteActivity(); g.teleport(19.3, 309.6);
    for (let i = 0; i < 600 && a.game.warmth < 0.55; i++) { a.keys.Space = true; a.update(1 / 60); }
    a.keys.Space = false; g.teleport(21.8, 312.2); a.update(1 / 60);
  });
  await page.keyboard.press('f');
  check('baths: reserving the basin resolves pride; replay keeps the first result', await page.evaluate(() => {
    const g = window.__game; return g.siteActivity().snapshot().outcome === 'proud' && g.branch.pride === 0 && g.branch.flags['activity:zeuxippus'] === 'humble';
  }));
  check('baths: closing time is retryable without moral change', await page.evaluate(() => {
    const g = window.__game, a = g.siteActivity(); g.key('KeyR'); a.update(151);
    return a.snapshot().outcome === 'unfinished' && g.branch.grace === 2;
  }));
  check('baths: walking on into the city releases the activity', await page.evaluate(() => {
    const g = window.__game, a = g.siteActivity(); g.teleport(52, 250); a.update(0);
    return g.state() === 'explore' && g.siteActivity() === null && a.el.style.display === 'none';
  }));
  await page.reload(); await page.waitForFunction(() => window.__game);
  check('landmarks: first outcomes survive reload', await page.evaluate(() => ['cistern', 'zeuxippus'].every(id => window.__game.branch.flags[`activity:${id}`] === 'humble')));
  await page.evaluate(() => {
    const g = window.__game, stop = g.activityStops.find(a => a.id === 'cistern'); g.setFeature('cistern', false);
    g.setState('explore'); g.teleport(stop.x, stop.z); g.key('KeyE');
  });
  check('landmarks: a disabled cistern cannot start its activity', await page.evaluate(() => !['activity', 'activityLoading'].includes(window.__game.state())));
  check('landmarks: no page or console errors', errors.length === 0, JSON.stringify(errors));
  await page.close();

  const fresh = await newPage(browser);
  await fresh.page.evaluate(() => {
    const g = window.__game, s = g.activityStops.find(a => a.id === 'zeuxippus');
    g.setState('explore'); g.teleport(s.x, s.z); g.key('KeyE');
  });
  await fresh.page.waitForFunction(() => window.__game.siteActivity()?.active);
  await fresh.page.evaluate(() => {
    const g = window.__game, a = g.siteActivity(); g.teleport(19.3, 309.6);
    for (let i = 0; i < 600 && a.game.warmth < 0.55; i++) { a.keys.Space = true; a.update(1 / 60); }
    a.keys.Space = false; g.teleport(21.8, 312.2); a.update(1 / 60);
  });
  await fresh.page.keyboard.press('f');
  check('baths: first proud resolution grants pride and saves its outcome', await fresh.page.evaluate(() => window.__game.branch.pride === 1 && window.__game.branch.flags['activity:zeuxippus'] === 'proud'));
  await fresh.page.keyboard.press('q');
  await fresh.page.waitForFunction(() => window.__game.state() === 'explore');
  check('baths: Q hides the activity HUD', await fresh.page.locator('#site-activity-hud').isHidden());
  await fresh.page.close();
}
