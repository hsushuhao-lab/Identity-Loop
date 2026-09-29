import {chromium} from 'playwright';
import {preview} from 'vite';
import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const out=process.argv[2]||'qa-results/zhang16/browser';await mkdir(out,{recursive:true});
const files=await readdir('dist/assets'),js=await readFile('dist/assets/'+files.find(p=>/^index-.*\.js$/.test(p)),'utf8');
const loop=js.match(/function (\w+)\(\)\{requestAnimationFrame\(\1\)/)?.[1];assert(loop);
const server=await preview({root:fileURLToPath(new URL('..',import.meta.url)),preview:{host:'127.0.0.1',port:4189,strictPort:true}});
const browser=await chromium.launch({headless:true,...(existsSync('/usr/bin/chromium')?{executablePath:'/usr/bin/chromium'}:{}),args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1280,height:860}});
const report={method:'Production bundle, seeded checkpoints, real E-key with supported standing positions. Main rendering sampled on demand; not a complete route walkthrough.',steps:[],errors:[],resources:[]};
page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.resources.push(`${r.status()} ${r.url()}`);});
const save=()=>writeFile(`${out}/result.json`,JSON.stringify(report,null,2));
await page.addInitScript(name=>{const raf=requestAnimationFrame.bind(window);window.requestAnimationFrame=fn=>{if(fn.name===name){window.__zhangFrame=fn;return 0;}return raf(fn);};window.__zhangText=new Set();const draw=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(t,...a){window.__zhangText.add(String(t));return draw.call(this,t,...a);};},loop);
const forbidden=/陳柏勳|李承禮|周啟文|張守恆|守恆|[陳李周張]醫師|MED-\d{6}|THE NAME|ZHANG Seed/;
async function noLeak(){assert.doesNotMatch(await page.evaluate(()=>document.body.innerText+'\n'+[...window.__zhangText].join('\n')),forbidden);}
async function dialogue(){for(let i=0;i<30;i++){await noLeak();if(!await page.evaluate(()=>!!window.__storyQA.uiManager.dialogueSequence))return;await page.keyboard.press('KeyE');}throw Error('Dialogue did not finish');}
async function seed(step){await page.evaluate(async step=>{
 const q=window.__storyQA,d=q.identityRouteDirector,m=q.identityManager,u=q.uiManager;
 d.removeInteractionTarget();u.closeAllTransientOverlays();u.dialogueSequence=null;u.closeStoryChoice(false);
 m.runSave.currentRouteStep=m.route.indexOf(step);m.runSave.completedStoryModules=m.route.slice(0,m.runSave.currentRouteStep);m.runSave.currentMilestone=step;m.save();
 q.setFlag('FLOOR6_AVAILABLE',false);q.setFlag('M6_FLOOR6_RESOLVED',false);d.busy=false;
 await d.loadCurrentStep({forceLoad:true});q.controller.enabled=true;window.__zhangText.clear();
},step);}
async function aim(){return page.evaluate(()=>{
 const q=window.__storyQA,z=q.worldRouter.activeZoneInstance,d=q.identityRouteDirector,c=q.controller;
 z.zoneGroup.updateMatrixWorld(true);const o=d.boundTarget?.object;if(!o)throw Error('No real bound object: '+d.step+'/'+d.beatIndex);
 const center=o.getWorldPosition(c.position.clone());if(o.isGroup&&o.userData.id!=='408C_BED_PLAQUE')center.y=1.1;
 const visible=o=>{for(let p=o;p;p=p.parent)if(!p.visible)return false;return true;};
 const ray=new c.raycaster.constructor(),tries=[];
 for(const dy of [0,.13,-.13])for(const dist of [1.1,1.7,2.3,2.9,3.5])for(let i=0;i<24;i++){
  const a=i*Math.PI/12,eye=center.clone().set(center.x+dist*Math.cos(a),1.7,center.z+dist*Math.sin(a));c.teleport(...eye.toArray(),0);
  if(c.checkCollision(eye.x,eye.z)||c.supportedHeight(eye.x,eye.z)===null)continue;
  const target=center.clone();target.y+=dy;const delta=target.clone().sub(eye),distance=delta.length();if(distance>=4.4)continue;
  ray.set(eye,delta.normalize());ray.near=.01;ray.far=distance+.01;
  const hit=ray.intersectObject(z.zoneGroup,true).find(h=>visible(h.object)&&(Array.isArray(h.object.material)?h.object.material:[h.object.material]).some(m=>m&&m.visible!==false&&(!m.transparent||m.opacity>=.85)));
  let self=false;for(let p=hit?.object;p;p=p.parent)if(p===o)self=true;
  if(hit&&!self&&hit.distance<distance-.025)continue;
  const pick=q.lookAt(target.toArray());if(pick.current===o.userData.id){c.enabled=true;return {id:o.userData.id,type:o.userData.type,eye:eye.toArray(),target:target.toArray(),via:'E_KEY'};}
  tries.push(pick.current);
 }
 throw Error('No clear E-key approach: '+d.step+'/'+d.beatIndex+' '+o.userData.id+' '+JSON.stringify([...new Set(tries)]));
});}
async function shoot(name){await page.evaluate(()=>window.__zhangFrame?.());await page.waitForTimeout(100);await page.screenshot({path:`${out}/${name}.png`,timeout:20000});}
try{
 await page.goto('http://127.0.0.1:4189/?qa=story&identity=ZHANG',{waitUntil:'load',timeout:120000});
 await page.waitForFunction(()=>window.__storyQA?.identityRouteDirector&&!window.__storyQA.identityRouteDirector.busy,{},{timeout:120000});
 assert.equal(await page.evaluate(()=>window.__storyQA.identityManager.route.length),16);
 const steps=['ZHANG_2F_PRESENCE_CHECK','ZHANG_4F_WITNESS_RETURN','ZHANG_3F_OBSERVATION_RECORD'];
 for(const step of steps){
  await seed(step);assert.notEqual(await page.evaluate(()=>window.__storyQA.gameState.getFlag('ER_JANE_PRESENT')),true,'new tasks must not resurrect the absent ER patient');const result={step,interactions:[]};report.steps.push(result);
  for(let index=0;index<2;index++){
   assert.equal(await page.evaluate(()=>window.__storyQA.identityRouteDirector.beatIndex),index);
   result.interactions.push(await aim());console.log(step,index,result.interactions.at(-1).id);
   if(index===0)await shoot(step+'-world');
   await page.keyboard.press('KeyE');await dialogue();
   if(await page.evaluate(()=>document.getElementById('story-choice-modal').classList.contains('active'))){
    const snapshot=()=>page.evaluate(()=>({index:window.__storyQA.identityRouteDirector.beatIndex,run:JSON.stringify(window.__storyQA.identityManager.snapshot()),journal:JSON.stringify(window.__storyQA.persistentMemory.data.journalNotes)}));
    const before=await snapshot();await noLeak();await shoot(step+'-choice');
    await page.locator('#btn-story-secondary').click();await dialogue();assert.deepEqual(await snapshot(),before,'wrong answer must not advance/mint evidence');
    await aim();await page.keyboard.press('KeyE');await dialogue();await page.locator('#btn-story-primary').click();await dialogue();result.retry='PASS';result.correct='PASS';
   }
   await page.waitForFunction(({step,index})=>window.__storyQA.identityRouteDirector.step!==step||window.__storyQA.identityRouteDirector.beatIndex!==index,{step,index},{timeout:10000});
   await noLeak();await save();
  }
  const s=await page.evaluate(()=>({step:window.__storyQA.identityManager.currentRouteStep,zone:window.__storyQA.worldRouter.activeZoneId,awaiting:window.__storyQA.identityRouteDirector.awaitingZone,flags:Object.fromEntries(window.__storyQA.gameState.flags)}));
  const next={ZHANG_2F_PRESENCE_CHECK:'ZHANG_4F_WITNESS_RETURN',ZHANG_4F_WITNESS_RETURN:'ZHANG_3F_OBSERVATION_RECORD',ZHANG_3F_OBSERVATION_RECORD:'M6'}[step];
  assert.equal(s.step,next);assert(s.awaiting&&s.awaiting!==s.zone,'physical travel required, no auto-teleport');
  if(next!=='M6')assert.notEqual(s.flags.FLOOR6_AVAILABLE,true,'no premature 6F hijack');

  result.next=s.step;result.awaiting=s.awaiting;await save();
 }
 const trip=await page.evaluate(()=>{const q=window.__storyQA,o=q.worldRouter.activeZoneInstance.interactables.find(o=>['elevator','travel_selector'].includes(o.userData?.type)&&o.userData.kind==='elevator');if(!o)throw Error('3F elevator missing');q.controller.onInteract(o.userData);return {id:o.userData.id,from:q.worldRouter.activeZoneId};});
 await page.locator('[data-floor="first_campus_4f"]').click();
 await page.waitForFunction(()=>window.__storyQA.worldRouter.activeZoneId==='phantom_6f',{},{timeout:45000});
 report.finalElevator={...trip,destination:'phantom_6f',via:'PRODUCTION_HANDLER_AND_FLOOR_PICKER',verdict:'PASS'};
 await page.setViewportSize({width:390,height:844});await seed('ZHANG_2F_PRESENCE_CHECK');
 await aim();await page.keyboard.press('KeyE');await dialogue();await aim();await page.keyboard.press('KeyE');await dialogue();
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await noLeak();await shoot('ZHANG-mobile-choice');
 await page.locator('#btn-story-primary').click();await dialogue();report.mobile='PASS';
 assert.deepEqual(report.errors,[]);assert.deepEqual(report.resources,[]);report.verdict='PASS';
}catch(e){report.verdict='FAIL';report.failure=e.stack;console.error(e);await shoot('failure').catch(()=>{});process.exitCode=1;}
finally{await save();await browser.close();await new Promise(r=>server.httpServer.close(r));console.log(JSON.stringify(report));}
