import assert from 'node:assert/strict';
import {mkdirSync,writeFileSync} from 'node:fs';
import {IdentityRouteDirector} from './src/story/IdentityRouteDirector.js';
import {IdentityManager} from './src/core/IdentityManager.js';
import {getIdentityRouteScene} from './src/story/IdentityRouteScenes.js';
import {IDENTITY_ROUTES,ROUTE_STEPS} from './src/story/IdentityRoutes.js';
import {zoneAssetManifest} from './src/art/ZoneAssetManifest.js';
import {soundManager} from './src/audio/SoundManager.js';
const noop=()=>{};globalThis.document={exitPointerLock:noop};soundManager.ensureRunning=async()=>false;
const checks=[],tick=()=>new Promise(resolve=>setTimeout(resolve,0));
function fixture(identity='LI',step='LI_3F_EVIDENCE',zone='b2_archive'){
 const manager=IdentityManager.createForTest(identity),flags={};
 manager.runSave.currentRouteStep=manager.route.indexOf(step);
 manager.runSave.completedStoryModules=manager.route.slice(0,manager.runSave.currentRouteStep);
 manager.runSave.currentMilestone=step;
 const gameState={getFlag:key=>flags[key]??false,setFlag:(key,value)=>{flags[key]=value;},isTaskComplete:()=>true,setGameTime:noop};
 const ui={starts:0,dialogueSequence:null,renderTaskBoard(_,items){this.objective=items[0]?.text;},showDialogue(lines,onComplete){this.starts++;this.dialogueSequence={lines,index:1,onComplete};},showSubtitle:noop};
 const router={activeZoneId:zone,activeZoneInstance:{interactables:[]}};
 const d=new IdentityRouteDirector({manager,gameState,controller:{enabled:true,interactables:[]},worldRouter:router,uiManager:ui,panel:{render:noop},prepareZone:async()=>{}});
 d.step=step;d.beats=getIdentityRouteScene(step,identity);d.beatIndex=0;
 return {d,ui,manager,gameState,router,flags};
}
async function check(name,run){try{await run();checks.push({name,status:'PASS'});console.log('PASS',name);}catch(e){checks.push({name,status:'FAIL',error:e.message});console.error('FAIL',name,e.message);}}
await check('Every playable route destination, including B1, has an explicit loading manifest',()=>{
 const missing=[...new Set(Object.values(ROUTE_STEPS).map(s=>s.zoneId))].filter(id=>!zoneAssetManifest[id]);
 assert.deepEqual(missing,[],'A routed zone must not enter an endless missing-manifest retry');
 assert.ok(zoneAssetManifest.b1_dispatch_hub.essential.models.includes('storageCabinet'));
});
await check('Li: previously visited 3F rooms cannot launch a 3F dialogue while still in B2',()=>{
 const {d,ui,flags}=fixture();flags.ADMIN_OFFICE_ENTERED=true;flags.ARCHIVE_ROOM_ENTERED=true;d.awaitingZone='first_campus_3f';
 for(let frame=0;frame<120;frame++)d.update();
 assert.equal(ui.starts,0,'3F dialogue was started in B2');assert.equal(d.awaitingZone,'first_campus_3f');
 d.renderObjective();assert.match(ui.objective,/離開 B2.*3F/);
});
await check('Li: continuous updates cannot restart the active dialogue on 3F',async()=>{
 const {d,ui,router,flags,manager}=fixture('LI','LI_3F_EVIDENCE','first_campus_3f');
 flags.ADMIN_OFFICE_ENTERED=true;flags.ARCHIVE_ROOM_ENTERED=true;
 await d.onArriveTargetZone();d.update();assert.equal(ui.starts,1);
 const conversation=ui.dialogueSequence;conversation.index=2;
 for(let frame=0;frame<120;frame++)d.update();
 assert.equal(ui.starts,1,'The first line was restarted every frame');assert.equal(ui.dialogueSequence,conversation);assert.equal(conversation.index,2);
 ui.dialogueSequence=null;conversation.onComplete();await tick();
 assert.equal(manager.currentRouteStep,'M9');assert.equal(d.step,'M9');assert.equal(ui.starts,1);
 assert.ok(manager.runSave.evidence['route:LI_3F_EVIDENCE:0']);d.removeInteractionTarget();
});
await check('Li: absent room visits do not get fabricated or auto-completed',async()=>{
 const {d,ui,flags}=fixture('LI','LI_3F_EVIDENCE','first_campus_3f');await d.onArriveTargetZone();
 for(const visited of [false,true]){flags.ADMIN_OFFICE_ENTERED=visited;for(let frame=0;frame<20;frame++)d.update();assert.equal(ui.starts,0);}
 assert.equal(d.step,'LI_3F_EVIDENCE');
});
await check('Chen: chapter recovery restores a badge only from its recorded M4 inspection',async()=>{
 for(const hasProof of [false,true]){
  const {d,manager,flags}=fixture('CHEN','CHEN_M8_DISPATCH','b2_archive');
  if(hasProof)manager.recordEvidence({id:'route:M4:5',category:'route',milestone:'M4',visibleText:'已檢驗並收起識別證'});
  await d.loadCurrentStep({forceLoad:false});
  assert.equal(flags.CHEN_GREY_BADGE_COLLECTED===true,hasProof,'No badge should be invented, or lost after recovery');
  assert.equal(d.awaitingZone,'b1_dispatch_hub');d.removeInteractionTarget();
 }
});
await check('Route counts, B2 next chapters and final single-commit contract are unchanged',()=>{
 assert.deepEqual(Object.fromEntries(Object.entries(IDENTITY_ROUTES).map(([id,r])=>[id,r.length])),{ZHANG:16,LI:17,ZHOU:16,CHEN:15});
 const next={LI:'LI_3F_EVIDENCE',ZHANG:'ZHANG_3F_ARCHIVE',ZHOU:'M8',CHEN:'CHEN_M8_DISPATCH'};
 for(const [id,step] of Object.entries(next)){const r=IDENTITY_ROUTES[id];assert.equal(r[r.indexOf('B2')+1],step);}
});
const out=process.env.B2_RECOVERY_EVIDENCE||'qa-results/b2-recovery';mkdirSync(out,{recursive:true});
writeFileSync(out+'/functional.json',JSON.stringify({checks,verdict:checks.every(c=>c.status==='PASS')?'PASS':'FAIL'},null,2));
if(checks.some(c=>c.status==='FAIL'))process.exitCode=1;
