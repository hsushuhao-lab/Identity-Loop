import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { preview } from 'vite';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const output=process.argv[2]||'qa-results/cinematic-travel-flows';
const publicUrl=process.argv[3];
const base=publicUrl||'http://localhost:4173/';
const server=publicUrl?null:await preview({root:fileURLToPath(new URL('..',import.meta.url)),preview:{port:4173,strictPort:true}});
const browser=await chromium.launch({channel:'chrome',headless:true});
const report={sourceSha:process.env.GITHUB_SHA||'local-working-tree',verdict:'FAIL',flows:[],errors:[]};

async function startPage(zone){
  const page=await browser.newPage({viewport:{width:1440,height:900}});
  page.on('pageerror',error=>report.errors.push(error.message));
  page.on('response',response=>{if(response.status()>=400)report.errors.push(`${response.status()} ${response.url()}`);});
  // These legacy flag-driven cinematics are isolated from the identity director.
  await page.goto(base+'?qa=story&mode=linear');
  await page.waitForFunction(()=>window.__storyQA?.worldRouter?.activeZoneInstance);
  await page.evaluate(zoneId=>{
    const qa=window.__storyQA;
    qa.setFlag('STAFF_ACCESS_CARD',true);
    for(const task of ['KEY_PICKUP','DUTY_LOG','E_HANDOFF'])qa.task(task);
    qa.load(zoneId);
  },zone);
  return page;
}

async function chooseFloor(page,zone){
  await page.evaluate(()=>window.__storyQA.interact({type:'elevator'}));
  const button=page.locator(`button[data-floor="${zone}"]`);
  await button.waitFor({state:'visible',timeout:10000});
  assert.equal(await button.isDisabled(),false,`${zone} destination must be available`);
  await button.click();
}

try{
  await mkdir(output,{recursive:true});

  const previewPage=await startPage('first_campus_3f');
  await previewPage.evaluate(()=>window.__storyQA.setFlag('SECOND_CAMPUS_ACCESS',true));
  await chooseFloor(previewPage,'first_campus_8f');
  await previewPage.waitForFunction(()=>window.__storyQA.gameState.getFlag('CG_ELEVATOR_6F_PREVIEW_ACTIVE'));
  await previewPage.waitForTimeout(1450);
  await previewPage.screenshot({path:`${output}/6f-preview-gap.png`});
  await previewPage.waitForFunction(()=>window.__storyQA.worldRouter.activeZoneId==='first_campus_8f');
  const previewState=await previewPage.evaluate(()=>({zone:window.__storyQA.worldRouter.activeZoneId,played:window.__storyQA.gameState.getFlag('CG_ELEVATOR_6F_PREVIEW_PLAYED'),resolved:!!window.__storyQA.gameState.getFlag('M6_FLOOR6_RESOLVED'),canvas:!!document.querySelector('.elevator-glimpse-canvas')}));
  assert.deepEqual(previewState,{zone:'first_campus_8f',played:true,resolved:false,canvas:false});
  report.flows.push({id:'6F_PREVIEW_PRESERVES_DESTINATION',state:previewState});
  await previewPage.close();

  const erPage=await startPage('first_campus_4f');
  await erPage.evaluate(()=>window.__storyQA.setFlag('GHOST_REGISTRATION_AVAILABLE',true));
  await chooseFloor(erPage,'first_campus_2f');
  await erPage.waitForFunction(()=>window.__storyQA.worldRouter.activeZoneId==='first_campus_2f'&&window.__storyQA.controller.enabled);
  assert.equal(await erPage.evaluate(()=>!!window.__storyQA.gameState.getFlag('CG_00_33_GHOST_REGISTRATION_PLAYED')),false);
  await erPage.evaluate(()=>{
    const qa=window.__storyQA;qa.gameState.setGameTime('00:33');
    qa.captureView({position:[13,1.65,-5.8],target:[13,1.18,-8.55],anchorName:'ER_GhostRegistrationTerminal'});
  });
  await erPage.waitForFunction(()=>window.__storyQA.gameState.getFlag('CG_00_33_GHOST_REGISTRATION_ACTIVE')===true,null,{timeout:15000});
  await erPage.waitForFunction(()=>window.__storyQA.worldRouter.activeZoneInstance.registrationStage===2);
  await erPage.screenshot({path:`${output}/00-33-registration-active.png`});
  await erPage.waitForFunction(()=>window.__storyQA.gameState.getFlag('CG_00_33_GHOST_REGISTRATION_PLAYED')===true,null,{timeout:15000});
  const erState=await erPage.evaluate(()=>({zone:window.__storyQA.worldRouter.activeZoneId,enabled:window.__storyQA.controller.enabled,played:window.__storyQA.gameState.getFlag('CG_00_33_GHOST_REGISTRATION_PLAYED')}));
  assert.deepEqual(erState,{zone:'first_campus_2f',enabled:true,played:true});
  report.flows.push({id:'00_33_GHOST_REGISTRATION',steps:['opened the elevator selector from 4F','selected 2F','entered the diagnostic room; actual screen fields appeared during the automatic cinematic'],state:erState});
  await erPage.close();

  const sixPage=await startPage('first_campus_3f');
  await sixPage.evaluate(()=>window.__storyQA.setFlag('FLOOR6_AVAILABLE',true));
  await chooseFloor(sixPage,'first_campus_4f');
  await sixPage.waitForFunction(()=>window.__storyQA.gameState.getFlag('CG_ELEVATOR_STOP_AT_ERASED_6F_ACTIVE')===true,null,{timeout:15000});
  await sixPage.screenshot({path:`${output}/elevator-6f-active.png`});
  await sixPage.waitForFunction(()=>window.__storyQA.gameState.getFlag('CG_ELEVATOR_STOP_AT_ERASED_6F_PLAYED')===true,null,{timeout:15000});
  await sixPage.waitForFunction(()=>window.__storyQA.worldRouter.activeZoneId==='phantom_6f',null,{timeout:15000});
  const sixState=await sixPage.evaluate(()=>({zone:window.__storyQA.worldRouter.activeZoneId,enabled:window.__storyQA.controller.enabled,played:window.__storyQA.gameState.getFlag('CG_ELEVATOR_STOP_AT_ERASED_6F_PLAYED'),returnZone:window.__storyQA.gameState.getFlag('PHANTOM6_RETURN_ZONE'),available:window.__storyQA.gameState.getFlag('FLOOR6_AVAILABLE')}));
  assert.deepEqual(sixState,{zone:'phantom_6f',enabled:true,played:true,returnZone:'first_campus_4f',available:false});
  report.flows.push({id:'ELEVATOR_STOP_AT_ERASED_6F',steps:['opened the elevator selector from 3F','selected 4F','6F display cue played before entering the phantom floor'],state:sixState});
  assert.deepEqual(report.errors,[]);
  report.verdict='PASS';
}catch(error){
  report.errors.push(error.stack||error.message);
  throw error;
}finally{
  report.finished=new Date().toISOString();
  await writeFile(`${output}/result.json`,JSON.stringify(report,null,2));
  await browser.close();
  if(server)await new Promise(resolve=>server.httpServer.close(resolve));
}

console.log(JSON.stringify(report));
