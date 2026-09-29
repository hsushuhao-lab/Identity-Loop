import {chromium} from 'playwright';
import {preview} from 'vite';
import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const out=process.argv[2]||'qa-results/er-final/browser';await mkdir(out,{recursive:true});
const supplied=process.argv[3],server=supplied?null:await preview({root:fileURLToPath(new URL('..',import.meta.url)),preview:{host:'127.0.0.1',port:4199,strictPort:true}});
const base=supplied||'http://127.0.0.1:4199/';
const assets=await readdir('dist/assets'),js=await readFile('dist/assets/'+assets.find(p=>/^index-.*\.js$/.test(p)),'utf8');
const loop=js.match(/function (\w+)\(\)\{requestAnimationFrame\(\1\)/)?.[1];assert(loop,'main renderer name');
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{}),args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const report={method:'Production bundle with seeded checkpoints and supported standing fixtures; real E-key and UI handlers. Not a complete first-person playthrough. Main render sampled on demand.',base,checks:[],errors:[],resources:[],screenshots:[]};
let page;const save=()=>writeFile(out+'/result.json',JSON.stringify(report,null,2));
async function start(identity){
 if(page)await page.close();page=await browser.newPage({viewport:{width:1280,height:860}});
 page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.resources.push(`${r.status()} ${r.url()}`);});
 await page.addInitScript(name=>{const raf=requestAnimationFrame.bind(window);window.requestAnimationFrame=fn=>{if(fn.name===name){window.__closureFrame=fn;return 0;}return raf(fn);};},loop);
 await page.goto(base+'?qa=story&identity='+identity,{waitUntil:'load',timeout:120000});
 await page.waitForFunction(()=>window.__storyQA?.identityRouteDirector&&!window.__storyQA.identityRouteDirector.busy,{},{timeout:120000});
}
async function seed(step,index=0){await page.evaluate(async({step,index})=>{
 const q=window.__storyQA,d=q.identityRouteDirector,m=q.identityManager,u=q.uiManager;
 d.removeInteractionTarget();u.closeAllTransientOverlays();u.dialogueSequence=null;u.closeStoryChoice(false);
 m.runSave.currentRouteStep=m.route.indexOf(step);m.runSave.completedStoryModules=m.route.slice(0,m.runSave.currentRouteStep);m.runSave.currentMilestone=step;m.save();
 d.busy=false;await d.loadCurrentStep({forceLoad:true});d.beatIndex=index;await d.placeBeat();q.controller.enabled=true;
 history.replaceState(null,'',location.pathname+'?qa=story');
 },{step,index});}
async function aim(id=null){return page.evaluate(id=>{
 const q=window.__storyQA,z=q.worldRouter.activeZoneInstance,c=q.controller,o=id?z.interactables.find(o=>o.userData?.id===id):q.identityRouteDirector.boundTarget?.object;
 if(!o)throw Error('Missing physical target '+id);z.zoneGroup.updateMatrixWorld(true);const center=o.getWorldPosition(c.position.clone()),ray=new c.raycaster.constructor();
 if(o.isGroup)new c.colliders[0].constructor().setFromObject(o).getCenter(center);
 const visible=o=>{for(let p=o;p;p=p.parent)if(p.visible===false)return false;return true;};
 for(const dy of [0,.025,-.025,.12])for(const r of [.75,1.1,1.5,1.9,2.3,2.9])for(let i=0;i<48;i++){
  const a=i*Math.PI/24,x=center.x+r*Math.cos(a),zz=center.z+r*Math.sin(a);c.teleport(x,1.7,zz);
  if(c.checkCollision(x,zz)||c.supportedHeight(x,zz)===null)continue;
  const eye=c.camera.position.clone(),target=center.clone();target.y+=dy;const delta=target.clone().sub(eye),distance=delta.length();if(distance>=4.4)continue;
  ray.set(eye,delta.normalize());ray.far=distance+.01;
  const h=ray.intersectObject(z.zoneGroup,true).find(h=>visible(h.object)&&(Array.isArray(h.object.material)?h.object.material:[h.object.material]).some(m=>m&&m.visible!==false&&(!m.transparent||m.opacity>=.85)));
  let own=false;for(let p=h?.object;p;p=p.parent)if(p===o||(o.parent!==z.zoneGroup&&p===o.parent))own=true;
  if(h&&!own&&h.distance<distance-.025)continue;
  if(q.lookAt(target.toArray()).current===o.userData.id){c.enabled=true;return {id:o.userData.id,eye:eye.toArray(),target:target.toArray()};}
 }
 throw Error('No clear supported approach: '+o.userData.id);
},id);}
async function dialogue(){const lines=[];for(let i=0;i<40;i++){if(!await page.evaluate(()=>!!window.__storyQA.uiManager.dialogueSequence))return lines;lines.push(await page.locator('#subtitle-text').innerText());await page.keyboard.press('KeyE');}throw Error('Dialogue did not complete');}
async function shot(name){await page.evaluate(()=>window.__closureFrame?.());await page.waitForTimeout(150);await page.screenshot({path:`${out}/${name}.png`,timeout:20000});report.screenshots.push(name+'.png');}
async function e(id){const hit=await aim(id);await page.keyboard.press('KeyE');await dialogue();return hit;}
async function check(name,fn){const details=await fn();report.checks.push({name,status:'PASS',details});await save();console.log('CLINICAL_CLOSURE_PASS',name);}

