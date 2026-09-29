import {spawnSync} from 'node:child_process';
import {chromium} from 'playwright';
import {preview} from 'vite';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {IDENTITY_ROUTES,ROUTE_STEPS} from '../src/story/IdentityRoutes.js';
import {IDENTITY_PROFILES} from '../src/core/IdentityManager.js';

const out=process.argv[2]||'qa-results/identity-contextual';
const closure=spawnSync(process.execPath,['scripts/test-clinical-interactions-browser.mjs',out+'/clinical-closure',...(process.argv[3]?[process.argv[3]]:[])],{stdio:'inherit'});
if(closure.status!==0)process.exit(closure.status||1);
const supplied=process.argv[3];
const onlyIdentity=process.env.IDENTITY_QA_ROUTE;
const stopAfter=process.env.IDENTITY_QA_STOP_AFTER;
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
  CanvasRenderingContext2D.prototype.fillText=function(text,...args){
    window.__drawnText.push(String(text));
    return draw.call(this,text,...args);
  };
});

let page;
async function shot(name){
  await page.screenshot({path:`${out}/${name}.png`,timeout:60000});
  report.screenshots.push(`${name}.png`);
}
async function ready(){
  await page.waitForFunction(
    ()=>window.__storyQA?.identityRouteDirector&&!window.__storyQA.identityRouteDirector.busy&&!!window.__storyQA.worldRouter.activeZoneInstance,
    {},
    {timeout:120000}
  );
}
async function fresh(identity,width=1440){
  if(page)await page.close();
  page=await context.newPage();
  await page.setViewportSize({width,height:width===390?844:900});
  page.on('pageerror',e=>report.errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
  page.on('response',r=>{if(r.status()>=400)report.errors.push(`${r.status()} ${r.url()}`);});
  await page.goto(base+`?qa=story&identity=${identity}`,{waitUntil:'load',timeout:120000});
  await ready();
  await page.evaluate(()=>history.replaceState(null,'','?qa=story'));
}

async function runtimeState(){
  return page.evaluate(()=>({
    step:window.__storyQA.identityManager.currentRouteStep,
    zone:window.__storyQA.worldRouter.activeZoneId,
    run:window.__storyQA.identityManager.snapshot(),
    interaction:window.__storyQA.identityRouteDirector.qaInteractionState(),
    dialogue:!!window.__storyQA.uiManager.dialogueSequence,
    choiceModal:document.getElementById('story-choice-modal')?.classList.contains('active')===true,
    panelVisible:getComputedStyle(document.getElementById('identity-loop-panel')).opacity==='1',
    awaitingZone:window.__storyQA.identityRouteDirector.qaInteractionState().awaitingZone,
    text:document.body.innerText,
    canvasText:window.__drawnText.join('\n'),
    body:document.body.scrollWidth,
    width:innerWidth
  }));
}

async function walk(identity,{wrong=false,mobile=false}={}){
  await fresh(identity,mobile?390:1440);
  const run={identity,width:mobile?390:1440,steps:[],beats:0,actions:0,wrong};
  assert.match(await page.title(),/Identy Loop/);

  for(let action=0;action<1000;action++){
    await ready();
    const state=await runtimeState();
    assert.equal(state.body,state.width,'no horizontal overflow');

    const choiceVisible=await page.locator('[data-identity-choices] .identity-choice').count();
    const manualEntryVisible=await page.locator('[data-identity-choices] .identity-entry-form').count();
    if(!choiceVisible&&!manualEntryVisible){
      assert.doesNotMatch(state.text,forbidden,`visible leak before M9 choice ${identity}/${state.step}`);
      assert.doesNotMatch(state.canvasText,forbidden,`world canvas name leak before M9 ${identity}/${state.step}`);
    }

    // The old QA-card interaction must never return.
    assert.equal(state.interaction.visibleSyntheticQuestCard,false,'visible synthetic quest card is forbidden');

    if(run.steps.at(-1)!==state.step){
      run.steps.push(state.step);
      assert.deepEqual(run.steps,IDENTITY_ROUTES[identity].slice(0,run.steps.length));
      if(run.steps.length===1)assert.equal(state.zone,ROUTE_STEPS[state.step].zoneId);
      // Outside B2/M9/ending the identity panel is no longer the dialogue surface.
      if(!['B2','M9'].includes(state.step))assert.equal(state.panelVisible,false,`panel must stay hidden during ${state.step}`);
      if(identity==='ZHOU'&&state.step==='ZHOU_OPEN_8F'){
        const photo=await page.evaluate(()=>{
          const qa=window.__storyQA;
          const zone=qa.worldRouter.activeZoneInstance;
          const object=zone.interactables.find(item=>item?.userData?.id==='IDENTITY_HISTORY_GROUP_PHOTO');
          if(!object)return null;
          const center=object.getWorldPosition(qa.controller.camera.position.clone()).toArray();
          const frame=zone.zoneGroup.getObjectByName('IdentityHistoryGroupPhoto_Frame');
          const view=qa.captureView({position:[-8,1.7,0],target:center,anchorName:'IdentityHistoryGroupPhoto'});
          const ray=qa.lookAt(center);
          const image=object.material?.map?.image;
          return {center,frame:frame?.position.toArray(),loaded:!!image&&image.width>0,view,ray};
        });
        assert.ok(photo,'the opening group photo must be mounted in the 8F world');
        assert.ok(Math.abs(photo.frame[0]+11.77)<0.01,'the group photo must be on the pictured lobby wall');
        assert.equal(photo.loaded,true,'the archival photo texture must load');
        assert.equal(photo.ray.current,'IDENTITY_HISTORY_GROUP_PHOTO','the photo surface must be the E-key target');
        assert.ok(photo.view.rect.width>100&&photo.view.rect.height>80,'the group photo must be plainly visible from the lobby');
      }
      await shot(`${identity}${wrong?'-wrong':''}${mobile?'-mobile':''}-${state.step}`);
      console.log(`${identity}: ${state.step}`);
      if(onlyIdentity===identity&&stopAfter===state.step){
        run.verdict='TARGETED_PASS';
        report.routes.push(run);
        return;
      }
      if(identity==='ZHOU'&&state.step==='M5'){
        assert.equal(
          await page.evaluate(()=>window.__storyQA.gameState.getFlag('UNDELIVERED_MEMO_FRAGMENT')),
          true,
          'Zhou must carry the unfinished M4 memo into the bridge sequence'
        );
      }
      if(state.step==='B2'){
        assert.equal(state.run.runSave.b2Entered,false,'the B2 route begins at the 1F access checkpoint');
        if(identity==='ZHOU'){
          assert.equal(run.zhouBridgeLoop,true,'Zhou contextual QA must exercise the photographic look-back loop');
          assert.equal(
            await page.evaluate(()=>window.__storyQA.gameState.getFlag('ZHOU_BRIDGE_LOOKBACK_SEEN')),
            true,
            'Zhou bridge look-back flag must persist through M7 into B2'
          );
        }
      }
    }

    if(state.step==='B2'&&state.run.runSave.b2Entered&&!run.b2OneWay){
      assert.equal(state.zone,'b2_archive','the one-way state starts only after the physical archive entry');
      assert.equal(await page.evaluate(()=>window.__storyQA.identityManager.enterB2()),false,'B2 cannot be entered twice');
      run.b2OneWay=true;
    }
    if(state.step==='M8')assert.equal(run.b2OneWay,true,'the route must physically enter B2 before returning');

    if(manualEntryVisible){
      assert.equal(state.step,'M9');
      assert.equal(choiceVisible,0,'M9 must not expose answer buttons');
      const selected=wrong?Object.keys(IDENTITY_PROFILES).find(x=>x!==identity):identity;
      await page.locator('.identity-entry-form input[aria-label="姓名"]').fill(IDENTITY_PROFILES[selected].name);
      await page.locator('.identity-entry-form input[aria-label="員編"]').fill(IDENTITY_PROFILES[selected].employeeId);
      await shot(`${identity}${wrong?'-wrong':''}${mobile?'-mobile':''}-manual-entry`);
      await page.locator('.identity-entry-submit').click();
      await page.waitForFunction(()=>window.__storyQA.identityManager.snapshot().runSave.runEnded===true,{},{timeout:30000});
      const ended=await page.evaluate(()=>window.__storyQA.identityManager.snapshot());
      assert.equal(ended.runSave.runEnded,true);
      assert.equal(ended.runSave.m9CommittedChoice,selected);
      assert.equal(ended.metaSave.completedGoodEnds.includes(identity),!wrong);
      assert.deepEqual(await page.evaluate(id=>window.__storyQA.identityLoopPanel.commit(id),identity),{ok:false,reason:'ALREADY_COMMITTED'});
      if(wrong){
        await page.waitForFunction(()=>window.__storyQA.gameState.getFlag('FINAL_PATIENTIZATION_ACTIVE'),{},{timeout:15000});
      }else{
        assert.equal(await page.evaluate(()=>window.__storyQA.gameState.getFlag('GAME_COMPLETE')),true);
      }
      await shot(`${identity}${wrong?'-wrong':''}${mobile?'-mobile':''}-ending`);
      run.verdict='PASS';
      run.ending=wrong?'WRONG_MEMORY_PATIENTIZATION':'GOOD_END';
      report.routes.push(run);
      return;
    }

    if(state.awaitingZone){
      assert.notEqual(state.zone,state.awaitingZone,'director must wait for physical/manual travel instead of auto-loading the destination');
      const arrived=await page.evaluate(()=>window.__storyQA.identityRouteDirector.qaArriveAtAwaitingZone());
      assert.equal(arrived,true,'QA must be able to simulate arriving at the awaited zone');
      run.actions++;
      continue;
    }

    if(state.choiceModal){
      if(identity==='ZHOU'&&state.step==='M5'&&!run.zhouBridgeLoop){
        const bridgeZone=state.zone;
        await page.locator('#btn-story-secondary').click();
        await page.waitForFunction(
          ()=>window.__storyQA.gameState.getFlag('M5_BRIDGE_RESOLVED')===true,
          {},
          {timeout:15000}
        );
        const afterLoop=await runtimeState();
        assert.equal(afterLoop.step,'M5','Zhou photographic loop must not roll the route backward');
        assert.equal(afterLoop.zone,bridgeZone,'Zhou photographic loop must return control to the same bridge zone');
        assert.equal(
          await page.evaluate(()=>window.__storyQA.gameState.getFlag('ZHOU_BRIDGE_LOOKBACK_SEEN')),
          true,
          'Zhou photographic loop must record the look-back memory'
        );
        run.zhouBridgeLoop=true;
      }else{
        // Correct route QA follows the purple backup ventilation path.
        const manualReview=page.locator('#btn-story-primary');
        await manualReview.focus();
        await page.keyboard.press('Enter');
        if(await manualReview.evaluate(button=>button.classList.contains('his-confirm-armed'))){
          await page.keyboard.press('Enter');
        }
      }
      run.actions++;
      continue;
    }

    if(state.dialogue){
      await page.keyboard.press('KeyE');
      run.actions++;
      continue;
    }

    const triggered=await page.evaluate(()=>window.__storyQA.identityRouteDirector.qaInteractCurrentBeat());
    if(!triggered&&state.text.includes('[E] 繼續')){
      await page.keyboard.press('KeyE');
      run.actions++;
      continue;
    }
    assert.equal(triggered,true,`current beat must bind to a world object/context target: ${identity}/${state.step}`);
    run.beats++;
    run.actions++;

    if(run.actions===3){
      const seed=await page.evaluate(()=>window.__storyQA.identityManager.currentIdentity);
      await page.reload({waitUntil:'load'});
      await ready();
      assert.equal(await page.evaluate(()=>window.__storyQA.identityManager.currentIdentity),seed);
    }
  }
  throw Error(`Route exceeded action bound: ${identity}`);
}

try{
  const identities=onlyIdentity?[onlyIdentity]:Object.keys(IDENTITY_ROUTES);
  for(const identity of identities)await walk(identity);
  if(!onlyIdentity){
    await context.clearCookies();
    await page.evaluate(()=>localStorage.clear());
    await walk('LI',{wrong:true});

    await page.evaluate(()=>localStorage.clear());
    await page.goto(base,{waitUntil:'load'});
    await page.waitForSelector('#task-panel',{timeout:120000});
    assert.equal(await page.evaluate(()=>typeof window.__storyQA),'undefined');
    assert.match(await page.title(),/Identy Loop/);
    assert.doesNotMatch(await page.locator('body').innerText(),forbidden);
    // Ordinary public entry must not expose the old route-action button UI.
    assert.equal(await page.locator('[data-route-action]').count(),0);
    await shot('ordinary-public-entry-desktop');
  }
  report.ordinaryEntry='PASS';

  assert.equal(report.errors.length,0,JSON.stringify(report.errors));
  report.verdict='PASS';
}catch(e){
  report.verdict='FAIL';
  report.failure=e.stack;
  console.error(e.stack);
  if(page)await shot('failure').catch(()=>{});
  process.exitCode=1;
}finally{
  await browser.close();
  if(server)await new Promise(r=>server.httpServer.close(r));
  report.finishedAt=new Date().toISOString();
  await writeFile(`${out}/result.json`,JSON.stringify(report,null,2));
  console.log(JSON.stringify(report));
}
