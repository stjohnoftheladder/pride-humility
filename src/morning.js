import { SITES } from './config.js';
export const CHURCH_STEPS = { x: 52.5, z: 310.5 };
const SERVICE = 720, CLOSE = 900;
export class Morning {
  constructor({branch,player,hud,audio,market,onArrival}) {
    Object.assign(this,{branch,player,hud,audio,market,onArrival});
    this.clock=false;this.savedAt=0;
    this.el=document.createElement('div');this.el.className='panel';this.el.id='morning-hud';
    this.el.style.cssText='display:none;top:50px;left:50%;transform:translateX(-50%);font-size:10px;text-align:center;max-width:65%';
    document.getElementById('hud').appendChild(this.el);
    this.journal=document.createElement('section');this.journal.className='screen';this.journal.id='morning-journal';
    this.journal.style.cssText='display:none;overflow:auto;align-items:stretch;justify-content:flex-start;text-align:left;padding:24px;background:#120d07;z-index:40;gap:12px';
    const title=document.createElement('h2');title.textContent='A MORNING IN CONSTANTINOPLE';this.journal.appendChild(title);
    const note=document.createElement('p');note.textContent='Time rests while you read. Carry the bread to Theodora, the water carrier, and reach Hagia Sophia before the service bell. J / Esc returns to the street.';this.journal.appendChild(note);
    for(const site of SITES){const section=document.createElement('details'),heading=document.createElement('summary'),text=document.createElement('p');heading.textContent=site.label;text.textContent=site.note;section.append(heading,text);this.journal.appendChild(section);}
    document.getElementById('stage').appendChild(this.journal);
  }
  get run(){return this.branch.flags.morning;}
  begin(){
    if(!this.run){this.branch.flags.morning={elapsed:0,bell:0,gold:0,boots:false,rewards:{},arrived:null};this.branch.setFlag('errand:bread','carrying');this.branch.save();}
    this.player.travelBoost=this.run.boots?1.15:1;
    if(this.run.arrived)return;
    this.hud.message('The service begins after the final bell. Carry the bread to Theodora quietly, then reach Hagia Sophia. J opens the city journal; C shows the clock.',8000);
  }
  near(pos){return !!this.run&&!this.run.arrived&&Math.hypot(pos.x-CHURCH_STEPS.x,pos.z-CHURCH_STEPS.z)<3;}
  update(dt,state){
    const r=this.run;this.el.style.display=r&&state==='explore'&&!r.arrived?'block':'none';if(!r||r.arrived)return;
    if(['explore','race','cart','activity','battle'].includes(state)&&!document.hidden){
      r.elapsed+=dt;const bell=r.elapsed>=CLOSE?5:r.elapsed>=SERVICE?4:r.elapsed>=600?3:r.elapsed>=480?2:r.elapsed>=240?1:0;
      if(bell>r.bell){r.bell=bell;this.hud.message(['','The first bell carries across the city.','The second bell: the morning is passing.','The gathering bell: two minutes until the service.','The service bell rings. You can still arrive late.','The service has ended. The city carries on.'][bell],5000);this.soundBell();}
      if(r.elapsed-this.savedAt>=5){this.savedAt=r.elapsed;this.branch.save();}
    }
    this.el.textContent=`${r.bell>=4?'Service begun':r.bell===3?'Gathering bell':r.bell===2?'Second bell':r.bell===1?'First bell':'Before the first bell'} · ${r.gold} gold${r.boots?' · Swift shoes':''}${this.clock?` · ${Math.max(0,Math.ceil(SERVICE-r.elapsed))}s to service`:''} · J journal / C clock`;
  }
  soundBell(){const ctx=this.audio.ctx;if(!ctx||ctx.state!=='running')return;const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type='sine';osc.frequency.value=440;gain.gain.setValueAtTime(0.15,ctx.currentTime);gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+1.8);osc.connect(gain);gain.connect(ctx.destination);osc.start();osc.stop(ctx.currentTime+1.8);osc.onended=()=>{osc.disconnect();gain.disconnect();};}
  reward(id,amount){const r=this.run;if(!r||r.arrived||r.rewards[id])return false;r.rewards[id]=true;r.gold+=amount;this.branch.save();this.hud.message(`${amount} gold earned. Faster shoes cost 20 gold at a market stall. There is always another opportunity—but the bells keep moving.`,5000);return true;}
  buyShoes(){const r=this.run;if(!r||r.boots||r.gold<20)return false;r.gold-=20;r.boots=true;this.player.travelBoost=1.15;this.branch.save();return true;}
  arrive(){const r=this.run;if(!r)return;
    r.arrived??=r.elapsed<SERVICE?'on-time':r.elapsed<CLOSE?'late':'missed';this.branch.save();
    const delivery=this.branch.flags['errand:bread'],facts=[delivery==='quiet'?'The bread reached the stable hands quietly.':delivery==='praise'?'The bread arrived, and you asked for your generosity to be announced.':'The bread you promised to deliver is still with you.'];
    if(this.branch.flags.helpedCharioteer)facts.push('You stopped for the injured charioteer.');
    if(this.branch.flags['activity:harbour']==='humble')facts.push('You and Gregorios brought the grain aboard together.');
    if(this.branch.flags['activity:aqueduct']==='proud')facts.push('The patron’s fountain received water while households waited.');
    if(this.branch.flags['activity:forumConstantine']==='proud')facts.push('You accused Menas before hearing the evidence.');
    facts.push(`You brought ${r.gold} gold${r.boots?' and your swift shoes':''}.`);
    this.onArrival(r.arrived==='on-time'?'BEFORE THE SERVICE BELL':r.arrived==='late'?'THE SERVICE HAS BEGUN':'AFTER THE SERVICE',`${r.arrived==='on-time'?'You reach Hagia Sophia before the service begins.':r.arrived==='late'?'You enter quietly after the service has begun.':'The service has ended. You sit in the quiet forecourt; tomorrow offers another morning.'} ${facts.join(' ')}`);
  }
}
