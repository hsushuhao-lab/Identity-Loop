import {chromium} from 'playwright';
import {preview} from 'vite';
import {mkdir,readFile,readdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {IDENTITY_PROFILES,IDENTITY_STORAGE_KEY} from '../src/core/IdentityManager.js';
import {getGoodEnding} from '../src/story/IdentityLoopEndings.js';

const out=process.argv[2]||'qa-results/story-playthrough';
const supplied=process.argv[3]||null;
const root=fileURLToPath(new URL('..',import.meta.url));
await mkdir(out,{recursive:true});
const server=supplied?null:await preview({root,preview:{port:4173,strictPort:true}});
const base=(supplied||'http://localhost:4173/').replace(/\/+$/,'')+'/';
const url=base+'?qa=story';
const browser=await chromium.launch({headless:true});
const requiredShots=[
  'm1-3f-admin-316.png','m1-3f-storage-annie-static.png','m1-annie-close-inspection.png','m2-4f-nursing-station.png','m2-4f-duty-room.png',
  'm2-408c-bed.png','m2-409-sealed.png','m3-er-nursing-station.png','m3-0033-registration.png',
  'm3-316-legacy-terminal-phone.png','m4-ordinary-patient.png','m4-transfer-form.png','m4-guard-roster-clue.png',
  'm5-security-playback.png','m5-outbound-bridge-baseline.png','m5-return-bridge-annie.png','m5-bridge-close-annie.png','m6-elevator-display-6.png',
  'm6-annie-cpr-long.png','m6-stethoscope-relic.png','m6-annie-cpr.png','m6-annie-cpr-close.png','m7-1f-guard-post.png','m7-b-panel-concealed-door.png','m7-b2-mirror-316.png',
  'm9-dual-identity-form.png','m9-successful-dawn-ending.png'
];
const report={url,sourceSha:process.env.GITHUB_SHA||'local-working-tree',started:new Date().toISOString(),milestones:[],cinematicFlags:[],screenshots:[],motionScreenshots:[],functionalScreenshots:[],functionalFlows:[],screenshotWarnings:[],errors:[],method:'Browser-driven M1-M9 story playthrough with named scene-anchor frustum checks, 27 required full-resolution captures, bridge-idle/CPR motion frames, QA-positioned phone raycast + E checks, physical M7 guard-post-to-B-Panel interaction, and runtime cinematic completion flags.'};
let page;

async function snap(){return page.evaluate(()=>window.__storyQA.snapshot());}
async function mark(label,extra={}){
  const s=await snap();report.milestones.push({label,...extra,zone:s.zone,time:s.time,loopCount:s.memory.loopCount,erosion:s.memory.identityErosionLevel});
  await writeFile(out+'/progress.json',JSON.stringify(report,null,2));
  console.log(label,JSON.stringify({zone:s.zone,time:s.time,loop:s.memory.loopCount,erosion:s.memory.identityErosionLevel,...extra}));
}
async function shot(name,zone,spawn,anchorName,position,target){
  const file=name+'.png';
  if(zone)await load(zone,spawn);
  const view=await q(args=>window.__storyQA.captureView(args),{anchorName,position,target});
  await page.waitForTimeout(180);
  const buffer=await page.screenshot({path:out+'/'+file,fullPage:false,timeout:90000});
  const image=await readFile(out+'/'+file);
  assert(buffer.length>1024,'Screenshot was empty: '+file);
  assert.deepEqual([...image.subarray(0,8)],[137,80,78,71,13,10,26,10],'Invalid PNG: '+file);
  assert.equal(image.readUInt32BE(16),1440,'Unexpected screenshot width: '+file);
  assert.equal(image.readUInt32BE(20),900,'Unexpected screenshot height: '+file);
  report.screenshots.push({
    file,anchorName,rect:view.rect,bytes:image.length,
    camera:{position,target,distance:Number(Math.hypot(...position.map((value,index)=>value-target[index])).toFixed(2))},
    sha256:createHash('sha256').update(image).digest('hex')
  });
  await writeFile(out+'/progress.json',JSON.stringify(report,null,2));
  console.log('SCREENSHOT',JSON.stringify({file,anchorName,rect:view.rect,bytes:image.length}));
}
async function motionShot(name,anchorName,position,target,motionValue){
  const file='motion/'+name+'.png';
  await mkdir(out+'/motion',{recursive:true});
  const view=await q(args=>window.__storyQA.captureView(args),{anchorName,position,target});
  let frozen=false;
  if(motionValue?.capture==='cpr'){
    const phase=motionValue.phase;
    const sample=await q(phase=>{
      const zone=window.__storyQA.worldRouter.activeZoneInstance;
      const rig=zone.annie.userData.rig;
      zone.__storyQaMotionUpdate={own:Object.hasOwn(zone,'update'),update:zone.update,elapsed:rig.elapsed,cprElapsed:zone.cprElapsed,nextCprSound:zone.nextCprSound};
      rig.elapsed=0;
      zone.cprElapsed=0;
      zone.nextCprSound=10;
      zone.update(null,(60/110)*(phase==='press'?.25:.75));
      const value=rig.compression;
      zone.update=()=>{};
      return {value};
    },phase);
    frozen=true;
    motionValue=sample.value;
  }
  try{
    const buffer=await page.screenshot({path:out+'/'+file,fullPage:false,timeout:90000});
    assert(buffer.length>1024,'Motion screenshot was empty: '+file);
    const image=await readFile(out+'/'+file);
    report.motionScreenshots.push({
      file,anchorName,rect:view.rect,motionValue,
      camera:{position,target,distance:Number(Math.hypot(...position.map((value,index)=>value-target[index])).toFixed(2))},
      bytes:image.length,sha256:createHash('sha256').update(image).digest('hex')
    });
    await writeFile(out+'/progress.json',JSON.stringify(report,null,2));
  }finally{
    if(frozen)await q(()=>{
      const zone=window.__storyQA.worldRouter.activeZoneInstance;
      const previous=zone.__storyQaMotionUpdate;
      zone.annie.userData.rig.elapsed=previous.elapsed;
      zone.cprElapsed=previous.cprElapsed;
      zone.nextCprSound=previous.nextCprSound;
      if(previous.own)zone.update=previous.update;else delete zone.update;
      delete zone.__storyQaMotionUpdate;
    });
  }
  return motionValue;
}
async function q(fn,arg){return page.evaluate(fn,arg);}
async function waitForPageCondition(target,predicate,timeout=10000){
  const deadline=Date.now()+timeout;
  while(Date.now()<deadline){
    if(await target.evaluate(predicate))return;
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  throw new Error(`page condition timed out after ${timeout}ms`);
}
async function taskText(){return q(()=>document.getElementById('task-panel')?.innerText||'');}
async function load(zone,spawn){await q(zone=>window.__storyQA.prefetch({zoneId:zone}),zone);await q(({zone,spawn})=>window.__storyQA.load(zone,spawn),{zone,spawn});await page.waitForTimeout(120);}
async function enter(zone,spawn){await q(({zone,spawn})=>window.__storyQA.enter(zone,spawn),{zone,spawn});await page.waitForTimeout(160);}
async function flag(k,v=true){await q(({k,v})=>window.__storyQA.setFlag(k,v),{k,v});}
async function assertCinematicPlayed(id){
  const flag=`CG_${id}_PLAYED`;
  assert.equal(await q(flag=>window.__storyQA.gameState.getFlag(flag)===true,flag),true,`cinematic did not complete: ${id}`);
  report.cinematicFlags.push({id,played:true});
}
async function task(id){await q(id=>window.__storyQA.task(id),id);}
async function drainDialogue(){while(await q(()=>!!window.__storyQA.uiManager.dialogueSequence))await page.keyboard.press('e');}
async function interact(query){await q(query=>window.__storyQA.interact(query),query);await page.waitForTimeout(100);await drainDialogue();}
async function pressEAt(target,id){
  const aim=await q(point=>window.__storyQA.lookAt(point),target);
  assert.equal(aim.current,id,`crosshair raycast did not hit ${id}: ${JSON.stringify(aim)}`);
  await page.keyboard.press('e');
  await page.waitForTimeout(180);
  return aim;
}
async function walkTo(x,z,{radius=.42,timeout=20000}={}){
  await q(point=>window.__storyQA.lookAt(point),[x,1.7,z]);
  await page.keyboard.down('w');
  try{
    await page.waitForFunction(({x,z,radius})=>{
      const p=window.__storyQA.controller.position;
      return Math.hypot(p.x-x,p.z-z)<=radius;
    },{x,z,radius},{timeout});
  }finally{await page.keyboard.up('w');}
  await page.waitForTimeout(180);
}
async function answer4fPhone(label){
  await q(position=>window.__storyQA.controller.teleport(...position),[-9.45,1.7,4.1]);
  const aim=await pressEAt([-9.45,.84,3.34],'4F_DUTY_PHONE');
  report.functionalFlows.push({name:label,steps:['QA bridge positioned on phone near side','live crosshair raycast resolved 4F_DUTY_PHONE','pressed E'],raycast:aim});
}
async function functionalShot(file){
  await mkdir(out+'/functional',{recursive:true});
  const path=out+'/functional/'+file;
  const buffer=await page.screenshot({path,fullPage:false,timeout:90000});
  const image=await readFile(path);
  assert(buffer.length>1024,'Functional screenshot was empty: '+file);
  report.functionalScreenshots.push({file:'functional/'+file,bytes:image.length,sha256:createHash('sha256').update(image).digest('hex')});
  await writeFile(out+'/progress.json',JSON.stringify(report,null,2));
}
async function domClick(selector){
  await page.evaluate(selector=>{
    const el=document.querySelector(selector);
    if(!el)throw new Error('DOM click target missing '+selector);
    if(el.disabled)throw new Error('DOM click target disabled '+selector);
    el.click();
  },selector);
  await page.waitForTimeout(120);
}
async function closeArchive(){if(await page.locator('#archive-modal.active').count())await domClick('#btn-close-archive');}
async function secondary(){await domClick('#story-choice-modal.active #btn-story-secondary');}
async function primary(){await domClick('#story-choice-modal.active #btn-story-primary');}
async function setM2Checkpoint(){
  await flag('STAFF_ACCESS_CARD',true);await flag('HOOK_409_ZERO_ROOM',true);
  for(const id of ['KEY_PICKUP','WARD_ENTRY','P1_4F_REPORT'])await task(id);
  await load('first_campus_4f');
}

try{
  page=await browser.newPage({viewport:{width:1440,height:900}});
  page.on('pageerror',e=>report.errors.push('pageerror: '+e.message));
  page.on('console',m=>{if(m.type()==='error')report.errors.push('console: '+m.text());});
  page.on('response',r=>{if(r.status()>=400)report.errors.push(r.status()+' '+r.url());});

  // Public mode must not expose the story QA bridge.
  const publicPage=await browser.newPage({viewport:{width:900,height:600}});
  await publicPage.goto(base,{waitUntil:'load',timeout:180000});
  await waitForPageCondition(publicPage,()=>window.worldRouter?.activeZoneInstance,180000);
  assert.equal(await publicPage.evaluate(()=>typeof window.__storyQA),'undefined');
  await publicPage.close();

  await page.goto(url,{waitUntil:'load',timeout:180000});
  await waitForPageCondition(page,()=>window.__storyQA?.worldRouter?.activeZoneInstance,180000);
  await mark('Story QA bridge ready');
  await shot('m1-3f-admin-316','first_campus_3f','m0_316_office','AdminDesk_Monitor',[-19.25,1.7,3.65],[-19.25,1.25,5.18]);
  await shot('m1-3f-storage-annie-static','first_campus_3f','m0_3f_corridor','Annie_STORAGE_STATIC',[14.8,1.7,5.85],[14.2,.9,5.15]);
  let mannequinCheck=await q(()=>{const level=window.__storyQA.worldRouter.activeZoneInstance.levelInstance;const a=level.anneGroup;const names=[];a.traverse(object=>names.push(object.name));return {state:a.userData.state,nose:!!a.getObjectByName('Annie_MoldedNose'),face:a.getObjectByName('Annie_SmoothVinylFace')?.material?.roughness,noEyesOrMouth:!names.some(name=>/^Annie_(FixedEye|UnfocusedIris|FixedPupil|Mouth|BlowTrainingMouth)/.test(name)),chestClear:!names.some(name=>/^Annie_(Stethoscope|CoatPocket|CoatButton|CompressionPlate|ScrubNeckline)/.test(name)),noBodyStethoscope:!level.anneStethoscopeProp}});
  assert.equal(mannequinCheck.state,'STORAGE_STATIC');assert(mannequinCheck.nose);assert(mannequinCheck.noEyesOrMouth);assert(mannequinCheck.chestClear);assert(mannequinCheck.face<.5);assert(mannequinCheck.noBodyStethoscope);
  await shot('m1-annie-close-inspection',null,null,'Annie_SmoothVinylFace',[12.81,1.7,5.8],[12.81,.84,5.16]);
  // M1: keep the player unnamed and explicitly reject the system's identity template.
  await load('first_campus_3f','m0_316_office');
  await flag('OPENED_316',true);await flag('HIS_CREDENTIALS',true);
  await interact({id:'E_HANDOFF'});
  await domClick('#btn-sign-handoff');
  await waitForPageCondition(page,()=>document.getElementById('story-choice-modal')?.classList.contains('active'),30000);
  assert.match(await page.locator('#story-choice-title').innerText(),/值班身分驗證異常/);
  assert.match(await page.locator('#story-choice-body').innerText(),/預設值班醫師模板/);
  await functionalShot('m1-handoff-identity-choice.png');
  await secondary();
  await waitForPageCondition(page,()=>window.__storyQA.gameState.isTaskComplete('E_HANDOFF')===true,10000);
  await waitForPageCondition(page,()=>document.getElementById('anomaly-modal')?.classList.contains('active'),10000);
  await domClick('#btn-ack-anomaly');
  let m1state=await snap();
  assert.equal(m1state.flags.M1_HANDOFF_CHOICE_RESOLVED,true);
  assert.equal(m1state.memory.loopCount,0,'correct M1 choice must not consume a loop');
  await mark('M1 rejected default identity template');

  await shot('m2-4f-nursing-station','first_campus_4f','m3_4f_nursing_station','WorkstationDesk_first_station_A',[0,1.7,-4.6],[-3.35,1.0,-2.35]);
  await shot('m2-4f-duty-room','first_campus_4f','m2_4f_duty_room','DutyRoom_ExtensionPhone',[-10.8,1.7,4.8],[-9.62,.87,3.1]);
  await shot('m2-408c-bed','first_campus_4f','m2_4f_409','Bed_408C',[9.8,1.7,-8.2],[8.1,.8,-7.32]);
  await shot('m2-409-sealed','first_campus_4f','m2_4f_409','Bed33_409_WarningTape',[5.0,1.7,-3.0],[6.88,1.2,-3.0]);

  // M2: deliberately fail first, verify identity override + soft reset + persistent cognition.
  await setM2Checkpoint();
  await task('P1_4F_REPORT');
  await load('first_campus_4f','m3_4f_nursing_station');
  await interact({id:'BED33_ASSIGNMENT'});
  assert.equal(await page.locator('#bed33-modal.active').count(),0,'409A form must stay closed before the 408C event');
  await interact({id:'408C_BED_PLAQUE'});
  await page.waitForTimeout(6000);
  assert.equal(await page.locator('#bed33-modal.active').count(),0,'408C must not open the 409A form automatically');
  await load('first_campus_4f','m2_4f_409');
  await pressEAt([6.72,1.18,-3.0],'BED33_409_SEALED');
  await closeArchive();
  await load('first_campus_4f','m3_4f_nursing_station');
  await interact({id:'BED33_BOARD'});await closeArchive();
  await interact({id:'BED33_HIS_409'});await closeArchive();
  let s=await snap();assert.equal(s.legend,'UNDERSTOOD','408C plus the sealed 409 clue must establish the bed-33 contradiction');
  await interact({id:'BED33_ASSIGNMENT'});
  await page.waitForSelector('#bed33-modal.active');
  await assertCinematicPlayed('FIRST_409_BED33_ANOMALY');

  await q(()=>new Promise((resolve,reject)=>{
    document.getElementById('btn-bed33-confirm').click();
    setTimeout(()=>{
      const cutscene=document.getElementById('loop-cutscene');
      const skip=document.getElementById('btn-loop-skip');
      if(!cutscene?.classList.contains('active')||!skip||skip.getBoundingClientRect().width===0){
        reject(new Error('Loop fast-forward control was not visible during override'));
        return;
      }
      skip.click();
      resolve();
    },500);
  }));
  await waitForPageCondition(page,()=>window.__storyQA.worldRouter.activeZoneId==='first_campus_3f',30000);
  s=await snap();
  assert.equal(s.memory.loopCount,1);assert.equal(s.memory.survivalRules.neverSignBed33,true);
  assert(s.memory.journalNotes.some(n=>n.id==='RULE_BED33'));
  await mark('M2 override loops to 17:00 with memory');

  // M2 second loop: use remembered rule and reject without re-learning every clue.
  await flag('STAFF_ACCESS_CARD',true);await flag('HOOK_409_ZERO_ROOM',true);await task('KEY_PICKUP');await task('WARD_ENTRY');await task('P1_4F_REPORT');await task('P1_NORMAL_EVENT_DONE');
  await load('first_campus_4f','m2_4f_409');
  await pressEAt([6.72,1.18,-3.0],'BED33_409_SEALED');await closeArchive();
  await load('first_campus_4f','m3_4f_nursing_station');
  await interact({id:'BED33_ASSIGNMENT'});
  await page.waitForSelector('#bed33-modal.active');
  assert.equal(await page.locator('#btn-bed33-reject').isVisible(),true);
  await domClick('#btn-bed33-reject');
  s=await snap();assert.equal(s.flags.BED33_RESOLVED,true);assert.equal(s.memory.proofs.space,true);assert.equal(s.memory.trueNameFragments.frag_employeePrefix,'MED-87');
  await mark('M2 resolved by persistent cognition');

  // 20:05: opening the duty-room door starts the call; the task and Jane Doe appear only after E on the ringing phone.
  await flag('HOOK_0217',true);await task('P1_NORMAL_EVENT_DONE');
  await load('first_campus_4f','m2_4f_duty_room');
  await q(()=>window.__storyQA.gameState.setGameTime('20:00'));
  await pressEAt([-8,1.2,6],'duty_room');
  await waitForPageCondition(page,()=>window.__storyQA.gameState.getFlag('PHONE_RING_ACTIVE')&&window.__storyQA.gameState.getFlag('PHONE_CALL_KIND')==='ER_JANE_2005');
  s=await snap();assert.equal(s.flags.P1_ER_CALL_ANSWERED,false);assert.equal(s.flags.ER_JANE_PRESENT,false);assert.equal(s.time,'20:00');
  assert.equal((await taskText()).trim(),'','the next objective waits for the 20:05 phone answer');
  await answer4fPhone('20:05 ER call phone interaction');
  await waitForPageCondition(page,()=>window.__storyQA.gameState.getFlag('P1_ER_CALL_ANSWERED')===true);
  s=await snap();assert.equal(s.flags.PHONE_RING_ACTIVE,false);assert.equal(s.flags.PHONE_ANSWERED,true);assert.equal(s.flags.ER_JANE_PRESENT,true);assert.equal(s.time,'20:05');
  assert.equal(await page.locator('#task-er-assess').count(),1,'answering the 20:05 call reveals the ER assessment objective');
  await enter('first_campus_2f');
  s=await snap();
  const preGhost=await q(()=>window.__storyQA.worldRouter.activeZoneInstance?.ghostRegistrationTerminal?.userData?.interactable===true);
  assert.equal(preGhost,false,'00:33 terminal must stay dormant during the first ER consult');
  assert.equal(await q(()=>window.__storyQA.worldRouter.activeZoneInstance.janeDoePatient.visible),true,'the 20:05 phone answer materializes a physical patient');
  await interact({action:'ER_ASSESS'});await interact({action:'ER_NOTE'});
  s=await snap();assert.equal(s.flags.B_PANEL_KEY,false);assert.equal(s.flags.B_PANEL_CLUE_KNOWN,true);assert.equal(s.memory.trueNameFragments.frag_surname,null);
  await interact({id:'ER_EXIT_NOTICE'});
  assert((await page.locator('#subtitle-text').innerText()).includes('只進不出'));

  // Then the 21:15 call returns the player to 3F; noticing the panel is not enough — the logbook must be signed.
  await enter('first_campus_4f','m2_4f_duty_room');
  await walkTo(-9.5,4.7);
  await pressEAt([-10,1.1,3.1],'4F_DUTY_COMPUTER');
  assert((await page.locator('#subtitle-text').innerText()).includes('桌上怎麼有熱咖啡？剛剛值班室鑰匙都在我身上，是誰進來了？'));
  await waitForPageCondition(page,()=>window.__storyQA.gameState.getFlag('PHONE_RING_ACTIVE')&&window.__storyQA.gameState.getFlag('PHONE_CALL_KIND')==='NIGHT_PATROL_2115');
  s=await snap();assert.equal(s.flags.NIGHT_PATROL_RETURN_3F,false);assert.equal(s.time,'21:15');
  assert.equal((await taskText()).trim(),'','the 21:15 return objective waits for the phone answer');
  await answer4fPhone('21:15 night return phone interaction');
  await waitForPageCondition(page,()=>window.__storyQA.gameState.getFlag('NIGHT_PATROL_RETURN_3F')===true);
  s=await snap();assert.equal(s.flags.PHONE_RING_ACTIVE,false);assert.equal(s.flags.PHONE_ANSWERED,true);assert.equal(s.time,'21:15');
  assert.equal(await page.locator('#task-night-return').count(),1,'answering the 21:15 call reveals the return-to-3F objective');
  await enter('first_campus_3f');
  await interact({id:'GUARD_SIGN_2117'});
  s=await snap();assert.equal(s.flags.GUARD_SIGN_EXAMINED,true);assert.equal(s.flags.BOOTSTRAP_2117_RESOLVED,false);
  await interact({id:'GUARD_BOOK_2117'});
  s=await snap();assert.equal(s.flags.BOOTSTRAP_2117_RESOLVED,true);assert.equal(s.time,'21:17');
  assert.equal(s.flags.GHOST_REGISTRATION_ARMED,false,'00:33 must not arm immediately at 21:17');

  // Entering the 4F duty room starts the 23:55 beat, then the player must answer the 00:30 call.
  await enter('first_campus_4f','m2_4f_duty_room');
  await waitForPageCondition(page,()=>window.__storyQA.gameState.getFlag('PHONE_RING_ACTIVE')&&window.__storyQA.gameState.getFlag('PHONE_CALL_KIND')==='ER_GHOST_0033',30000);
  s=await snap();
  assert.equal(s.flags.POST_2117_DUTY_ROOM_TRIGGERED,true,'entering the duty room must auto-trigger the post-21:17 sequence');
  assert.equal(s.time,'00:30');
  assert.equal(s.flags.GHOST_REGISTRATION_ARMED,false);
  assert.equal(s.flags.GHOST_REGISTRATION_AVAILABLE,false);
  assert.equal(s.flags.POST_2117_DUTY_CALL_DONE,false);
  await waitForPageCondition(page,()=>window.__storyQA.gameState.getFlag('CG_21_17_DUTY_ROOM_ACTIVATION_PLAYED')===true,10000);
  s=await snap();
  assert.equal(s.controllerEnabled,true,'movement must return after the forced phone beat');
  assert.equal(await q(()=>window.__storyQA.gameState.getDisplayTime()),'翌日 00:30');
  assert.equal((await taskText()).trim(),'','the 00:33 registration objective waits for the call answer');
  await answer4fPhone('00:30 ER registration phone interaction');
  await waitForPageCondition(page,()=>window.__storyQA.gameState.getFlag('POST_2117_DUTY_CALL_DONE')===true);
  s=await snap();assert.equal(s.flags.PHONE_RING_ACTIVE,false);assert.equal(s.flags.PHONE_ANSWERED,true);assert.equal(s.time,'00:33');
  assert.equal(s.flags.GHOST_REGISTRATION_ARMED,true);assert.equal(s.flags.GHOST_REGISTRATION_AVAILABLE,true);
  assert.equal(await page.locator('#task-post2117-er').count(),1,'answering the 00:30 call reveals the ER registration objective');
  await mark('21:17 room entry then answered 00:30 ER call');
  await enter('first_campus_2f');
  await load('first_campus_2f','m4_2f_er_triage');await shot('m3-er-nursing-station',null,null,'ER_TriageCounter',[3.5,2.2,.8],[3.5,1.45,6.4]);
  s=await snap();assert.equal(s.flags.GHOST_REGISTRATION_AVAILABLE,true);assert.equal(s.time,'00:33');
  assert.equal(await q(()=>window.__storyQA.worldRouter.activeZoneInstance.janeDoePatient.visible),false,'the 00:33 record has no present patient');
  assert.equal(await q(()=>window.__storyQA.gameState.getDisplayTime()),'翌日 00:33');
  await interact({id:'ER_GHOST_REGISTRATION'});
  await waitForPageCondition(page,()=>document.getElementById('story-choice-modal')?.classList.contains('active'),60000);
  await shot('m3-0033-registration',null,null,'ER_GhostRegistrationTerminal',[15.2,1.7,-6.2],[13,1.18,-6.35]);await secondary();
  s=await snap();
  assert.equal(s.flags.ER0033_SLIP_COLLECTED,true);
  assert.equal(s.flags.LEGEND_ER0033_RESOLVED,false);
  assert.equal(s.flags.SECOND_CAMPUS_ACCESS,false);
  assert.match(await taskText(),/3F 316/,'00:33 slip must explicitly push the player back to 316');

  // M3 only resolves after the 1998-ER-0217 slip is carried back to the second 316 terminal.
  await load('first_campus_3f');
  await interact({id:'316_LEGACY_TERMINAL'});
  s=await snap();
  assert.equal(s.flags.M3_316_DECODED,true);
  assert.equal(s.flags.LEGEND_ER0033_RESOLVED,true);
  assert.equal(s.flags.SECOND_CAMPUS_PHONE_PENDING,true);
  assert.equal(s.flags.SECOND_CAMPUS_ACCESS,false);
  assert.equal(s.memory.proofs.time,true);
  assert.equal(s.memory.trueNameFragments.frag_surname,'張');
  assert.equal(s.time,'00:33');
  await shot('m3-316-legacy-terminal-phone',null,null,'DutyTerminal_316_LegacyScreen',[3.4,1.65,5.72],[9.55,1.25,5.5]);
  assert.match(await page.locator('#subtitle-text').innerText(),/終端機停止後，桌上的院內電話立刻響起/);
  assert.doesNotMatch(await page.locator('#subtitle-text').innerText(),/\\n/,'316 terminal subtitle must use real line breaks');
  await q(()=>window.__storyQA.interact({id:'316_PHONE'}));
  assert.match(await page.locator('#subtitle-text').innerText(),/怎麼知道我在 316 辦公室/);
  await page.waitForTimeout(2000);
  assert.equal((await snap()).flags.SECOND_CAMPUS_ACCESS,false,'the unread call must not unlock the next task on a timer');
  await drainDialogue();
  await waitForPageCondition(page,()=>window.__storyQA.gameState.getFlag('SECOND_CAMPUS_ACCESS')===true);
  s=await snap();assert.equal(s.flags.SECOND_CAMPUS_ACCESS,true);
  assert.equal(s.time,'01:15');
  assert.equal(await q(()=>window.__storyQA.gameState.getDisplayTime()),'翌日 01:15');
  assert.equal(s.flags.SECOND_CAMPUS_OBJECTIVE_ACTIVE,true);
  assert.match(await taskText(),/01:15[\s\S]*第二院區 5F[\s\S]*護理站報到/,'M3 resolution must leave a concrete second-campus objective');
  await mark('M3 00:33 slip decoded at 316; second campus unlocked');

  // M4: second-campus chest-pain duplicate patient.
  await load('second_campus_5f');
  assert.match(await taskText(),/護理站報到/,'M4 must begin at the second-campus nursing station');
  await interact({id:'SECOND_5F_NURSING_REPORT'});
  s=await snap();assert.equal(s.flags.SECOND_CAMPUS_5F_REPORTED,true);
  assert.match(await taskText(),/504B[\s\S]*陳怡君/,'nursing report must reveal the patient identity and bed');
  await shot('m4-ordinary-patient',null,null,'SecondCampus_ChestPainPatient',[65.8,1.7,-18.5],[67.9,.95,-20.68]);
  await interact({id:'SECOND_CHEST_PATIENT'});
  assert.match(await taskText(),/病人處置醫囑/,'seeing the M4 patient must advance the objective without spoiling the transfer form');
  await interact({id:'SECOND_CHEST_TRANSFER'});
  await waitForPageCondition(page,()=>document.getElementById('story-choice-modal')?.classList.contains('active'),60000);
  const transferBody=await page.locator('#story-choice-body').textContent();
  assert(transferBody.includes('\n'),'the transfer form paragraphs must use real line breaks');
  assert(!transferBody.includes('\\n'),'the transfer form must not show literal newline escapes');
  assert.equal(await page.locator('#story-choice-body').evaluate(element=>getComputedStyle(element).whiteSpace),'pre-line');
  await shot('m4-transfer-form',null,null,'SecondCampus_ChestTransferForm',[70.9,1.5,-1.2],[70.72,.83,-2.18]);await secondary();
  s=await snap();assert.equal(s.flags.M4_CHEST_RESOLVED,true);assert.equal(s.flags.CHEST_RECORD_MATCH,true);assert.equal(s.memory.trueNameFragments.frag_givenName_1,null);assert.equal(s.time,'01:45');
  await interact({id:'SECOND_CHEST_NAME_CLUE'});await closeArchive();
  await shot('m4-guard-roster-clue',null,null,'SecondCampus_TrueNameRosterFragment',[68.7,1.7,-19.0],[68.26,.91,-20.04]);
  s=await snap();assert.equal(s.flags.M4_NAME_CLUE_FOUND,true);assert.equal(s.memory.trueNameFragments.frag_givenName_1,'守');
  assert.match(await taskText(),/第二院區 2F[\s\S]*監控/,'M4 resolution must push the player into the second-campus CCTV prelude');
  await mark('M4 chest-pain duplicate resolved');

  // M5 prelude: the erased 6F must be seeded by CCTV before the bridge can resolve.
  await load('second_campus_2f','second_2f_lift');
  await interact({id:'SECOND_2F_CCTV_SELF'});
  await waitForPageCondition(page,()=>document.getElementById('memory-modal')?.classList.contains('active'),30000);
  await shot('m5-security-playback',null,null,'Second2F_CCTVWall',[74,1.7,-7.7],[74,1.5,-10.25]);
  await domClick('#btn-close-memory');
  s=await snap();assert.equal(s.flags.M5_CCTV_RESOLVED,true);assert.equal(s.flags.SIX_FLOOR_HISTORY_CONFIRMED,true);
  assert.match(await taskText(),/天橋/,'after CCTV playback the route must advance to the bridge');

  // M5A: skybridge rule.
  await load('skybridge','bridge_from_first');
  await shot('m5-outbound-bridge-baseline',null,null,'Annie_BRIDGE_MANIFEST',[34,1.9,0],[46,0.95,0]);
  await interact({id:'BRIDGE_LOOP_EVENT'});
  await waitForPageCondition(page,()=>document.getElementById('story-choice-modal')?.classList.contains('active'),60000);await secondary();
  await shot('m5-return-bridge-annie',null,null,'Annie_BRIDGE_MANIFEST',[41,1.65,0],[46,1.0,0]);
  await shot('m5-bridge-close-annie',null,null,'Annie_BRIDGE_MANIFEST',[44.95,1.6,-0.4],[46,1.25,0]);
  const bridgeMotion=[];
  for(let frame=0;frame<3;frame++){
    await page.waitForTimeout(180);
    const pose=await q(()=>{const a=window.__storyQA.worldRouter.activeZoneInstance.bridgeDoppelganger;return {body:a.userData.rig.upperBody.rotation.z,head:a.userData.rig.head.rotation.z};});
    bridgeMotion.push(pose.head);
    await motionShot(`m5-bridge-idle-${frame+1}`,'Annie_BRIDGE_MANIFEST',[41,1.65,0],[46,1.0,0],pose);
  }
  assert(Math.max(...bridgeMotion)-Math.min(...bridgeMotion)>0.0001,'Bridge idle motion must change across the three browser frames');
  s=await snap();assert.equal(s.flags.M5_BRIDGE_RESOLVED,true);assert.equal(s.flags.M5_ROUTE_RESOLVED,true);assert.equal(s.flags.FLOOR6_AVAILABLE,true);assert.equal(s.memory.proofs.identity,true);assert.equal(s.memory.trueNameFragments.frag_givenName_2,null);assert.equal(s.time,'02:00');
  assert.match(await taskText(),/搭乘一般電梯返回第一院區/,'M5 resolution must reveal the return-to-ward elevator objective');
  await mark('M5 bridge rule resolved');

  // M6: nonexistent 6F — stay near lift instead of chasing.
  await flag('PHANTOM6_RETURN_ZONE','second_campus_5f');await load('phantom_6f','phantom_6f_lift');
  await shot('m6-elevator-display-6',null,null,'Phantom6F_ElevatorDisplay',[0,2.48,.6],[0,2.48,1.78]);
  await shot('m6-annie-cpr-long',null,null,'Annie_FLOOR6_CPR',[0,2.8,1.2],[.6,.9,-7.3]);
  await interact({id:'FLOOR6_STETHOSCOPE_SEARCH'});
  await shot('m6-stethoscope-relic',null,null,'Floor6_Stethoscope_Engraving',[-1.37,.42,-7.97],[-1.37,.14,-8.09]);
  await interact({id:'FLOOR6_STETHOSCOPE_INSPECT'});
  await waitForPageCondition(page,()=>document.getElementById('story-choice-modal')?.classList.contains('active'),60000);
  await primary();
  s=await snap();assert.equal(s.flags.FLOOR6_STETHOSCOPE_INSPECTED,true);assert.equal(s.memory.trueNameFragments.frag_givenName_2,'恆');assert.equal(s.flags.M5_NAME_CLUE_FOUND,true);
  const inscriptionSubtitle=await page.locator('#subtitle-text').innerText();
  assert.match(inscriptionSubtitle,/祝 守恆 醫師[\s\S]*1997[\s\S]*執業誌慶/);
  assert.doesNotMatch(inscriptionSubtitle,/\\n/,'the stethoscope subtitle must show real line breaks');
  mannequinCheck=await q(()=>{const a=window.__storyQA.worldRouter.activeZoneInstance.annie;const names=[];a.traverse(object=>names.push(object.name));return {state:a.userData.state,compression:a.userData.rig.compression,noseOnly:!!a.getObjectByName('Annie_MoldedNose')&&!names.some(name=>/^Annie_(FixedEye|UnfocusedIris|FixedPupil|Mouth|BlowTrainingMouth)/.test(name)),chestClear:!names.some(name=>/^Annie_(Stethoscope|CoatPocket|CoatButton|CompressionPlate|ScrubNeckline)/.test(name))}});
  assert.equal(mannequinCheck.state,'FLOOR6_CPR');assert(mannequinCheck.noseOnly);assert(mannequinCheck.chestClear);
  await page.waitForFunction(initial=>{
    const current=window.__storyQA.worldRouter.activeZoneInstance.annie.userData.rig.compression;
    return Math.abs(current-initial)>1e-6;
  },mannequinCheck.compression,{polling:50,timeout:10000});
  await shot('m6-annie-cpr',null,null,'Annie_FLOOR6_CPR',[3.3,1.9,-9.3],[1.0,.95,-7.3]);
  await shot('m6-annie-cpr-close',null,null,'Annie_HandStack_Top',[1.55,1.65,-8.0],[.82,1.0,-7.3]);
  const pressOne=await motionShot('m6-cpr-press-1','Annie_HandStack_Top',[1.55,1.65,-8.0],[.82,1.0,-7.3],{capture:'cpr',phase:'press'});
  const release=await motionShot('m6-cpr-release','Annie_HandStack_Top',[1.55,1.65,-8.0],[.82,1.0,-7.3],{capture:'cpr',phase:'release'});
  assert(pressOne>0.85&&release<0.15,'CPR browser frames must show a complete press and release cycle');

  await interact({id:'FLOOR6_SAFE_RETURN'});
  s=await snap();assert.equal(s.flags.M6_FLOOR6_RESOLVED,true);assert.equal(s.zone,'first_campus_1f');
  assert((await taskText()).includes('第一院區 1F 警衛台'),'M6 resolution must direct the player to the 1F guard post');
  await mark('M6 nonexistent 6F resolved');

  // M7: 02:17 decision + B2 convergence.
  assert.equal((await snap()).memory.proofs.space,true);
  assert.equal((await snap()).memory.proofs.identity,true);
  assert.equal((await snap()).memory.proofs.time,true);
  await load('first_campus_1f','m5_1f_lobby_entrance');
  await shot('m7-1f-guard-post',null,null,'FirstCampus1F_OldGuardPost',[-7.8,1.7,3.2],[-10.7,1.0,3.2]);
  await shot('m7-b-panel-concealed-door',null,null,'FirstFloor_BPanel_ConcealedDoor',[-11.2,1.7,4.55],[-13.78,1.18,4.55]);
  await load('first_campus_1f','m5_1f_lobby_entrance');
  await q(position=>window.__storyQA.controller.teleport(...position),[-8.4,1.7,3.2]);
  await q(point=>window.__storyQA.lookAt(point),[-10.7,1.03,3.2]);
  await waitForPageCondition(page,()=>window.__storyQA.controller.currentInteractable?.id==='OLD_GUARD_POST',5000);
  assert.match(await page.locator('#interaction-prompt').innerText(),/\[E\].*檢查警衛台/,'the real crosshair must offer the guard-post E interaction');
  await functionalShot('m7-guard-post-approach.png');
  await page.keyboard.press('e');
  await waitForPageCondition(page,()=>window.__storyQA.gameState.getFlag('HIDDEN_SERVICE_DOOR_DISCOVERED')===true,5000);
  assert.equal((await snap()).flags.B_PANEL_KEY,true,'B-Panel key must come from the 1F guard-post key cabinet, not the ER patient');
  assert(await q(()=>{const zone=window.__storyQA.worldRouter.activeZoneInstance;return zone.hiddenServiceFrame.visible&&zone.hiddenServiceKeyhole.visible}),'the discovered door frame and keyhole must be visible in the live scene');
  assert.match(await taskText(),/檢查警衛台後方浮現的舊門框/,'inspecting the post must reveal the updated service-door objective');
  await q(position=>window.__storyQA.controller.teleport(...position),[-12.15,1.7,4.55]);
  await q(point=>window.__storyQA.lookAt(point),[-13.58,1.18,4.55]);
  await waitForPageCondition(page,()=>window.__storyQA.controller.currentInteractable?.id==='1F_HIDDEN_SERVICE_DOOR',5000);
  assert.match(await page.locator('#interaction-prompt').innerText(),/\[E\].*舊門框/,'the revealed physical hitbox must show an E prompt');
  await functionalShot('m7-b-panel-e-prompt.png');
  report.functionalFlows.push({name:'M7 GUARD POST TO B-PANEL',steps:['QA bridge positioned at the guard desk','crosshair showed [E] inspect guard post','pressed E and revealed door seams/purple indicator','QA bridge positioned at the physical service-door hitbox','crosshair showed [E] inspect revealed door']});
  await page.keyboard.press('e');
  await waitForPageCondition(page,()=>document.getElementById('story-choice-modal')?.classList.contains('active'),60000);await secondary();
  await waitForPageCondition(page,()=>window.__storyQA.worldRouter.activeZoneId==='b2_archive',30000);
  await shot('m7-b2-mirror-316',null,null,'B2_ArchiveMirror_Frame',[0,1.7,-11.0],[0,1.7,-14.65]);

  await flag('B2_ADMIN_SOURCE',true);await flag('B2_HISTORY_SOURCE',true);await flag('B2_LEGACY_SOURCE',true);await flag('B2_SECURITY_SOURCE',true);
  await interact({id:'MEMORY_B2_VICTIM_MAP'});
  await waitForPageCondition(page,()=>document.getElementById('memory-modal')?.classList.contains('active'),30000);
  await domClick('#btn-close-memory');
  await interact({id:'B2_ARCHIVE_TERMINAL'});
  await waitForPageCondition(page,()=>document.getElementById('b2-fire-recap')?.classList.contains('active'),30000);
  assert.equal(await page.locator('#identity-matrix-modal.active').count(),0,'first B2 contact must play the recap without a Linear identity matrix');
  assert.equal(await page.locator('#identity-loop-panel.archive-open').count(),0,'the archive must wait for the second terminal interaction');
  for(let i=0;i<6;i++){
    await page.waitForTimeout(360);
    await page.keyboard.press('E');
  }
  await waitForPageCondition(page,()=>window.__storyQA.gameState.getFlag('B2_FIRE_RECAP_SEEN')===true,30000);
  s=await snap();
  assert.equal(s.flags.M7_B2_RESOLVED,false,'V2 must not resolve the Linear canonical identity');
  assert.equal(s.flags.B2_FIRE_RECAP_SEEN,true);
  assert.equal(s.flags.RECORD_OVERWRITE_ACTIVE,true);
  assert.equal(s.flags.M8_IDENTITY_BATTLE_ACTIVE,true);
  assert.equal(s.memory.trueNameResolved,false);
  await interact({id:'B2_ARCHIVE_TERMINAL'});
  await page.waitForSelector('#identity-loop-panel.archive-open');
  assert.match(await page.locator('#identity-loop-panel [data-identity-detail]').innerText(),/CURRENT SELF = CORRUPTED/);
  assert.deepEqual(await page.locator('#identity-loop-panel [data-identity-detail] li').allTextContents(),Object.values(IDENTITY_PROFILES).map(profile=>`${profile.name}｜${profile.employeeId}｜${profile.role}`),'B2 must expose all four objective candidate records');
  assert.equal((await snap()).memory.trueNameResolved,false,'reading the archive must not determine the current self');
  assert.equal(await page.locator('#identity-matrix-modal.active').count(),0);
  assert.match(await taskText(),/UNKNOWN SESSION[\s\S]*封存防火門|封存防火門[\s\S]*316/,'B2 recap must converge into the 316 route');
  await interact({id:'B2_ONE_WAY_EXIT'});
  await waitForPageCondition(page,()=>window.__storyQA.worldRouter.activeZoneId==='first_campus_3f',30000);
  s=await snap();assert.equal(s.flags.LAST_CALL_SEEN,true);assert.equal(s.time,'03:30');
  assert.match(await taskText(),/返回 316/,'last call must push the player back to 3F 316 for the final handoff');
  await mark('M7 B2 four-candidate archive leaves current self corrupted; M8 identity battle active');

  // M9: return to 316 and complete the real handoff.
  await load('first_campus_3f');
  await flag('OPENED_316',true);
  await interact({id:'E_HANDOFF'});
  await waitForPageCondition(page,()=>!!window.__storyQA.uiManager.dialogueSequence,60000);
  await drainDialogue();
  await page.waitForSelector('#identity-loop-panel.m9-open',{timeout:60000});
  assert.equal(await page.locator('#final-handoff-modal.active').count(),0,'V2 must not open the Linear employee-ID form');
  const choices=page.locator('#identity-loop-panel [data-identity-choices] .identity-choice');
  assert.deepEqual(await choices.allTextContents(),Object.values(IDENTITY_PROFILES).map(profile=>`${profile.name}｜${profile.employeeId}`),'M9 must offer exactly the four identity profiles');
  const currentIdentity=await q(()=>window.__storyQA.identityManager.currentIdentity);
  const profile=IDENTITY_PROFILES[currentIdentity];
  assert(profile,'the run must have a valid identity seed');
  const beforeGoodEnds=await q(()=>[...window.__storyQA.identityManager.metaSave.completedGoodEnds]);
  await shot('m9-dual-identity-form',null,null,'DutyPhone_316_Handset',[7.5,1.7,5.7],[5.45,.95,5.72]);
  await choices.filter({hasText:`${profile.name}｜${profile.employeeId}`}).click();
  await waitForPageCondition(page,()=>document.getElementById('final-success-modal')?.classList.contains('active'),30000);
  assert.equal(await page.locator('#identity-loop-panel.ending-open [data-identity-detail] h3').innerText(),getGoodEnding(currentIdentity).title);
  const completed=await q(()=>window.__storyQA.identityManager.snapshot());
  assert.equal(completed.runSave.m9CommittedChoice,currentIdentity);
  assert.equal(completed.runSave.runEnded,true);
  assert.deepEqual(completed.metaSave.completedGoodEnds,[...new Set([...beforeGoodEnds,currentIdentity])]);
  assert.deepEqual(await q(key=>JSON.parse(localStorage.getItem(key)),IDENTITY_STORAGE_KEY),completed,'GOOD_END must be persisted to storage');
  assert.deepEqual(await q(identity=>window.__storyQA.identityLoopPanel.commit(identity),currentIdentity),{ok:false,reason:'ALREADY_COMMITTED'});
  assert.deepEqual(await q(()=>window.__storyQA.identityManager.snapshot()),completed,'duplicate commit must not mutate the completed run');
  assert.deepEqual(await q(key=>JSON.parse(localStorage.getItem(key)),IDENTITY_STORAGE_KEY),completed,'duplicate commit must not mutate persisted progress');
  s=await snap();assert.equal(s.flags.GAME_COMPLETE,true);assert.equal(s.memory.gameComplete,true);assert.equal(s.memory.finalDisposition,'perfect');
  assert.equal(s.flags.M8_IDENTITY_BATTLE_ACTIVE,false);
  await shot('m9-successful-dawn-ending',null,null,'DutyPhone_316_Handset',[7.5,1.7,5.7],[5.45,.95,5.72]);
  assert.match(await taskText(),/紀錄覆寫完成[\s\S]*原始夜班紀錄已恢復/,'completed game must close the task chain as restored records');
  await mark('M9 GOOD_END persisted; game complete; duplicate commit rejected',{currentIdentity,completedGoodEnds:completed.metaSave.completedGoodEnds});

  // A separate browser context reaches M9 through the real workstation with a wrong identity.
  const goodPage=page;
  page=await browser.newPage({viewport:{width:1440,height:900}});
  page.on('pageerror',e=>report.errors.push('wrong-identity pageerror: '+e.message));
  page.on('console',m=>{if(m.type()==='error')report.errors.push('wrong-identity console: '+m.text());});
  page.on('response',r=>{if(r.status()>=400)report.errors.push(r.status()+' '+r.url());});
  await page.goto(url,{waitUntil:'load',timeout:180000});
  await waitForPageCondition(page,()=>window.__storyQA?.worldRouter?.activeZoneInstance,180000);
  await load('first_campus_3f');
  await flag('OPENED_316',true);await flag('B2_FIRE_RECAP_SEEN',true);await flag('M8_IDENTITY_BATTLE_ACTIVE',true);
  await interact({id:'E_HANDOFF'});
  await waitForPageCondition(page,()=>!!window.__storyQA.uiManager.dialogueSequence,60000);
  await drainDialogue();
  await page.waitForSelector('#identity-loop-panel.m9-open',{timeout:60000});
  const wrongBefore=await q(()=>window.__storyQA.identityManager.snapshot());
  assert.deepEqual(wrongBefore.metaSave.completedGoodEnds,[],'the wrong-identity page must have isolated storage');
  const wrongIdentity=Object.keys(IDENTITY_PROFILES).find(identity=>identity!==wrongBefore.runSave.currentIdentity);
  const wrongProfile=IDENTITY_PROFILES[wrongIdentity];
  const wrongChoices=page.locator('#identity-loop-panel [data-identity-choices] .identity-choice');
  assert.equal(await wrongChoices.count(),4);
  await wrongChoices.filter({hasText:`${wrongProfile.name}｜${wrongProfile.employeeId}`}).click();
  await page.waitForSelector('#final-patientization-history.active',{timeout:60000});
  assert.equal(await page.locator('#identity-loop-panel [data-identity-detail] h3').innerText(),'WRONG MEMORY');
  const wrongAfter=await q(()=>window.__storyQA.identityManager.snapshot());
  assert.equal(wrongAfter.runSave.m9CommittedChoice,wrongIdentity);
  assert.equal(wrongAfter.runSave.runEnded,true);
  assert.deepEqual(wrongAfter.metaSave.completedGoodEnds,[],'a wrong identity must not award a GOOD_END');
  assert.deepEqual(await q(key=>JSON.parse(localStorage.getItem(key)),IDENTITY_STORAGE_KEY),wrongAfter);
  assert.deepEqual(await q(identity=>window.__storyQA.identityLoopPanel.commit(identity),wrongBefore.runSave.currentIdentity),{ok:false,reason:'ALREADY_COMMITTED'});
  assert.deepEqual(await q(()=>window.__storyQA.identityManager.snapshot()),wrongAfter);
  s=await snap();assert.equal(s.flags.FINAL_PATIENTIZATION_ACTIVE,true);assert.equal(s.flags.GAME_COMPLETE,false);assert.equal(s.memory.gameComplete,false);
  await mkdir(out+'/wrong-identity',{recursive:true});
  const wrongImage=await page.screenshot({path:out+'/wrong-identity/patientization.png',fullPage:false,timeout:90000});
  assert(wrongImage.length>1024,'Wrong-identity patientization screenshot must not be empty');
  report.wrongIdentity={entry:'E_HANDOFF workstation',currentIdentity:wrongBefore.runSave.currentIdentity,selectedIdentity:wrongIdentity,state:wrongAfter,patientizationActive:s.flags.FINAL_PATIENTIZATION_ACTIVE,gameComplete:s.flags.GAME_COMPLETE,file:'wrong-identity/patientization.png',bytes:wrongImage.length,sha256:createHash('sha256').update(wrongImage).digest('hex')};
  await mark('M9 wrong identity through workstation triggers patientization without GOOD_END');
  await page.close();page=goodPage;

  assert.equal(report.errors.length,0,JSON.stringify(report.errors,null,2));
  assert.deepEqual(report.screenshots.map(shot=>shot.file),requiredShots,'Story QA must produce the exact ordered 27-image manifest');
  assert.equal(report.screenshotWarnings.length,0,'Screenshot warnings are not accepted');
  assert.equal(report.motionScreenshots.length,5,'Three bridge idle and two CPR animation frames are required');
  assert.deepEqual(report.functionalScreenshots.map(shot=>shot.file),['functional/m1-handoff-identity-choice.png','functional/m7-guard-post-approach.png','functional/m7-b-panel-e-prompt.png'],'M1 identity and M7 physical interaction screenshots are required');
  assert.equal(report.functionalFlows.length,4,'Three 4F phone raycast checks and the M7 physical interaction flow are required');
  const pngFiles=(await readdir(out)).filter(file=>file.endsWith('.png')).sort();
  assert.deepEqual(pngFiles.filter(file=>file!=='failure.png'),[...requiredShots].sort(),'Output must contain the 27 required screenshots');
  report.verdict='PASS';
}catch(e){
  report.verdict='FAIL';report.failure=e.stack;report.last=await snap().catch(()=>null);
  if(page)await page.screenshot({path:out+'/failure.png',fullPage:false,timeout:2000}).catch(()=>{});
  process.exitCode=1;console.error(e.stack);
}finally{
  report.ended=new Date().toISOString();
  await writeFile(out+'/result.json',JSON.stringify(report,null,2));
  await browser.close();
  if(server)await new Promise(r=>server.httpServer.close(r));
}
