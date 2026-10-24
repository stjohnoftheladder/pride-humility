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
 check('morning: E at the church steps enters Hagia Sophia, and the arrival is recorded on entry',await page.evaluate(()=>window.__game.state()==='sophia'&&window.__game.sophia.inside&&window.__game.morning.run.arrived==='on-time'));
 await page.evaluate(()=>window.__game.exitSophia());
 check('morning: church arrival recalls a quiet delivery without requiring battles',await page.evaluate(()=>window.__game.state()==='ending'&&window.__game.morning.run.arrived==='on-time'&&document.getElementById('ending-text').textContent.includes('quietly')));
 await page.evaluate(()=>localStorage.removeItem('pride-humility:homily'));
 const titles=[];
 for(let i=0;i<2;i++){
   await page.evaluate(async()=>{const g=window.__game;g.setState('explore');g.teleport(52.5,310.5);await g.enterSophia();});
   await page.waitForFunction(()=>!!window.__game.sophia.voice?.homily.title,{},{timeout:15000});
   titles.push(await page.evaluate(()=>window.__game.sophia.voice.homily.title));
   await page.evaluate(()=>window.__game.exitSophia());
 }
 const visits=await page.evaluate(titles=>({titles,state:window.__game.state(),people:window.__game.sophia.people.length}),titles);
 check('hagia sophia: each visit Chrysostom preaches the next homily, among a full congregation',visits.titles.length===2&&visits.titles[0]&&visits.titles[1]&&visits.titles[0]!==visits.titles[1]&&visits.people>300,JSON.stringify(visits));
 await page.reload();await page.waitForFunction(()=>window.__game);
 check('morning: after a finished morning the title offers to continue or begin anew',await page.evaluate(()=>document.getElementById('start-btn').textContent==='CONTINUE IN THE CITY'&&document.getElementById('new-morning-btn').style.display!=='none'));
 await page.click('#start-btn');
 check('morning: continuing a finished morning goes to the city without replaying the arrival card',await page.waitForFunction(()=>window.__game.state()==='explore'&&document.getElementById('ending-screen')?.style.display!=='flex',{},{timeout:5000}).then(()=>true,()=>false),await page.evaluate(()=>JSON.stringify({state:window.__game.state()})));
 check('morning: no page errors',errors.length===0,JSON.stringify(errors));await page.close();
 for(const [elapsed,expected] of [[730,'late'],[901,'missed']]){
 const fresh=await newPage(browser);await fresh.page.evaluate(({elapsed})=>{const g=window.__game;g.setState('explore');g.morning.begin();g.morning.update(elapsed,'explore');g.teleport(52.5,310.5);g.key('KeyE');g.exitSophia();},{elapsed});
 check(`morning: ${expected} arrival is remembered with unfinished responsibility`,await fresh.page.evaluate(expected=>window.__game.morning.run.arrived===expected&&document.getElementById('ending-text').textContent.includes('still with you'),expected));await fresh.page.close();
 }
}