async function state(){return page.evaluate(()=>{const q=window.__storyQA,d=q.identityRouteDirector;return {step:d.step,beat:d.beatIndex,zone:q.worldRouter.activeZoneId,target:d.boundTarget?.object?.userData?.id,awaiting:d.awaitingZone,slip:q.gameState.getFlag('ER0033_SLIP_COLLECTED'),decoded:q.gameState.getFlag('M3_316_DECODED'),objective:document.querySelector('#task-panel').innerText};});}
async function travel(from,to){await e(from);await page.locator(`[data-floor="${to}"]`).click();await page.waitForFunction(to=>window.__storyQA.worldRouter.activeZoneId===to,to,{timeout:120000});await page.waitForFunction(()=>document.getElementById('elevator-cutscene').dataset.travelling!=='true');await page.evaluate(()=>window.__storyQA.identityRouteDirector.update());}

async function desk(){return page.evaluate(()=>{
 const q=window.__storyQA,z=q.worldRouter.activeZoneInstance;
 const items=z.interactables.filter(o=>{const p=o.isObject3D?o.getWorldPosition(q.controller.position.clone()):o.position;return p&&Math.hypot(p.x-13,p.z+8.4)<1.4;});
 return {count:items.length,ids:items.map(o=>(o.userData||o).id),active:items.filter(o=>(o.userData||o).interactable).length,legacyNote:q.gameState.isTaskComplete('P1_ER_NOTE_DONE'),evidence:Object.keys(q.identityManager.runSave.evidence).length};
});}
async function noReplay(){
 await page.evaluate(()=>{const q=window.__storyQA;q.worldRouter.activeZoneInstance.syncStoryState();q.controller.updateRaycast();});
 const before=await desk();assert.equal(before.count,1);assert.equal(before.active,0);
 const s=await state();await page.keyboard.press('KeyE');await page.keyboard.press('KeyE');
 assert.deepEqual(await desk(),before);assert.equal((await state()).step,s.step);return before;
}
const staff={ZHANG:'MED-870409',LI:'MED-820316',ZHOU:'MED-880217',CHEN:'MED-890605'};
try{
 await start('ZHANG');await seed('ZHANG_2F_PRESENCE_CHECK');
 await check('Zhang ER: single physical desk, explicit return motive, and no old event replay',async()=>{
  await e('ER_NURSE_COMPUTERS');await page.waitForFunction(()=>window.__storyQA.identityRouteDirector.beatIndex===1);
  const d=await desk();assert.equal(d.count,1);assert.equal(d.active,1);
  await e('ER_DOCTOR_CHARTING');await page.locator('#story-choice-modal.active').waitFor();
  await page.locator('#btn-story-secondary').click();await dialogue();assert.equal((await state()).beat,1,'retry must not advance');
  await e('ER_DOCTOR_CHARTING');await page.locator('#btn-story-primary').click();
  assert.match(await page.locator('#subtitle-text').innerText(),/408C.*親耳|親耳.*408C/);
  await shot('zhang-why-return-408c');const lines=await dialogue();
  await page.waitForFunction(()=>window.__storyQA.identityRouteDirector.step==='ZHANG_4F_WITNESS_RETURN');
  const retired=await noReplay();await shot('er-doctor-completed-no-replay');return {lines,retired,...await state()};
 });
 await check('Real lift to 4F reaches the witness, not a repeat of the first assessment',async()=>{
  await travel('first_campus_2f_elevator','first_campus_4f');const hit=await aim('408C_BED_PLAQUE');await page.keyboard.press('KeyE');
  const lines=await dialogue();assert.match(lines.join(' '),/不是要重做評估/);assert.match(lines.join(' '),/什麼時候/);await shot('zhang-408c-followup');return {hit,lines};
 });
 for(const [identity,step,index] of [['LI','LI_ER_2005',1],['LI','LI_ER_0033',0],['ZHOU','ZHOU_2F_WARNING_READBACK',1],['CHEN','CHEN_2F_HANDOFF_RECEIPT',1]]){
  await start(identity);await seed(step,index);
  await check(`${identity} ${step}: current action only; legacy note cannot return`,async()=>{
   const current=await state(),hit=await e(current.target);assert.equal((await desk()).count,1);
   await page.locator('#story-choice-modal.active').waitFor();await page.locator('#btn-story-primary').click();await dialogue();
   await page.waitForFunction(step=>window.__storyQA.identityRouteDirector.step!==step,step);
   return {hit,retired:await noReplay(),next:await state()};
  });
 }
 await start('CHEN');await seed('CHEN_2F_HANDOFF_RECEIPT',0);
 await check('Receipt reading and charting share the very same screen instead of two hitboxes',async()=>{
  const initial=await desk();const first=await e('ER_GHOST_REGISTRATION');await page.waitForFunction(()=>window.__storyQA.identityRouteDirector.beatIndex===1);
  const second=await desk();assert.equal(initial.count,1);assert.equal(second.count,1);assert.equal(second.active,1);assert.deepEqual(second.ids,['ER_DOCTOR_CHARTING']);
  await e('ER_DOCTOR_CHARTING');await page.locator('#btn-story-primary').click();await dialogue();await page.waitForFunction(()=>window.__storyQA.identityRouteDirector.step!=='CHEN_2F_HANDOFF_RECEIPT');
  return {first,second,retired:await noReplay()};
 });
 for(const [identity,name,id,width]of [['ZHANG','ZHANG','ZHANG',1280],['ZHANG','ZHANG','LI',1280],['ZHANG','LI','ZHANG',1280],['ZHANG','LI','LI',1280],['LI','LI','LI',390]]){
  await start(identity);await page.setViewportSize({width,height:860});await seed('M9');
  await check(`M9 ${identity}: name=${name}, employee=${id}, width=${width}`,async()=>{
   const hit=await e();await page.locator('#identity-loop-panel.m9-open').waitFor();
   const names=page.locator('input[name="m9-name"]'),employees=page.locator('input[name="m9-employee-id"]'),submit=page.locator('.identity-entry-submit');
   assert.equal(await names.count(),4);assert.equal(await employees.count(),4);assert.equal(await page.locator('.identity-entry-form input[type="text"]').count(),0);
   assert.equal(await page.locator('.identity-entry-form input:checked').count(),0);assert(await submit.isDisabled());
   await page.locator(`input[name="m9-name"][value="${name}"]`).check();assert(await submit.isDisabled());
   assert.equal(await page.locator('input[name="m9-employee-id"]:checked').count(),0,'name selection must not auto-pair employee ID');
   assert.equal(await page.evaluate(()=>window.__storyQA.identityManager.runSave.runEnded),false);
   await page.locator(`input[name="m9-employee-id"][value="${staff[id]}"]`).check();assert.equal(await submit.isDisabled(),false);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   if(width===390||name===id&&name===identity)await shot(`m9-independent-options-${identity}-${width}`);
   await submit.click();await page.waitForFunction(()=>window.__storyQA.identityManager.runSave.runEnded);
   const correct=identity===name&&identity===id;
   const result=await page.evaluate(()=>{const q=window.__storyQA;return {run:q.identityManager.snapshot(),correct:q.identityManager.m9SelectionCorrect,title:document.querySelector('#identity-loop-panel h3')?.textContent,complete:q.gameState.getFlag('GAME_COMPLETE')};});
   assert.equal(result.correct,correct);assert.equal(result.run.runSave.m9CommittedChoice,name);assert.equal(result.run.runSave.m9CommittedEmployeeId,staff[id]);
   assert.equal(result.run.metaSave.completedGoodEnds.includes(identity),correct);if(!correct)assert.equal(result.title,'WRONG MEMORY');
   assert.equal(await page.evaluate(id=>window.__storyQA.identityLoopPanel.commit(id).reason,identity),'ALREADY_COMMITTED');
   // Reload without force-identity query; the real saved pair must preserve the verdict.
   await page.reload({waitUntil:'load',timeout:120000});await page.waitForFunction(()=>!!window.__storyQA);
   const restored=await page.evaluate(()=>({run:window.__storyQA.identityManager.runSave,correct:window.__storyQA.identityManager.m9SelectionCorrect,title:document.querySelector('#identity-loop-panel h3')?.textContent}));
   assert.equal(restored.run.runEnded,true);assert.equal(restored.run.m9CommittedEmployeeId,staff[id]);assert.equal(restored.correct,correct);
   if(!correct)assert.equal(restored.title,'WRONG MEMORY');
   return {hit,correct,name,id,restored};
  });
 }
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.resources,[]);report.status='PASS';
}catch(error){report.status='FAIL';report.failure=error.stack;console.error(error);if(page)await shot('failure').catch(()=>{});process.exitCode=1;}
finally{await save();await browser.close();await server?.httpServer.close();}
