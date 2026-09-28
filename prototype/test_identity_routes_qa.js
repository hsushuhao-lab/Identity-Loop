import assert from 'node:assert/strict';
import { IdentityManager, IDENTITY_STORAGE_KEY } from './src/core/IdentityManager.js';
import { IDENTITY_ROUTES, ROUTE_STEPS } from './src/story/IdentityRoutes.js';
import { WORLD_SPAWNS } from './src/world/shared/WorldRoutes.js';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { anonymousNarrative, worldNarrative } from './src/story/IdentityPrivacy.js';
import { drawCharacterStrip } from './src/art/CharacterPortraitArt.js';
const expected={
  ZHANG:['ZHANG_OPEN_4F','M2','M1','M4','ZHANG_SECOND_CAMPUS_SECURITY','M5','ZHANG_6F_FORESHADOW','M3','M6','M7','B2','M8','M9'],
  LI:['M1','M2','M3','M4','M5','M6','M7','B2','M8','M9'],
  ZHOU:['ZHOU_OPEN_8F','M4','M5','M1','ZHOU_1F_PHOTO','ZHOU_SECURITY_TALK','M3','M2','ZHOU_2117_RETURN','M6','M7','B2','M8','M9'],
  CHEN:['CHEN_OPEN_SKYBRIDGE','M4','M5','M1','M2','M3','M6','M7','B2','M8','M9']
};
const storage=()=>({value:null,getItem(){return this.value;},setItem(_,value){this.value=value;}});
for(const [identity,route] of Object.entries(expected)){
  const store=storage();
  let manager=IdentityManager.createForTest(identity,store);
  assert.deepEqual(manager.route,route);
  assert.deepEqual(IDENTITY_ROUTES[identity],route);
  for(const [index,step] of route.entries()){
    assert.equal(manager.currentRouteStep,step);
    assert.equal(manager.runSave.currentRouteStep,index);
    assert.deepEqual(manager.runSave.completedStoryModules,route.slice(0,index));
    const before=store.value;
    assert.equal(manager.completeRouteStep('INVALID'),false);
    if(step!=='M9'){
      assert.equal(manager.completeRouteStep('M9'),false);
      if(step!=='M8')assert.equal(manager.advanceMilestone('M9'),false);
      assert.equal(manager.commitM9(identity).reason,'M9_NOT_ACTIVE');
      assert.equal(store.value,before);
      assert.equal(manager.completeRouteStep(step),true);
      assert.equal(manager.completeRouteStep(step),false);
    }else{
      assert.equal(manager.completeRouteStep(step),false);
      assert.equal(manager.commitM9(identity).type,'GOOD_END');
    }
    manager=new IdentityManager(store);
    if(identity==='ZHANG'&&step==='M2')assert.equal(manager.runSave.completedStoryModules.includes('M1'),false);
  }
  assert.equal(manager.currentRouteStep,null);
  const ended=store.value;
  manager.restoreOrStartRun();
  assert.equal(store.value,ended);
  assert.equal(manager.runSave.runEnded,true);
  assert.equal(manager.commitM9(identity).reason,'ALREADY_COMMITTED');
  assert.deepEqual(manager.runSave.completedStoryModules,route);
  assert.deepEqual(manager.startNewRun({restart:true,forceIdentity:identity}).metaSave.completedGoodEnds,[identity]);
  assert.equal(manager.currentRouteStep,route[0]);
  console.log(`PASS route ${identity}: exact order, guarded progression, reload at every step, one final commit, restart retains good ending`);
}
for(const [step,data] of Object.entries(ROUTE_STEPS)){
  assert.equal(WORLD_SPAWNS[data.spawn]?.zoneId,data.zoneId,step);
  assert.doesNotMatch(data.label,/ZHANG|ZHOU|CHEN|\bLI\b|張|李|周|陳/);
  assert.ok(data.time===null||/^\d{2}:\d{2}$/.test(data.time));
}

// Regression: M1 means "arrive at 316", never "spawn inside 316".
// The actual handoff completes only after using the real patrol-point key,
// opening the real office door, and crossing into the office volume.
assert.equal(ROUTE_STEPS.M1.spawn,'m0_316_entrance');
assert.equal(WORLD_SPAWNS[ROUTE_STEPS.M1.spawn].name,'316 總醫師室門口');
const routeDirectorSource=readFileSync(new URL('./src/story/IdentityRouteDirector.js',import.meta.url),'utf8');
assert.match(routeDirectorSource,/if\(index===0\) return \{ officeEntry:true \}/);
assert.match(routeDirectorSource,/this\.gameState\.getFlag\('OPENED_316'\)/);
assert.match(routeDirectorSource,/p\.x>3\.2&&p\.x<10\.8&&p\.z>2\.8&&p\.z<8\.2/);
assert.match(routeDirectorSource,/取得 316 備援鑰匙/);
assert.match(routeDirectorSource,/走進 316 辦公室，開始正式交班/);
const mainSourceFor316=readFileSync(new URL('./src/main.js',import.meta.url),'utf8');
assert.match(mainSourceFor316,/identityLoopMode[\s\S]*門開了。進去 316，完成今晚的交接。/);
console.log('PASS M1 regression: starts outside locked 316; physical entry starts handoff, which completes only after log/HIS/key-card');

