// Augustaion procession and Chalke petition, driven with keyboard events only.
export async function testPalace(browser, newPage, check) {
  const { page, errors } = await newPage(browser);
  async function enter(id) {
    await page.evaluate(id => {
      const g = window.__game, stop = g.activityStops.find(a => a.id === id);
      if (g.state() === 'activity') g.key('KeyQ');
      g.setState('explore'); g.teleport(stop.x, stop.z); g.key('KeyE');
    }, id);
    await page.waitForFunction(id => window.__game.state() === 'activity' && window.__game.activities().snapshot()?.id === id, id);
  }
  await enter('augustaion');
  check('augustaion: E at the sign starts the procession in the docked HUD', await page.evaluate(() =>
    document.getElementById('palace-activity-hud').parentElement.id === 'world-play-dock' && window.__game.level.group.visible));
  // Clear each bystander as the cross approaches; optionally ask Sergios to keep the slowest pace.
  const walk = (pace) => page.evaluate(pace => {
    const g = window.__game, a = g.activities(), s = a.site;
    if (pace) { const l = s.walkers[0]; g.teleport(l.x + 0.8, l.z + 0.8); g.key('KeyE'); }
    for (let i = 0; i < 60 * 160 && !a.game.done; i++) {
      const lead = s.walkers[0], next = s.bystanders.find(b => !b.aside && b.x > lead.x);
      if (next && next.x - lead.x < 3) { g.teleport(next.x + 0.6, next.z + 0.8); g.key('KeyE'); }
      a.update(1 / 60);
    }
    return { ...a.snapshot(), grace: g.branch.grace, pride: g.branch.pride };
  }, pace);
  const together = await walk(true);
  check('augustaion: opening the lane at the slowest pace brings everyone in together', together.outcome === 'humble' && together.lead - together.rear < 7.5 && together.grace === 2 && together.pride === 0, JSON.stringify(together));
  await page.keyboard.press('r');
  const strung = await walk(false);
  check('augustaion: rushing ahead without the slow walkers is retryable with no meter change', strung.outcome === 'unfinished' && strung.grace === 2 && strung.pride === 0, JSON.stringify(strung));
  await page.keyboard.press('r');
  const pushed = await page.evaluate(() => {
    const g = window.__game, a = g.activities(), b = a.site.bystanders[0];
    g.teleport(b.x + 0.6, b.z + 0.8); g.key('KeyF');
    const shoved = a.site.bystanders.every(x => x.aside && x.tilt > 0);
    for (let i = 0; i < 60 * 160 && !a.game.done; i++) a.update(1 / 60);
    return { ...a.snapshot(), shoved, grace: g.branch.grace, pride: g.branch.pride };
  });
  check('augustaion: pushing to the front leaves people behind; replay keeps the first result', pushed.outcome === 'proud' && pushed.shoved && pushed.lead - pushed.rear > 7.5 && pushed.pride === 0 && pushed.grace === 2, JSON.stringify(pushed));

  await enter('chalke');
  const remote = await page.evaluate(() => { const g = window.__game; g.teleport(90, 318); g.key('KeyF'); g.key('KeyH'); return g.activities().snapshot(); });
  check('chalke: jumping the queue requires reaching the clerk', !remote.outcome && !remote.helped, JSON.stringify(remote));
  const early = await page.evaluate(() => {
    const g = window.__game, a = g.activities(), e = a.site.petitioners[2];
    g.teleport(e.x, e.z + 1); g.key('KeyH'); return a.snapshot().helped;
  });
  check('chalke: helping Photeine first requires hearing her', early === false);
  const kept = await page.evaluate(() => {
    const g = window.__game, a = g.activities(), s = a.site;
    for (const p of s.petitioners) { g.teleport(p.x, p.z + 1); g.key('KeyE'); }
    const e = s.petitioners[2]; g.teleport(e.x, e.z + 1); g.key('KeyH');
    for (let i = 0; i < 60 * 40 && a.game.served < 5; i++) { g.teleport(a.slotX(), 323); a.update(1 / 60); }
    g.teleport(74.6, 321.6); g.key('KeyE');
    return { ...a.snapshot(), grace: g.branch.grace, pride: g.branch.pride };
  });
  check('chalke: keeping your place and carrying Photeine’s need resolves humbly', kept.outcome === 'humble' && kept.heard === 5 && kept.helped && kept.grace === 4, JSON.stringify(kept));
  await page.keyboard.press('r');
  const alone = await page.evaluate(() => {
    const g = window.__game, a = g.activities();
    let skipped = false;
    for (let i = 0; i < 60 * 40 && a.game.served < 5; i++) { a.update(1 / 60); skipped ||= a.site.petitioners[2].aside; }
    g.teleport(74.6, 321.6); g.key('KeyE');
    return { ...a.snapshot(), skipped, grace: g.branch.grace, pride: g.branch.pride };
  });
  check('chalke: the clerk passes Photeine over; a petition for yourself alone changes no meters', alone.outcome === 'unfinished' && alone.skipped && alone.grace === 4 && alone.pride === 0, JSON.stringify(alone));
  await page.keyboard.press('r');
  await page.evaluate(() => { const g = window.__game; g.teleport(74.6, 321.6); g.key('KeyF'); });
  check('chalke: claiming a connection jumps the queue; replay keeps the saved result', await page.evaluate(() => {
    const g = window.__game; return g.activities().snapshot().outcome === 'proud' && g.branch.pride === 0 && g.branch.flags['activity:chalke'] === 'humble';
  }));
  check('chalke: walking back to the road releases the activity', await page.evaluate(() => {
    const g = window.__game; g.teleport(40, 300); g.activities().update(0); return g.state() === 'explore' && g.activities().snapshot() === null;
  }));
  await enter('aqueduct');
  check('palace: the world coordinator still runs the aqueduct afterward', await page.evaluate(() => window.__game.activities().snapshot().id === 'aqueduct'));
  await page.keyboard.press('q');
  await page.reload(); await page.waitForFunction(() => window.__game);
  check('palace: first outcomes survive reload', await page.evaluate(() => ['augustaion', 'chalke'].every(id => window.__game.branch.flags[`activity:${id}`] === 'humble')));
  check('palace: no page or console errors', errors.length === 0, JSON.stringify(errors));
  await page.close();

  const fresh = await newPage(browser);
  await fresh.page.evaluate(() => {
    const g = window.__game, s = g.activityStops.find(a => a.id === 'chalke');
    g.setState('explore'); g.morning.begin(); g.teleport(s.x, s.z); g.key('KeyE');
  });
  await fresh.page.waitForFunction(() => window.__game.state() === 'activity');
  await fresh.page.evaluate(() => { const g = window.__game; g.teleport(74.6, 321.6); g.key('KeyF'); });
  check('chalke: first proud resolution grants pride and morning gold once', await fresh.page.evaluate(() => {
    const g = window.__game; return g.branch.pride === 3 && g.branch.flags['activity:chalke'] === 'proud' && g.morning.run.gold === 6;
  }));
  await fresh.page.keyboard.press('q');
  await fresh.page.waitForFunction(() => window.__game.state() === 'explore');
  check('chalke: Q hides the activity HUD', await fresh.page.locator('#palace-activity-hud').isHidden());
  await fresh.page.close();
}
