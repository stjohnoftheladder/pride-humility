export async function testMorning(browser,newPage,check){
 const {page,errors}=await newPage(browser);
 await page.evaluate(()=>{const g=window.__game;g.setState('explore');g.morning.begin();});
 check('morning: begins with a bread responsibility',await page.evaluate(()=>window.__game.branch.flags['errand:bread']==='carrying'));
 const timing=await page.evaluate(()=>{const m=window.__game.morning,before=m.run.elapsed;m.update(240,'explore');const elapsed=m.run.elapsed;m.update(120,'journal');m.update(120,'market');m.update(120,'paused');return {delta:elapsed-before,elapsed,after:m.run.elapsed,bell:m.run.bell};});
 check('morning: bells advance during play; reading and rest pause time',Math.abs(timing.delta-240)<0.001&&timing.after===timing.elapsed&&timing.bell===1,JSON.stringify(timing));
 check('morning: winnings buy a real speed upgrade once',await page.evaluate(()=>{const g=window.__game,m=g.morning;const paid=m.reward('race',20),repeat=m.reward('race',20),bought=m.buyShoes();return paid&&!repeat&&bought&&m.run.gold===0&&g.player.travelBoost===1.15&&!m.buyShoes();}));
 await page.reload();await page.waitForFunction(()=>window.__game);
 check('morning: reload retains elapsed time, responsibility and purchases',await page.evaluate(()=>{const g=window.__game;g.morning.begin();g.setState('explore');return g.morning.run.elapsed>=240&&g.morning.run.boots&&g.branch.flags['errand:bread']==='carrying'&&g.player.travelBoost===1.15;}));
 await page.evaluate(()=>{const g=window.__game;const target=g.market.npcs.find(n=>n.id==='vendor-5-1');g.market.errandAction(target,'deliverQuietly',g.branch);g.teleport(52.5,310.5);g.key('KeyE');});
 check('morning: church arrival recalls a quiet delivery without requiring battles',await page.evaluate(()=>window.__game.state()==='ending'&&window.__game.morning.run.arrived==='on-time'&&document.getElementById('ending-text').textContent.includes('quietly')));
 check('morning: no page errors',errors.length===0,JSON.stringify(errors));await page.close();
 for(const [elapsed,expected] of [[730,'late'],[901,'missed']]){
 const fresh=await newPage(browser);await fresh.page.evaluate(({elapsed})=>{const g=window.__game;g.setState('explore');g.morning.begin();g.morning.update(elapsed,'explore');g.teleport(52.5,310.5);g.key('KeyE');},{elapsed});
 check(`morning: ${expected} arrival is remembered with unfinished responsibility`,await fresh.page.evaluate(expected=>window.__game.morning.run.arrived===expected&&document.getElementById('ending-text').textContent.includes('still with you'),expected));await fresh.page.close();
 }
}
