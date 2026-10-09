export async function testActivities(browser, newPage, check) {
  const { page, errors } = await newPage(browser);
  async function enter(id) {
    await page.evaluate(id => {
      const g = window.__game, stop = g.activityStops.find(a => a.id === id);
      if (['activity', 'cart'].includes(g.state())) g.key('KeyQ');
      g.setState('explore'); g.teleport(stop.x, stop.z); g.key('KeyE');
    }, id);
    await page.waitForFunction(() => ['activity', 'cart'].includes(window.__game.state()));
  }
  await enter('aqueduct');
  check('activities: E loads the aqueduct at its road sign', await page.locator('#world-activity-hud').isVisible());
  await page.waitForFunction(()=>document.getElementById('world-activity-hud').parentElement.id==='world-play-dock');
  check('activities: controls and dialogue stack without overlap', await page.evaluate(()=>{
    const ids=['msg','world-activity-hud','engage-prompt'];const boxes=ids.map(id=>document.getElementById(id).getBoundingClientRect());
    return boxes.every((b,i)=>i===0||b.top>=boxes[i-1].bottom)&&boxes[0].top>window.innerHeight/2;
  }));
  check('aqueduct: targets are inside the landmark, away from the road',await page.evaluate(()=>window.__game.activities().site.targets.every(t=>t.x<40)));

  const walking = await page.evaluate(() => {
    const g=window.__game,a=g.activities();g.camera.rotation.set(0,0,0);
    const z=g.player.pos.z;window.dispatchEvent(new KeyboardEvent('keydown',{code:'KeyW'}));a.update(0.15);window.dispatchEvent(new KeyboardEvent('keyup',{code:'KeyW'}));
    const moved=g.player.pos.z<z;g.player.clearKeys();g.teleport(49.5,84);
    a.keys.Space=true;a.update(0.1);a.keys.Space=false;
    return {moved,remote:a.game.filled.every(n=>n===0),world:g.level.group.visible,canvas:a.el.querySelector('canvas')!==null};
  });
  check('aqueduct: walking stays in the world and distant gates cannot be opened', walking.moved&&walking.remote&&walking.world&&!walking.canvas, JSON.stringify(walking));
  const water = await page.evaluate(() => {
    const g = window.__game, a = g.activities();
    g.teleport(29, 80); g.key('KeyE');
    for (let i = 0; i < 4500 && !a.game.done; i++) {
      const model = a.game;
      const selected = model.filled.findIndex((n, index) => index < 3 && n < 18); g.teleport(32.5, 80 + selected * 3);
      const pressure = (Math.sin(model.time * 1.8) + 1) / 2;
      a.keys.Space = pressure > 0.33 && pressure < 0.77;
      a.update(1 / 60);
    }
    return { ...a.snapshot(), grace: g.branch.grace, pride: g.branch.pride };
  });
  check('aqueduct: timed fair distribution fills all households with grace', water.outcome === 'humble' && water.filled.slice(0, 3).every(n => n >= 18) && water.grace === 3 && water.pride === 0, JSON.stringify(water));
  check('aqueduct: basin water rises visibly', await page.evaluate(() => window.__game.activities().site.water.slice(0,3).every(mesh=>mesh.scale.y===1)));
  const patron = await page.evaluate(() => {
    const g = window.__game, a = g.activities();
    g.key('KeyR');
    g.teleport(29, 80); g.key('KeyE');
    for (let i = 0; i < 4500 && !a.game.done; i++) {
      const selected = a.game.filled[3] < 18 ? 3 : a.game.filled.findIndex(n => n < 18); g.teleport(32.5, 80 + selected * 3);
      const pressure = (Math.sin(a.game.time * 1.8) + 1) / 2;
      a.keys.Space = pressure > 0.33 && pressure < 0.77;
      a.update(1 / 60);
    }
    return { ...a.snapshot(), grace: g.branch.grace, pride: g.branch.pride };
  });
  check('aqueduct: patron route leaves shortages; replay grants no additional reward', patron.outcome === 'proud' && patron.filled.slice(0, 3).some(n => n < 18) && patron.grace === 3 && patron.pride === 0, JSON.stringify(patron));
  const failed = await page.evaluate(() => {
    const g = window.__game, a = g.activities(); g.key('KeyR'); a.update(101);
    return { outcome: a.snapshot().outcome, grace: g.branch.grace };
  });
  check('aqueduct: incomplete work is retryable without moral penalty', failed.outcome === 'unfinished' && failed.grace === 3);
  await enter('harbour');
  check('harbour: cart stays in the 3D quay with no activity overlay', await page.evaluate(() => window.__game.level.group.visible && window.__game.state() === 'cart') && await page.locator('#world-activity-hud').isHidden());
  await page.keyboard.down('w');
  await page.waitForFunction(() => window.__game.harbourCart.speed > 0.2 && window.__game.harbourCart.x < 61.5);
  check('harbour: real W key pushes the cart and camera through the world', await page.evaluate(() => window.__game.camera.position.x < 63.6));
  await page.keyboard.down('s');
  await page.waitForFunction(() => window.__game.harbourCart.speed === 0);
  check('harbour: S brakes even while W is held', await page.evaluate(() => window.__game.harbourCart.speed === 0));
  await page.keyboard.up('w'); await page.keyboard.up('s');
  async function cartRoute(help) {
    return page.evaluate(help => {
      const g=window.__game,c=g.harbourCart;g.key('KeyR');
      const points=[[57.5,359.2],[49,358],[44,359.5],[34.7,359.5]];let index=0;
      for(let i=0;i<6000&&!c.result;i++){
        const t=points[index],d=Math.hypot(c.x-t[0],c.z-t[1]);
        let turn=Math.atan2(c.x-t[0],c.z-t[1])-c.yaw;turn=Math.atan2(Math.sin(turn),Math.cos(turn));
        c.keys={KeyW:d>1.2&&Math.abs(turn)<0.2,KeyS:d<1.7||Math.abs(turn)>0.25,KeyA:turn>0.04,KeyD:turn< -0.04};
        if(d<1.3&&c.speed<0.7&&index<points.length-1){if(index===1&&help)c.key({code:'KeyE',preventDefault(){}},true);index++;}
        c.update(1/60);
      }
      return {...c.snapshot(),grace:g.branch.grace,pride:g.branch.pride};
    },help);
  }
  const cart = await cartRoute(true);
  check('harbour: physical route, braking and porter help deliver the grain together', cart.outcome === 'humble' && cart.helped && cart.cargo > 0 && cart.grace === 6, JSON.stringify(cart));
  const fast = await cartRoute(false);
  check('harbour: skipping the porter resolves the proud route without repeat rewards', fast.outcome === 'proud' && !fast.helped && fast.grace === 6 && fast.pride === 0, JSON.stringify(fast));
  await page.keyboard.press('q');
  check('harbour: Q restores walking and clears steering', await page.evaluate(() => window.__game.state() === 'explore' && !window.__game.harbourCart.active && Object.keys(window.__game.harbourCart.keys).length === 0));
  await enter('forumConstantine');
  check('forum: witnesses and evidence are in the circular court',await page.evaluate(()=>window.__game.activities().site.targets.every(t=>Math.hypot(t.x-25.5,t.z-157.5)<10.7)));

  const remote = await page.evaluate(() => {
    const g=window.__game;g.teleport(49.5,150);g.key('KeyE');g.key('KeyF');
    return !g.activities().snapshot().outcome&&g.activities().snapshot().evidence.length===0;
  });
  check('forum: testimony and accusation require approaching a witness', remote);
  await page.evaluate(() => { window.__game.teleport(30.5,157.5); window.__game.key('KeyH'); });
  check('forum: explanation requires actual evidence', await page.evaluate(() => !window.__game.activities().snapshot().outcome));
  await page.evaluate(() => {
    const g=window.__game;
    for(const [x,z] of [[27,160.5],[31,163.5],[32.5,154.8]]) { g.teleport(x,z);g.key('KeyE'); }
    g.teleport(30.5,157.5);g.key('KeyH');
  });
  check('forum: hearing witnesses and returning the purse resolves mercy', await page.evaluate(() => {
    const g = window.__game; return g.activities().snapshot().outcome === 'humble' && g.branch.grace === 9;
  }));
  check('forum: returned purse disappears and practice reuses the same props', await page.evaluate(() => {
    const a=window.__game.activities(),count=a.site.group.children.length,hidden=!a.site.purse.visible;
    window.__game.key('KeyR');return hidden&&a.site.purse.visible&&a.site.group.children.length===count;
  }));
  await page.keyboard.press('r'); await page.keyboard.press('f');
  check('forum: accusation resolves pride; replay cannot change the saved result', await page.evaluate(() => {
    const g = window.__game; return g.activities().snapshot().outcome === 'proud' && g.branch.pride === 0 && g.branch.flags['activity:forumConstantine'] === 'humble';
  }));
  await page.reload(); await page.waitForFunction(() => window.__game);
  check('activities: all first outcomes survive reload', await page.evaluate(() => ['aqueduct','harbour','forumConstantine'].every(id => window.__game.branch.flags[`activity:${id}`] === 'humble')));
  await page.evaluate(() => {
    const g = window.__game, stop = g.activityStops[0]; g.setFeature('aqueduct', false);
    g.setState('explore'); g.teleport(stop.x, stop.z); g.key('KeyE');
  });
  check('activities: a disabled site cannot start its activity', await page.evaluate(() => !['activity','activityLoading'].includes(window.__game.state())));
  check('activities: no page or console errors', errors.length === 0, JSON.stringify(errors));
  await page.close();
  const fresh = await newPage(browser);
  await fresh.page.evaluate(() => {
    const g = window.__game, s = g.activityStops.find(a => a.id === 'forumConstantine');
    g.setState('explore'); g.teleport(s.x, s.z); g.key('KeyE');
  });
  await fresh.page.waitForFunction(() => window.__game.state() === 'activity');
  await fresh.page.evaluate(() => { window.__game.teleport(30.5,157.5); window.__game.key('KeyF'); });
  check('activities: first proud resolution grants pride and saves its outcome', await fresh.page.evaluate(() => window.__game.branch.pride === 4 && window.__game.branch.flags['activity:forumConstantine'] === 'proud'));
  await fresh.page.keyboard.press('q');
  await fresh.page.waitForFunction(() => window.__game.state() === 'explore');
  check('activities: Q returns to exploration and hides the activity screen', await fresh.page.locator('#world-activity-hud').isHidden());
  await fresh.page.close();
}
