import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {IdentityRouteDirector} from './src/story/IdentityRouteDirector.js';
import {IdentityManager} from './src/core/IdentityManager.js';
import {getIdentityRouteScene} from './src/story/IdentityRouteScenes.js';
import {IDENTITY_ROUTES} from './src/story/IdentityRoutes.js';
import {soundManager} from './src/audio/SoundManager.js';
const noop=()=>{};
global.document={exitPointerLock:noop};
soundManager.ensureRunning=async()=>false;
const results=[];
const tick=()=>new Promise(resolve=>setTimeout(resolve,0));
function fixture(identity='ZHANG'){
 const flags={},manager=IdentityManager.createForTest(identity);
 manager.runSave.currentRouteStep=manager.route.indexOf('M3');
 manager.runSave.completedStoryModules=manager.route.slice(0,manager.runSave.currentRouteStep);
 const gameState={getFlag:k=>flags[k]===true,setFlag:(k,v)=>{flags[k]=v;},isTaskComplete:()=>true};
 const ui={renderTaskBoard(_,items){this.objective=items[0].text;},showDialogue(lines,done){this.dialogue={lines,done};},showSubtitle:noop,openStoryChoice(choice){this.choice=choice;},closeStoryChoice:noop};
 const controller={enabled:true,interactables:[]};
 const router={activeZoneId:'first_campus_2f',activeZoneInstance:{interactables:[]}};
 const d=new IdentityRouteDirector({manager,gameState,controller,worldRouter:router,uiManager:ui,panel:{render:noop},prepareZone:async()=>{},onEnding:result=>{ui.ending=result;}});
 d.step='M3';d.beats=getIdentityRouteScene('M3',identity);d.beatIndex=0;
 return {d,manager,gameState,ui,router,flags};
}
async function test(name,run){try{await run();results.push({name,status:'PASS'});console.log('PASS',name);}catch(e){results.push({name,status:'FAIL',error:e.message});console.error('FAIL',name,e.message);}}
async function finish(ui){const {done}=ui.dialogue;ui.dialogue=null;done();await tick();}
await test('Zhang receipt dialogue follows the safe bedside choice, not an unannounced second ER hotspot',()=>{
 const {d}=fixture();assert.equal(d.bindingFor('M3',1).auto,true);
 assert.doesNotMatch(d.beats[1].review,/回 316/);
 assert.equal(d.bindingFor('M3',2).id,'316_LEGACY_TERMINAL');
});
await test('Zhang speaks the requested thought; other routes keep their own handoff',()=>{
 const z=getIdentityRouteScene('M3','ZHANG');
 assert.ok(z[1].lines.some(l=>l.speaker==='內心'&&l.text.includes('那我帶回 316辦公室用終端機查查看吧')));
 for(const id of ['LI','CHEN']){
  const {d}=fixture(id);assert.equal(d.bindingFor('M3',1).id,'ER_GHOST_REGISTRATION');
  assert.equal(d.bindingFor('M3',2).id,undefined);
  assert.equal(d.beats[1].review,'帶著 1998-ER-0217 掛號聯回 316');
 }
});
await test('Safe choice -> receipt -> 316 query target; merely arriving cannot complete the query',async()=>{
 const {d,ui,router,gameState,flags}=fixture();
 try{
  d.inspect();await finish(ui);ui.choice.onPrimary();await tick();
  assert.equal(d.beatIndex,1);assert.equal(flags.ER_IDENTITY_VERIFICATION_CHOSEN,true);
  await new Promise(resolve=>setTimeout(resolve,240));
  assert.ok(ui.dialogue,'receipt must start without interacting with ER_GHOST_REGISTRATION');
  await finish(ui);
  assert.equal(flags.ER0033_SLIP_COLLECTED,true);assert.equal(d.beatIndex,2);
  assert.equal(d.awaitingZone,'first_campus_3f');assert.match(ui.objective,/316.*終端/);
  const terminal={userData:{id:'316_LEGACY_TERMINAL',type:'legacy_terminal_316',interactable:true,label:'查看 316 舊資料終端'}};
  router.activeZoneId='first_campus_3f';router.activeZoneInstance.interactables=[terminal];
  await d.onArriveTargetZone();assert.equal(d.boundTarget.object,terminal);
  assert.equal(d.handleInteract(terminal),false,'pass through to existing archive query handler');
  assert.equal(d.allowWorldInteraction(terminal),true);
  assert.equal(d.matchesBinding({type:'workstation',id:'WORKSTATION'}),false);
  assert.equal(d.bindingCompletionReady(),false);assert.equal(d.beatIndex,2);
  gameState.setFlag('M3_316_DECODED',true);assert.equal(d.bindingCompletionReady(),true);
 }finally{d.removeInteractionTarget();}
});
await test('Wrong new-record choice still fails and cannot hand out the old slip',async()=>{
 const {d,ui,flags}=fixture();d.inspect();await finish(ui);ui.choice.onSecondary();await finish(ui);
 assert.equal(ui.ending.reason,'ER_UNVERIFIED_RECORD_PATIENTIZATION');assert.equal(flags.ER0033_SLIP_COLLECTED,undefined);assert.equal(d.beatIndex,0);
});
await test('Route lengths, M3 evidence beats and single-query gate are unchanged',()=>{
 assert.deepEqual(Object.fromEntries(Object.entries(IDENTITY_ROUTES).map(([id,r])=>[id,r.length])),{ZHANG:16,LI:17,ZHOU:16,CHEN:15});
 const {d}=fixture();assert.equal(d.beats.length,3);assert.equal(d.beats[1].flag,'ER0033_SLIP_COLLECTED');
 assert.equal(d.bindingFor('M3',2).completeFlag,'M3_316_DECODED');assert.equal(d.bindingFor('M3',2).passthrough,true);
});
const out=process.env.ZHANG_TERMINAL_EVIDENCE||'qa-results/zhang-terminal';mkdirSync(out,{recursive:true});
writeFileSync(out+'/functional.json',JSON.stringify({checks:results,verdict:results.every(r=>r.status==='PASS')?'PASS':'FAIL'},null,2));
if(results.some(r=>r.status==='FAIL'))process.exitCode=1;