const guardSource=readFileSync(new URL('./src/world/zones/FirstCampus1F.js',import.meta.url),'utf8');
assert.match(guardSource,/reflectionFrame\.position\.set\(-10\.72,1\.92,7\.76\)/);
assert.match(guardSource,/new THREE\.PlaneGeometry\(2\.52,1\.62\)/);
assert.match(guardSource,/id:'IDENTITY_GUARD_PHONE'/);
assert.match(guardSource,/OldGuardPost_DeskPhone_Handset/);
assert.doesNotMatch(guardSource,/label:'查看警衛台上的事故前設備照片'/);

const sceneSource=readFileSync(new URL('./src/story/IdentityRouteScenes.js',import.meta.url),'utf8');
assert.match(sceneSource,/ZHOU_SECURITY_TALK:[\s\S]*接聽警衛台電話/);
assert.match(sceneSource,/2F 急診有一名身分待確認的男性/);
assert.match(sceneSource,/ARCHIVE LOOKUP／316 LEGACY CLIENT/);
assert.match(sceneSource,/316 有舊資料終端。我把這張帶回三樓查/);

assert.match(routeDirectorSource,/PHONE_CALL_KIND','IDENTITY_ZHOU_ER'/);
assert.match(routeDirectorSource,/id: 'IDENTITY_GUARD_PHONE'/);
assert.match(routeDirectorSource,/ensureIdentityDutyAccess\(\)/);
assert.match(routeDirectorSource,/setFlag\('STAFF_ACCESS_CARD', true\)/);
assert.match(routeDirectorSource,/\['KEY_PICKUP','DUTY_LOG','E_HANDOFF'\]/);
assert.match(routeDirectorSource,/beat\.review \|\| beat\.label \|\| ROUTE_STEPS\[this\.step\]\.label/);
console.log('PASS Zhou regression: wall photo -> guard -> ringing phone -> 2F -> explicit 316 legacy lookup; M1 grants durable duty access');

const wardSource=readFileSync(new URL('./src/world/shared/WardFloorplan.js',import.meta.url),'utf8');
assert.match(wardSource,/Identity4F_WardSpareKey/);
assert.match(wardSource,/setIdentityWardSpareKeyBorrowed/);
assert.match(routeDirectorSource,/ZHANG_4F_SPARE_KEY_BORROWED/);
assert.match(routeDirectorSource,/id: 'BED33_BOARD'/);
assert.match(routeDirectorSource,/id: 'BED33_HIS_409'/);
assert.match(routeDirectorSource,/id: 'BED33_ASSIGNMENT'/);
assert.match(routeDirectorSource,/把護理站備用鑰匙歸還/);
assert.ok(mainSourceFor316.includes("borrowedWardSpareKey"));
assert.ok(mainSourceFor316.includes("/^room_40[1-8]$/.test"));
assert.match(sceneSource,/向護理站借查房備用鑰匙/);
assert.match(sceneSource,/核對 4F 晚間床位板/);
assert.match(sceneSource,/核對 409 HIS 列印/);
assert.match(sceneSource,/核對 409-A 臨時住院單/);
assert.match(sceneSource,/clearFlag:'ZHANG_4F_SPARE_KEY_BORROWED'/);
console.log('PASS Zhang pre-handoff round: borrow nursing spare key -> 403/408/409 -> board/HIS/temp admission form -> return key -> 316');

assert.match(wardSource,/IdentitySecond5F_ConsultSpareKey/);
assert.match(wardSource,/IDENTITY_SECOND_5F_NURSE_STATION/);
assert.match(wardSource,/setIdentitySecondConsultKeyBorrowed/);
assert.match(routeDirectorSource,/SECOND_5F_CONSULT_KEY_BORROWED/);
assert.match(routeDirectorSource,/id: 'IDENTITY_SECOND_5F_NURSE_STATION'/);
assert.ok(mainSourceFor316.includes("borrowedSecondConsultKey"));
assert.ok(mainSourceFor316.includes("interactable.doorId==='room_504'"));
assert.match(sceneSource,/向 5F 護理站借會診備用鑰匙/);
assert.match(sceneSource,/歸還 5F 會診備用鑰匙/);
assert.match(sceneSource,/clearFlag:\(identity==='ZHOU'\|\|identity==='CHEN'\)\?'SECOND_5F_CONSULT_KEY_BORROWED'/);
console.log('PASS pre-handoff M4: Zhou/Chen borrow 504-only consult key, assess patient, review transfer, return key');

const routeSceneSource=readFileSync(new URL('./src/story/IdentityRouteScenes.js',import.meta.url),'utf8');
const m1Slice=routeSceneSource.slice(routeSceneSource.indexOf("    M1: ["),routeSceneSource.indexOf("    M2: ["));
assert.doesNotMatch(m1Slice,/speaker:'學長'/);
assert.match(m1Slice,/以前.*學長/);
assert.match(m1Slice,/簽署值班簿/);
assert.match(m1Slice,/核對 HIS 值班狀態/);
assert.match(m1Slice,/領取正式值班物品/);
assert.match(routeDirectorSource,/index===1\) return \{ id:'DUTY_LOG'/);
assert.match(routeDirectorSource,/index===2\) return \{ type:'workstation'/);
assert.match(routeDirectorSource,/index===3\) return \{ id:'KEY_PICKUP'/);
assert.match(routeDirectorSource,/setIdentityDutyItemsVisible/);
assert.match(routeSceneSource,/監視器室的閃爍/);
assert.match(routeSceneSource,/bridgeChoice:true/);
assert.match(routeSceneSource,/安妮.*「回頭啊。」/s);
assert.match(routeDirectorSource,/primaryText:'不要回頭，繼續走'/);
assert.match(routeDirectorSource,/secondaryText:'回頭'/);
assert.match(routeDirectorSource,/BRIDGE_LOOKBACK_PATIENTIZATION/);
assert.match(routeDirectorSource,/BRIDGE_MANUAL_LOOKBACK_PATIENTIZATION/);
console.log('PASS M1/M5 regression: empty 316 monologue -> log/HIS/key-card gate; CCTV lead-in -> Annie choice -> lookback patientization');
for(const [identity,route] of Object.entries(expected))for(const milestone of ['M1','M2','M8','M9','B2']){
  const store=storage();
  store.setItem(IDENTITY_STORAGE_KEY,JSON.stringify({metaSave:{completedGoodEnds:['LI']},runSave:{currentIdentity:identity,currentMilestone:milestone,evidence:{old:{id:'old'}},b2Entered:true}}));
  const migrated=new IdentityManager(store);
  assert.equal(migrated.currentIdentity,identity);
  assert.equal(migrated.currentRouteStep,route[0]);
  assert.deepEqual(migrated.runSave.completedStoryModules,[]);
  assert.deepEqual(migrated.metaSave.completedGoodEnds,['LI']);
  assert.equal(new IdentityManager(store).currentRouteStep,route[0]);
  assert.equal(JSON.parse(store.value).version,2);
}
console.log('PASS metadata resolves real spawns without identity labels; 20 legacy unfinished saves restart durably without fabricated modules');
const adjacent=IdentityManager.createForTest('LI');
assert.equal(adjacent.advanceMilestone('M2'),true);
assert.deepEqual(adjacent.runSave.completedStoryModules,['M1']);
assert.equal(adjacent.advanceMilestone('M4'),false);
assert.equal(adjacent.currentRouteStep,'M2');
console.log('PASS legacy advanceMilestone permits only the next route step');
const wrongStore=storage();
const wrong=IdentityManager.createForTest('LI',wrongStore);
while(wrong.currentRouteStep!=='M9')assert.equal(wrong.completeRouteStep(wrong.currentRouteStep),true);
wrong.commitM9('CHEN');
const restored=new IdentityManager(wrongStore);
restored.restoreOrStartRun();
assert.equal(restored.runSave.runEnded,true);
assert.equal(restored.runSave.m9CommittedChoice,'CHEN');
assert.equal(restored.commitM9('LI').reason,'ALREADY_COMMITTED');
assert.deepEqual(restored.metaSave.completedGoodEnds,[]);
restored.startNewRun();
assert.equal(restored.runSave.runEnded,false);
console.log('PASS good and wrong endings survive restore; only explicit new run replaces ended state');

const privateNames=['張守恆','李承禮','周啟文','陳柏勳','林婉真','王世榮','謝玉琴','劉志遠'];
assert.equal(anonymousNarrative('終身奉獻獎 蔡護理督導'),'終身奉獻獎 未辨識護理督導');
const placeholderNames=['陳○○','林○○','葉○○','許○○','郭○○','鄭○○','王○○'];
for(const name of placeholderNames){
  const redacted=anonymousNarrative(`名冊：${name}／316`);
  assert.equal(redacted.includes(name[0]),false,name);
  assert.equal(redacted.includes('○'),false,name);
  assert.ok(redacted.startsWith('名冊：')&&redacted.endsWith('／316'),name);
  assert.ok(redacted.length>'名冊：／316'.length,name);
}
console.log('PASS all seven placeholder surnames anonymized without losing roster context');
for(const name of [...privateNames,'陳怡君']){
  assert.equal(anonymousNarrative(`值班：${name}；床位504B`),'值班：身分待核；床位504B',name);
}
for(const surname of ['張','李','周','陳','林','王','謝','劉','許','江','方']){
  for(const title of ['醫師','住院醫師','主治醫師']){
    const redacted=anonymousNarrative(`${surname}${title}／316`);
    assert.equal(redacted.includes(surname),false,`${surname}${title}`);
    assert.ok(redacted.endsWith('／316'),`${surname}${title}: preserve room number`);
    assert.ok(redacted.length>'／316'.length,`${surname}${title}: retain anonymous text`);
  }
}
for(const id of ['MED-12','MED-123','MED-1234','MED-12345','MED-870409','MED-820316','MED-880217','MED-890605']){
  assert.equal(anonymousNarrative(`工號：${id}；17:00`),'工號：MED-••••••；17:00',id);
}
assert.equal(anonymousNarrative('4F／409-A／504B／02:17'),'4F／409-A／504B／02:17');
console.log('PASS anonymousNarrative: all eight personnel names, patient name, 33 surname titles and MED IDs masked; clinical identifiers preserved');

const textureCases=[
  {file:'./src/world/zones/FirstCampus3F.js',call:/rctx\.fillText\([^;\r\n]*,x\+112,y\+44\)/g,inputs:['林醫師','周醫師','陳醫師','許醫師','江醫師','方醫師'],variable:'name'},
  {file:'./src/world/shared/PlanArchitecture.js',call:/ctx\.fillText\([^;\r\n]*,42,y,940\)/g,inputs:['第一線：李住院醫師　｜　總醫師：316 室','病人：陳怡君　｜　床位：504B'],variable:'text'},
  {file:'./src/world/shared/WardFloorplan.js',call:/ctx\.fillText\([^;\r\n]*,34,170\)/g,inputs:['姓名：陳怡君'],variable:'text'},
  {file:'./src/world/zones/FirstCampus8FBridgeEntry.js',call:/ctx\.fillText\([^;\r\n]*,\s*128,\s*260\)/g,inputs:[...privateNames,...placeholderNames],variable:'title'},
  {file:'./src/world/zones/Skybridge.js',call:/ctx\.fillText\([^;\r\n]*,\s*128,\s*260\)/g,inputs:[...privateNames,...placeholderNames],variable:'title'}
];
const originalWindow=Object.getOwnPropertyDescriptor(globalThis,'window');
try{
  for(const search of ['','?mode=identity','?mode=linear']){
    Object.defineProperty(globalThis,'window',{value:{location:{search}},writable:true,configurable:true});
    const identityMode=search!=='?mode=linear';
    for(const fixture of textureCases){
      const calls=readFileSync(new URL(fixture.file,import.meta.url),'utf8').match(fixture.call)||[];
      assert.equal(calls.length,1,`locate actual texture draw: ${fixture.file}`);
      for(const input of fixture.inputs){
        const painted=[];
        const ctx={fillText:value=>painted.push(value)};
        const scope={ctx,rctx:ctx,x:0,y:0,[fixture.variable]:input,worldNarrative};
        runInNewContext(calls[0],scope);
        assert.deepEqual(painted,[identityMode?anonymousNarrative(input):input],`${fixture.file}: ${search} ${input}`);
        if(identityMode){
          assert.notEqual(painted[0],input,`sensitive texture text must change: ${fixture.file}`);
          const leaked=[];
          const leakyCtx={fillText:value=>leaked.push(value)};
          runInNewContext(calls[0],{...scope,ctx:leakyCtx,rctx:leakyCtx,worldNarrative:value=>value});
          assert.throws(()=>assert.deepEqual(leaked,painted),assert.AssertionError,`privacy bypass must fail: ${fixture.file}`);
        }
      }
    }
    for(const cctv of [false,true]){
      const labels=[];let drawingCalls=0;
      const ctx=new Proxy({canvas:{width:1800},fillText:text=>labels.push(text)},{get(target,key){return key in target?target[key]:()=>{drawingCalls+=1;};}});
      drawCharacterStrip(ctx,privateNames,{labels:true,cctv});
      assert.ok(drawingCalls>0,'portrait rendering must still draw figures');
      assert.deepEqual(labels,identityMode?[]:privateNames,`portrait labels: ${search}, cctv=${cctv}`);
    }
  }
}finally{
  if(originalWindow)Object.defineProperty(globalThis,'window',originalWindow);
  else delete globalThis.window;
}
console.log('PASS real roster/board/bed-card/8F/skybridge draw calls redact in identity modes, preserve linear text, and reject privacy-bypass controls');
console.log('PASS real CharacterPortrait strips suppress all eight labels in identity modes and preserve linear labels in photo/CCTV rendering');
