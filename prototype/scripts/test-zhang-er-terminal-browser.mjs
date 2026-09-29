import {chromium} from 'playwright';
import {preview} from 'vite';
import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
const out=process.argv[2]||'qa-results/zhang-er-terminal';await mkdir(out,{recursive:true});
const supplied=process.argv[3],server=supplied?null:await preview({root:fileURLToPath(new URL('..',import.meta.url)),preview:{host:'127.0.0.1',port:4198,strictPort:true}});
const base=supplied||'http://127.0.0.1:4198/';
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
async function seed(){await page.evaluate(async()=>{
 const q=window.__storyQA,d=q.identityRouteDirector,m=q.identityManager,u=q.uiManager;
 d.removeInteractionTarget();u.closeAllTransientOverlays();u.dialogueSequence=null;u.closeStoryChoice(false);
 m.runSave.currentRouteStep=m.route.indexOf('M3');m.runSave.completedStoryModules=m.route.slice(0,m.runSave.currentRouteStep);m.runSave.currentMilestone='M3';m.save();
 d.busy=false;await d.loadCurrentStep({forceLoad:true});q.controller.enabled=true;
});}
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
try{
 await start('ZHANG');await seed();
 await check('Safe bedside choice automatically hands over the slip and speaks the requested thought',async()=>{
  const bedside=await e('2F_JANE_DOE_ASSESSMENT');await page.locator('#story-choice-modal.active').waitFor();
  assert.match(await page.locator('#btn-story-primary').innerText(),/不新建病歷/);await page.locator('#btn-story-primary').click();
  await page.waitForTimeout(300);
  const pending=await page.evaluate(()=>window.__storyQA.uiManager.dialogueSequence?.lines||[]);
  assert.ok(pending.some(l=>l.speaker==='內心'&&l.text.includes('那我帶回 316辦公室用終端機查查看吧')),'safe choice must deliver the monologue without another ER terminal interaction');
  const lines=[];
  for(let i=0;i<40&&await page.evaluate(()=>!!window.__storyQA.uiManager.dialogueSequence);i++){
   const text=await page.locator('#subtitle-text').innerText();lines.push(text);
   if(text.includes('那我帶回'))await shot('zhang-bedside-return-316-thought');
   await page.keyboard.press('KeyE');
  }
  await page.waitForFunction(()=>window.__storyQA.identityRouteDirector.beatIndex===2);
  const s=await state();assert.equal(s.slip,true);assert.equal(s.decoded,false);assert.equal(s.awaiting,'first_campus_3f');assert.match(s.objective,/316.*終端/);
  return {bedside,lines,...s};
 });
 await check('Real lift to 3F binds the existing green-screen terminal, not the HIS or an extra hitbox',async()=>{
  await travel('first_campus_2f_elevator','first_campus_3f');
  await page.waitForFunction(()=>window.__storyQA.identityRouteDirector.boundTarget?.object?.userData?.id==='316_LEGACY_TERMINAL');
  const counts=await page.evaluate(()=>{const q=window.__storyQA;return {terminals:q.worldRouter.activeZoneInstance.interactables.filter(o=>o.userData?.id==='316_LEGACY_TERMINAL').length,synthetic:!!q.identityRouteDirector.anchor};});
  assert.equal(counts.terminals,1);assert.equal(counts.synthetic,false);
  const target=await aim('316_LEGACY_TERMINAL');assert.match(await page.locator('#interaction-prompt').innerText(),/316.*1998-ER-0217/);
  await shot('zhang-316-green-terminal-E-target');const s=await state();assert.equal(s.decoded,false);assert.equal(s.beat,2);return {counts,target,...s};
 });
 await check('Pressing E actually queries 1998-ER-0217 and advances exactly once',async()=>{
  await page.keyboard.press('KeyE');const resultText=await page.locator('#subtitle-text').innerText();
  assert.match(resultText,/1998-ER-0217/);assert.equal((await state()).decoded,true);
  await page.evaluate(()=>window.__storyQA.identityRouteDirector.update());
  await page.waitForFunction(()=>window.__storyQA.identityRouteDirector.step==='ZHANG_2F_PRESENCE_CHECK');
  await shot('zhang-316-query-complete-next-ER');const s=await state();assert.equal(s.awaiting,'first_campus_2f');
  const evidence=await page.evaluate(()=>Object.keys(window.__storyQA.identityManager.runSave.evidence).filter(k=>k==='route:M3:2'));
  assert.equal(evidence.length,1);await aim('316_LEGACY_TERMINAL');await page.keyboard.press('KeyE');await page.keyboard.press('KeyE');
  assert.equal((await state()).step,'ZHANG_2F_PRESENCE_CHECK');assert.equal((await state()).beat,0);return {resultText,...s,evidence};
 });
 await check('Revisit and refresh preserve the next chapter without another query or new identity',async()=>{
  const seed=await page.evaluate(()=>window.__storyQA.identityManager.runSave.runSeed);
  await travel('first_campus_3f_elevator','first_campus_2f');await travel('first_campus_2f_elevator','first_campus_3f');
  const hit=await aim('316_LEGACY_TERMINAL');await page.keyboard.press('KeyE');assert.equal((await state()).step,'ZHANG_2F_PRESENCE_CHECK');
  await page.evaluate(()=>history.replaceState(null,'',location.pathname+'?qa=story'));
  await page.reload({waitUntil:'load',timeout:120000});await page.waitForFunction(()=>window.__storyQA?.identityRouteDirector&&!window.__storyQA.identityRouteDirector.busy,{},{timeout:120000});
  assert.equal(await page.evaluate(()=>window.__storyQA.identityManager.currentIdentity),'ZHANG');assert.equal(await page.evaluate(()=>window.__storyQA.identityManager.runSave.runSeed),seed);
  assert.equal((await state()).step,'ZHANG_2F_PRESENCE_CHECK');return {revisitHit:hit,seed,afterReload:await state()};
 });
 await start('ZHANG');await seed();
 await check('Wrong new-record choice still triggers Patientization, not a 316 handoff',async()=>{
  await e('2F_JANE_DOE_ASSESSMENT');await page.locator('#btn-story-secondary').click();await dialogue();await page.locator('#loop-cutscene.active').waitFor({timeout:10000});
  const s=await state();assert.equal(s.slip,false);assert.equal(s.decoded,false);assert.equal(s.beat,0);return s;
 });
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.resources,[]);report.verdict='PASS';
}catch(error){report.verdict='FAIL';report.failure=error.stack;process.exitCode=1;console.error(error);if(page){report.state=await state().catch(()=>null);await shot('failure').catch(()=>{});}}
finally{await save();await browser.close();if(server)await new Promise(r=>server.httpServer.close(r));console.log('ZHANG_TERMINAL_RESULT '+JSON.stringify(report));}
