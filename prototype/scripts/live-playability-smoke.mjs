import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const url='https://hsushuhao-lab.github.io/Identy-Loop/';
const expected='213c30e27633b8787993b19df0be78950b626aa7';
const sample=process.env.SMOKE_SAMPLE||'A';
const out=`qa-results/live-playability/${sample}`;
await mkdir(out,{recursive:true});
const report={sample,url,expected,started:new Date().toISOString(),method:'Fresh desktop Chromium context; normal public URL; read-only scene observations; actual mouse and keyboard only. No local build, forced seed, localStorage injection, QA query, teleport, game-state write, render-loop interception or direct interaction callback.',checks:[],errors:[],httpErrors:[],requestFailures:[],consoleWarnings:[]};
const save=()=>writeFile(`${out}/result.json`,JSON.stringify(report,null,2));
const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const context=await browser.newContext({viewport:{width:800,height:600},deviceScaleFactor:1});
const page=await context.newPage();
page.setDefaultTimeout(15000);
page.on('pageerror',error=>report.errors.push(error.message));
page.on('response',response=>{if(response.status()>=400)report.httpErrors.push({url:response.url(),status:response.status()});});
page.on('requestfailed',request=>report.requestFailures.push({url:request.url(),failure:request.failure()}));
page.on('console',message=>{if(['warning','error'].includes(message.type()))report.consoleWarnings.push(message.text());});
const log=async(name,data)=>{report.checks.push({name,...data});console.log(name,JSON.stringify(data));await save();};
const snapshot=()=>page.evaluate(()=>{
 const w=window.worldRouter,c=w?.controller;
 const storage=Object.fromEntries(Object.keys(localStorage).map(k=>{try{return[k,JSON.parse(localStorage.getItem(k))];}catch{return[k,localStorage.getItem(k)];}}));
 const showing=[...document.querySelectorAll('.modal-overlay.active,.cutscene-overlay.active,.act-presentation.active')].map(e=>({id:e.id,text:e.innerText.slice(0,2000)}));
 return {zone:w?.activeZoneId,position:c?.position?.toArray(),yaw:c?.yaw,pitch:c?.pitch,enabled:c?.enabled,locked:c?.isLocked,current:c?.currentInteractable,storage,showing,subtitle:document.getElementById('subtitle-box')?.classList.contains('visible')?document.getElementById('subtitle-text').textContent:'',task:document.getElementById('task-panel')?.innerText,loading:document.getElementById('asset-loading-mask')?getComputedStyle(document.getElementById('asset-loading-mask')).display:null,canvas:document.querySelector('#canvas-container canvas')?{width:document.querySelector('#canvas-container canvas').width,height:document.querySelector('#canvas-container canvas').height}:null};
});
async function shot(name){try{await page.screenshot({path:`${out}/${name}.png`,timeout:30000});}catch(e){report.consoleWarnings.push('Screenshot unavailable: '+name+' '+e.message);}}
async function clearDialogue(){
 for(let i=0;i<32;i++){
  const s=await snapshot();
  if(s.showing.some(x=>x.id==='act-presentation'))await page.keyboard.press('Space');
  else if(s.subtitle?.includes('[E]'))await page.keyboard.press('e');
  else if(s.enabled&&!s.showing.length)return true;
  else if(s.showing.length)return false;
  await page.waitForTimeout(350);
 }
 return (await snapshot()).enabled;
}
let mouse={x:400,y:300};
async function lock(){
 const s=await snapshot();
 if(!s.locked){await page.locator('#canvas-container canvas').click({position:{x:400,y:300},timeout:8000});mouse={x:400,y:300};await page.waitForTimeout(200);}
 return (await snapshot()).locked;
}
async function aim(point){
 if(!await lock())return false;
 for(let i=0;i<6;i++){
  const s=await snapshot(),p=s.position;
  const dx=point[0]-p[0],dy=point[1]-p[1],dz=point[2]-p[2];
  const yaw=Math.atan2(-dx,-dz),pitch=Math.atan2(dy,Math.hypot(dx,dz));
  const ya=Math.atan2(Math.sin(yaw-s.yaw),Math.cos(yaw-s.yaw)),pi=pitch-s.pitch;
  if(Math.abs(ya)<.014&&Math.abs(pi)<.014)return true;
  mouse.x-=Math.round(ya/.00105);mouse.y-=Math.round(pi/.00105);
  await page.mouse.move(mouse.x,mouse.y,{steps:3});await page.waitForTimeout(150);
 }
 return false;
}
async function candidates(types){
 return page.evaluate(types=>{
  const w=window.worldRouter,c=w.controller,z=w.activeZoneInstance;
  z.zoneGroup.updateMatrixWorld(true);
  const visible=o=>{for(let p=o;p;p=p.parent)if(!p.visible)return false;return true;};
  return z.interactables.filter(o=>o?.isObject3D&&visible(o)&&o.userData?.interactable&&types.includes(o.userData.type)).map(o=>{const p=o.getWorldPosition(c.position.clone());if(o.isGroup&&o.userData.id!=='408C_BED_PLAQUE'&&p.y<.4)p.y=1.1;return{id:o.userData.id,type:o.userData.type,point:p.toArray(),distance:p.distanceTo(c.position)};}).sort((a,b)=>a.distance-b.distance).slice(0,12);
 },types);
}
// Plan collision-supported short walking paths by observing geometry. Only WASD
// moves the player; no transform, controller method or story flag is assigned.
async function pathTo(target){
 return page.evaluate(point=>{
  const c=window.worldRouter.controller,origin=c.position.clone(),size=.65;
  const key=(x,z)=>`${x},${z}`,queue=[[0,0]],parent=new Map([[key(0,0),null]]),valid=new Map();let head=0,end=null;
  const goal=(x,z)=>Math.hypot(origin.x+x*size-point[0],origin.z+z*size-point[2])<2.4;
  while(head<queue.length&&head<7000){
   const [x,z]=queue[head++];if(goal(x,z)){end=[x,z];break;}
   for(const [a,b] of [[1,0],[-1,0],[0,1],[0,-1]]){
    const nx=x+a,nz=z+b,k=key(nx,nz);if(parent.has(k)||Math.abs(nx)>70||Math.abs(nz)>70)continue;
    const wx=origin.x+nx*size,wz=origin.z+nz*size;
    if(!valid.has(k))valid.set(k,c.supportedHeight(wx,wz)!==null&&!c.checkCollision(wx,wz));
    if(!valid.get(k))continue;
    // Midpoint prevents a coarse grid from hopping a thin collision barrier.
    if(c.checkCollision(origin.x+(x+nx)*size/2,origin.z+(z+nz)*size/2))continue;
    parent.set(k,[x,z]);queue.push([nx,nz]);
   }
  }
  if(!end)return null;
  const points=[];while(end){points.push([origin.x+end[0]*size,origin.y,origin.z+end[1]*size]);end=parent.get(key(...end));}
  return points.reverse();
 },target.point);
}
async function walk(path){
 if(!path||path.length>70)return false;
 // Compress straight grid runs; the inputs still pass through normal collision.
 const points=path.filter((p,i)=>i===0||i===path.length-1||((p[0]-path[i-1][0])*(path[i+1][2]-p[2])-(p[2]-path[i-1][2])*(path[i+1][0]-p[0]))!==0);
 const end=Date.now()+80000;
 for(const p of points.slice(1)){
  for(let i=0;i<45;i++){
   const s=await snapshot();if(!s.enabled||s.showing.length||Date.now()>end)return false;
   const dx=p[0]-s.position[0],dz=p[2]-s.position[2],dist=Math.hypot(dx,dz);if(dist<.38)break;
   const f=-Math.sin(s.yaw)*dx-Math.cos(s.yaw)*dz,r=Math.cos(s.yaw)*dx-Math.sin(s.yaw)*dz;
   const key=Math.abs(f)>=Math.abs(r)?(f>0?'w':'s'):(r>0?'d':'a');
   await page.keyboard.down(key);await page.waitForTimeout(Math.min(230,Math.max(45,dist*90)));await page.keyboard.up(key);await page.waitForTimeout(110);
  }
 }
 return true;
}
try{
 const fingerprintResponse=await context.request.get(url+'build-info.json',{timeout:30000});
 report.fingerprint={status:fingerprintResponse.status(),data:await fingerprintResponse.json()};
 assert.equal(report.fingerprint.data.commit,expected);
 await log('public_build_fingerprint',{pass:true,commit:expected});
 const t=Date.now();const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
 await log('public_homepage',{status:response.status(),finalUrl:page.url(),title:await page.title()});assert.equal(response.status(),200);
 await page.waitForFunction(()=>window.worldRouter?.activeZoneInstance&&document.querySelector('#canvas-container canvas'),{},{timeout:90000});
 await page.waitForTimeout(1000);await shot('01-opening');
 await clearDialogue();
 await page.waitForFunction(()=>window.worldRouter?.controller.enabled,{},{timeout:60000});
 await page.waitForTimeout(600);
 const initial=await snapshot();await log('normal_start',{pass:initial.enabled,elapsedMs:Date.now()-t,state:initial});assert.ok(initial.enabled);
 assert.ok(!await page.evaluate(()=>Boolean(window.__storyQA)),'normal URL must not enable QA');
 await lock();
 const before=await snapshot();let moved=0;
 for(const key of ['w','a','d','s']){
  await page.keyboard.down(key);await page.waitForTimeout(900);await page.keyboard.up(key);await page.waitForTimeout(200);
  const after=await snapshot();moved=Math.hypot(after.position[0]-before.position[0],after.position[2]-before.position[2]);if(moved>.25)break;
 }
 await log('keyboard_walk',{pass:moved>.25,displacement:moved,before:before.position,after:(await snapshot()).position,pointerLocked:(await snapshot()).locked});
 await shot('02-walking');
 const items=await candidates(['identity_photo','identity_floor_photo','era_poster','memory_evidence','office_316_door','spare_key_316','identity_nurse_station_4f','story_phone']);
 await log('nearby_interaction_candidates',{items});
 let read=false;
 for(const item of items.slice(0,5)){
  if(item.distance>4)await walk(await pathTo(item));
  await aim(item.point);await page.waitForTimeout(700);
  const s=await snapshot();if(s.current?.id!==item.id)continue;
  await page.keyboard.press('e');await page.waitForTimeout(700);
  const after=await snapshot();
  read=Boolean(after.showing.length||after.subtitle!==s.subtitle||after.task!==s.task);
  await log('real_E_interaction',{pass:read,target:item.id,before:s,after});await shot('03-interaction');
  if(read){await page.keyboard.press('Escape');await clearDialogue();break;}
 }
 if(!read)await log('real_E_interaction',{pass:false,note:'No accepted interaction reached by input in this bounded smoke run; see candidates/state.'});
 const elevators=await candidates(['elevator']);
 let travel=false;
 for(const elevator of elevators.slice(0,1)){
  const path=await pathTo(elevator);await log('elevator_walk_plan',{target:elevator,path});
  if(!await walk(path))continue;
  await aim(elevator.point);await page.waitForTimeout(650);let s=await snapshot();if(s.current?.type!=='elevator')continue;
  await page.keyboard.press('e');await page.waitForTimeout(800);const menu=await snapshot();
  const buttons=await page.locator('#elevator-cutscene button').evaluateAll(nodes=>nodes.map(n=>({text:n.textContent,disabled:n.disabled,visible:n.getClientRects().length>0})));
  await log('elevator_menu',{state:menu,buttons});await shot('04-elevator-menu');
  const choice=page.locator('#elevator-cutscene button').filter({hasText:/1F|2F|3F|4F|8F/});
  for(let i=0;i<await choice.count();i++){
   const b=choice.nth(i);if(!await b.isVisible()||!await b.isEnabled())continue;
   const label=await b.innerText(),from=menu.zone,at=Date.now();await b.click();
   try{await page.waitForFunction(from=>window.worldRouter.activeZoneId!==from,from,{timeout:60000});await page.waitForFunction(()=>window.worldRouter.controller.enabled,{},{timeout:60000});travel=true;}catch(e){report.consoleWarnings.push('Travel observation: '+e.message);}
   await log('floor_transition',{pass:travel,from,to:(await snapshot()).zone,label,elapsedMs:Date.now()-at,state:await snapshot()});await shot('05-after-travel');break;
  }
 }
 if(!travel)await log('floor_transition',{pass:null,note:'Not established by this bounded natural-start smoke; initial access gates or no reachable menu may apply.'});
 await page.keyboard.press('Escape');await clearDialogue();
 const preReload=await snapshot();
 await page.reload({waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>window.worldRouter?.activeZoneInstance,{},{timeout:90000});await clearDialogue();
 const postReload=await snapshot();
 const identitySave=s=>Object.values(s.storage).find(v=>v&&typeof v==='object'&&(v.runSave||v.currentIdentity));
 await log('reload',{pass:postReload.enabled,before:preReload,after:postReload,saveBefore:identitySave(preReload),saveAfter:identitySave(postReload)});
 await shot('06-reloaded');
 report.summary={http200:true,fingerprintMatch:true,normalStart:initial.enabled,movement:moved>.25,realEInteraction:read,floorTransition:travel,reload:postReload.enabled,pageErrors:report.errors.length,httpErrors:report.httpErrors.length};
 report.verdict=initial.enabled&&moved>.25&&read&&postReload.enabled?'BASIC_PLAYABILITY_PASS':'PARTIAL_CHECK_REQUIRED';
}catch(error){report.verdict='SMOKE_BLOCKED';report.failure=error.stack;try{report.failureState=await snapshot();await shot('failure');}catch{}console.error(error);}
finally{report.finished=new Date().toISOString();await save();console.log('LIVE_SMOKE_RESULT '+JSON.stringify({sample,verdict:report.verdict,summary:report.summary,failure:report.failure}));await browser.close();}
