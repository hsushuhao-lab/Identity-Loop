import {chromium} from 'playwright';
import {preview} from 'vite';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {IDENTITY_ROUTES,ROUTE_STEPS} from '../src/story/IdentityRoutes.js';
import {IDENTITY_PROFILES} from '../src/core/IdentityManager.js';

const out=process.argv[2]||'qa-results/identity-v03';
const supplied=process.argv[3];
const server=supplied?null:await preview({root:fileURLToPath(new URL('..',import.meta.url)),preview:{host:'127.0.0.1',port:4175,strictPort:true}});
const base=supplied||'http://127.0.0.1:4175/';
const report={url:base,sha:process.env.GITHUB_SHA||'local',routes:[],errors:[],screenshots:[],startedAt:new Date().toISOString()};
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.platform==='win32'?{channel:'chromium',args:['--use-angle=d3d11']}:{})});
const context=await browser.newContext({viewport:{width:1440,height:900}});
const forbidden=/張守恆|李承禮|周啟文|陳柏勳|林婉真|王世榮|謝玉琴|劉志遠|陳怡君|守恆|蔡護理督導|[\u4e00-\u9fff]○+|[張李周陳林王謝劉許江方](?:住院|主治)?醫師|姓氏[：:]|ZHANG|ZHOU|CHEN/;
await context.addInitScript(()=>{
 window.__drawnText=[];
 const draw=CanvasRenderingContext2D.prototype.fillText;
 CanvasRenderingContext2D.prototype.fillText=function(text,...args){window.__drawnText.push(String(text));return draw.call(this,text,...args);};
});
let page;
async function shot(name){await page.waitForFunction(()=>getComputedStyle(document.getElementById('identity-loop-panel')).opacity==='1');await page.screenshot({path:`${out}/${name}.png`,timeout:60000});report.screenshots.push(`${name}.png`);}
async function ready(){await page.waitForFunction(()=>window.__storyQA?.identityRouteDirector&&!window.__storyQA.identityRouteDirector.busy&&!!window.__storyQA.worldRouter.activeZoneInstance,{},{timeout:120000});}
async function fresh(identity,width=1440){
 if(page)await page.close();
 page=await context.newPage();await page.setViewportSize({width,height:width===390?844:900});
 page.on('pageerror',e=>report.errors.push(e.message));
 page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
 page.on('response',r=>{if(r.status()>=400)report.errors.push(`${r.status()} ${r.url()}`);});
 await page.goto(base+`?qa=story&identity=${identity}`,{waitUntil:'load',timeout:120000});await ready();
 await page.evaluate(()=>history.replaceState(null,'','?qa=story'));
}
async function walk(identity,{wrong=false,mobile=false}={}){
 await fresh(identity,mobile?390:1440);
 const run={identity,width:mobile?390:1440,steps:[],photos:[],actions:0,wrong};
 assert.match(await page.title(),/Identy Loop/);
 for(let action=0;action<600;action++){
  await ready();
  const state=await page.evaluate(()=>({step:window.__storyQA.identityManager.currentRouteStep,zone:window.__storyQA.worldRouter.activeZoneId,run:window.__storyQA.identityManager.snapshot(),text:document.body.innerText,canvasText:window.__drawnText.join('\n'),body:document.body.scrollWidth,width:innerWidth}));
  assert.equal(state.body,state.width,'no horizontal overflow');
  const choiceVisible=await page.locator('[data-identity-choices] .identity-choice').count();
  const photoNode=page.locator('[data-identity-detail] img');
  const photo=await photoNode.count()?await photoNode.getAttribute('src'):null;
  if(photo&&!run.photos.includes(photo)){run.photos.push(photo);await shot(`${identity}-inspected-photo-${run.photos.length}`);}
  if(!choiceVisible){assert.doesNotMatch(state.text,forbidden,`visible leak before M9 choice ${identity}/${state.step}`);assert.doesNotMatch(state.canvasText,forbidden,`world canvas name leak: ${state.canvasText.split('\\n').filter(text=>forbidden.test(text)).join(' | ')}`);}
  if(run.steps.at(-1)!==state.step){
   run.steps.push(state.step);assert.deepEqual(run.steps,IDENTITY_ROUTES[identity].slice(0,run.steps.length));
   if(run.steps.length===1)assert.equal(state.zone,ROUTE_STEPS[state.step].zoneId);
   await shot(`${identity}${wrong?'-wrong':''}${mobile?'-mobile':''}-${state.step}`);
   console.log(`${identity}: ${state.step}`);
   if(state.step==='B2'){
    assert.equal(state.run.runSave.b2Entered,true);
    assert.equal(await page.evaluate(()=>window.__storyQA.identityManager.enterB2()),false);
   }
  }
  if(choiceVisible){
   assert.equal(state.step,'M9');assert.equal(choiceVisible,4);
   const optionsText=await page.locator('[data-identity-choices]').innerText();
   for(const profile of Object.values(IDENTITY_PROFILES))assert.ok(optionsText.includes(profile.role),'final name must be mapped to its anonymous role');
   await shot(`${identity}${wrong?'-wrong':''}${mobile?'-mobile':''}-four-choices`);
   const selected=wrong?Object.keys(IDENTITY_PROFILES).find(x=>x!==identity):identity;
   await page.locator('[data-identity-choices] .identity-choice').filter({hasText:IDENTITY_PROFILES[selected].name}).click();
   const ended=await page.evaluate(()=>window.__storyQA.identityManager.snapshot());
   assert.equal(ended.runSave.runEnded,true);assert.equal(ended.runSave.m9CommittedChoice,selected);
   assert.equal(ended.metaSave.completedGoodEnds.includes(identity),!wrong);
   assert.deepEqual(await page.evaluate(id=>window.__storyQA.identityLoopPanel.commit(id),identity),{ok:false,reason:'ALREADY_COMMITTED'});
   assert.deepEqual(await page.evaluate(()=>window.__storyQA.identityManager.snapshot()),ended);
   if(wrong){
    await page.waitForFunction(()=>window.__storyQA.gameState.getFlag('FINAL_PATIENTIZATION_ACTIVE'),{},{timeout:15000});
    assert.match(await page.locator('[data-identity-detail]').innerText(),/WRONG MEMORY/);
   }else assert.equal(await page.evaluate(()=>window.__storyQA.gameState.getFlag('GAME_COMPLETE')),true);
   await shot(`${identity}${wrong?'-wrong':''}${mobile?'-mobile':''}-ending`);
   await page.reload({waitUntil:'load'});await ready();assert.deepEqual(await page.evaluate(()=>window.__storyQA.identityManager.snapshot()),ended,'reload must preserve final commit');
   if(wrong){
    await page.waitForFunction(()=>window.__storyQA.gameState.getFlag('FINAL_PATIENTIZATION_ACTIVE'),{},{timeout:15000});
    await shot('LI-mobile-wrong-restored');
   }else{
    await page.locator('.identity-loop-new-run').click();await page.waitForLoadState('load');await ready();
    const next=await page.evaluate(()=>window.__storyQA.identityManager.snapshot());
    assert.equal(next.runSave.runEnded,false);assert.equal(next.runSave.m9CommittedChoice,null);
    assert.deepEqual(next.runSave.completedStoryModules,[]);
    if(next.metaSave.completedGoodEnds.length===4)assert.equal(next.runSave.currentMilestone,'M10');
    else assert.equal(next.metaSave.completedGoodEnds.includes(next.runSave.currentIdentity),false);
   }
   run.verdict='PASS';run.ending=wrong?'WRONG_MEMORY_PATIENTIZATION':'GOOD_END';report.routes.push(run);return;
  }
  const actionButton=page.locator('[data-route-action="inspect"], [data-route-action="next"], [data-route-action="review"]').last();
  if(await page.locator('[data-route-action="wrong"]').count()){
   const warned=await page.evaluate(()=>window.__storyQA.gameState.getFlag('M7_WRONG_PROCEDURE_SEEN'));
   if(!warned){await page.locator('[data-route-action="wrong"]').click();assert.equal(await page.evaluate(()=>window.__storyQA.identityManager.currentRouteStep),'M7');}
  }
  await actionButton.click({timeout:60000});run.actions++;
  if(run.actions===2){
   const seed=await page.evaluate(()=>window.__storyQA.identityManager.currentIdentity);
   await page.reload({waitUntil:'load'});await ready();assert.equal(await page.evaluate(()=>window.__storyQA.identityManager.currentIdentity),seed);
  }
 }
 throw Error(`Route exceeded action bound: ${identity}`);
}
try{
 for(const identity of Object.keys(IDENTITY_ROUTES))await walk(identity);
 await context.clearCookies();await page.evaluate(()=>localStorage.clear());
 await walk('LI',{wrong:true,mobile:true});
 await page.evaluate(()=>localStorage.clear());
 await page.goto(base,{waitUntil:'load'});
 await page.locator('[data-route-action="inspect"]').waitFor({timeout:120000});
 assert.equal(await page.evaluate(()=>typeof window.__storyQA),'undefined');
 assert.match(await page.title(),/Identy Loop/);
 assert.doesNotMatch(await page.locator('body').innerText(),forbidden);
 await shot('ordinary-public-entry-mobile');report.ordinaryEntry='PASS';
 assert.equal(report.errors.length,0,JSON.stringify(report.errors));
 report.verdict='PASS';
}catch(e){report.verdict='FAIL';report.failure=e.stack;console.error(e.stack);if(page)await shot('failure').catch(()=>{});process.exitCode=1;}
finally{await browser.close();if(server)await new Promise(r=>server.httpServer.close(r));report.finishedAt=new Date().toISOString();await writeFile(`${out}/result.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));}
