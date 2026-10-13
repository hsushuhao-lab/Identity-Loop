import {chromium} from 'playwright';
import {preview} from 'vite';
import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=process.argv[2]||'qa-results/mobile-navigation',supplied=process.argv[3];await mkdir(out,{recursive:true});
const server=supplied?null:await preview({preview:{host:'127.0.0.1',port:4270,strictPort:true}}),base=supplied||'http://127.0.0.1:4270/';
const js=await readFile('dist/assets/'+(await readdir('dist/assets')).find(n=>/^index-.*\.js$/.test(n)),'utf8'),loop=js.match(/function (\w+)\(\)\{requestAnimationFrame\(\1\)/)?.[1];assert(loop);
const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage(),cdp=await context.newCDPSession(page);
const report={source:process.env.GITHUB_SHA||'working-tree',base,method:'Production bundle; native touchscreen/CDP gestures and UI clicks. Authored chapter/standing/camera fixtures, real controller collision steps; rendering sampled. Fullscreen success uses actual Chromium API; unsupported/rejection branches are explicitly mocked. Not physical-device acceptance.',checks:[],errors:[],screenshots:[]};
page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.errors.push(r.status()+' '+r.url());});
await page.addInitScript(name=>{const raf=requestAnimationFrame.bind(window);window.requestAnimationFrame=f=>f.name===name?0:raf(f);},loop);
async function check(name,fn){const details=await fn();report.checks.push({name,status:'PASS',details});await writeFile(out+'/progress.json',JSON.stringify(report,null,2));console.log('MOBILE_NAV_PASS',name);}
async function setup(zone='first_campus_3f',position=[0,1.7,0],look=[5,0,0]){
  await page.evaluate(({zone,position,look})=>{const q=window.__storyQA;q.uiManager.closeAllTransientOverlays();q.uiManager.dialogueSequence=null;q.uiManager.subtitleEl.classList.remove('visible');q.identityRouteDirector.removeInteractionTarget();q.identityRouteDirector.busy=false;q.load(zone);q.controller.teleport(...position);q.controller.enabled=true;q.lookAt(look);q.touchControls.refresh();},{zone,position,look});
}
async function step(count=180){await page.evaluate(count=>{const q=window.__storyQA;for(let i=0;i<count;i++){q.controller.update(1/60);q.worldRouter.update(1/60);}q.touchControls.refresh();},count);}
async function state(){return page.evaluate(()=>{const q=window.__storyQA;return {position:q.controller.position.toArray(),target:q.controller.autoMoveTarget?.toArray()||null,origin:q.controller.autoMoveOrigin,focus:q.controller.autoMoveFocus?.id,zone:q.worldRouter.activeZoneId,hover:q.controller.currentInteractable?.id,run:q.identityManager.snapshot()};});}
async function screen(point){return page.evaluate(point=>{const c=window.__storyQA.controller;c.camera.updateMatrixWorld(true);const p=c.position.clone().set(...point).project(c.camera),r=c.domElement.getBoundingClientRect(),x=r.left+(p.x+1)*r.width/2,y=r.top+(1-p.y)*r.height/2;return{x,y,canvas:document.elementFromPoint(x,y)===c.domElement};},point);}
async function tapWorld(point){const p=await screen(point);assert(p.canvas,`tap must hit actual canvas ${JSON.stringify(p)}`);await page.touchscreen.tap(p.x,p.y);await page.waitForTimeout(80);return p;}
async function touch(type,points){await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points.map(([id,x,y])=>({id,x,y,radiusX:4,radiusY:4,force:1}))});}
async function aimTapObject(id){
  const p=await page.evaluate(id=>{const q=window.__storyQA,o=q.worldRouter.activeZoneInstance.interactables.find(o=>o.userData.id===id);if(!o)throw Error('missing '+id);const target=o.getWorldPosition(q.controller.position.clone());q.lookAt([target.x-.7,target.y,target.z]);return target.toArray();},id);
  const screenPoint=await tapWorld(p);const selected=await state();assert.equal(selected.origin,'touch');assert.equal(selected.focus,id);return screenPoint;
}
async function supportedApproach(id){
  return page.evaluate(id=>{
    const q=window.__storyQA,c=q.controller,o=c.interactables.find(o=>o.userData?.id===id);
    c.navigationRoot.updateMatrixWorld(true);const p=o.getWorldPosition(c.position.clone());
    const visible=o=>{for(let n=o;n;n=n.parent)if(!n.visible)return false;return true;};
    for(const radius of [2.5,3,2,1.8])for(let i=0;i<64;i++){
      const angle=i*Math.PI/32;c.teleport(p.x+radius*Math.cos(angle),1.7,p.z+radius*Math.sin(angle));
      if(c.checkCollision(c.position.x,c.position.z)||c.supportedHeight(c.position.x,c.position.z)===null)continue;
      c.clickRaycaster.set(c.camera.position,p.clone().sub(c.camera.position).normalize());
      const hit=c.clickRaycaster.intersectObject(c.navigationRoot,true).find(h=>{
        if(!visible(h.object))return false;
        for(let n=h.object;n;n=n.parent)if(n.userData?.interactable&&c.interactables.includes(n))return true;
        return(Array.isArray(h.object.material)?h.object.material:[h.object.material]).some(m=>m&&m.visible!==false&&(!m.transparent||m.opacity>.01));
      });
      let own=false;for(let n=hit?.object;n;n=n.parent)if(n===o)own=true;if(!own)continue;
      const d=Math.hypot(hit.point.x-c.position.x,hit.point.z-c.position.z);if(d<1.9)continue;
      const start=c.position.clone();let clear=true;
      for(let travel=.05;travel<d-1.5;travel+=.05){const t=travel/d,x=start.x+(hit.point.x-start.x)*t,z=start.z+(hit.point.z-start.z)*t;if(c.checkCollision(x,z)||c.supportedHeight(x,z)===null){clear=false;break;}}
      if(!clear)continue;
      c.enabled=true;q.lookAt([p.x-.6*Math.sin(angle),p.y,p.z+.6*Math.cos(angle)]);
      return{id,point:p.toArray(),standing:start.toArray()};
    }
    throw Error('No supported unobstructed approach for '+id);
  },id);
}
async function shot(name){await page.evaluate(()=>{const q=window.__storyQA;const now=performance.now();q.qualitySettings.lastRender=now-1000;q.qualitySettings.render(now);});await page.screenshot({path:out+'/'+name+'.png'});report.screenshots.push(name+'.png');}
try{
  await page.goto(base+'?qa=story&identity=LI',{timeout:120000});await page.waitForFunction(()=>window.__storyQA?.identityRouteDirector&&!window.__storyQA.identityRouteDirector.busy,null,{timeout:120000});
  await check('native floor tap moves, retargets, stops and preserves story save',async()=>{
    await setup();const before=await state();await tapWorld([3,0,.7]);assert.equal((await state()).origin,'touch');await step(45);const moving=await state();assert(moving.position[0]>before.position[0]+.5);
    await page.evaluate(()=>window.__storyQA.lookAt([4,0,.7]));await tapWorld([4,0,0]);const redirected=await state();assert(redirected.target);await step(240);const end=await state();assert.equal(end.target,null);assert(Math.hypot(end.position[0]-4,end.position[2])<.6);assert.deepEqual(end.run,before.run);await shot('tap-arrival');return{before:before.position,moving:moving.position,end:end.position};
  });
  await check('cancel button, manual movement and UI clicks stop navigation',async()=>{
    await setup();await tapWorld([3,0,.7]);await page.locator('#touch-cancel-move').tap();assert.equal((await state()).target,null);
    await tapWorld([3,0,.7]);await touch('touchStart',[[1,80,740]]);await touch('touchMove',[[1,80,690]]);assert.equal((await state()).target,null);await touch('touchEnd',[]);
    await tapWorld([3,0,.7]);await page.locator('#touch-objective').tap();assert.equal((await state()).target,null);await page.locator('#touch-objective').tap();return{cancel:true,joystick:true,ui:true};
  });
  await check('look drag, repeated taps and cancelled gestures never leak interaction',async()=>{
    await setup();const before=await page.evaluate(()=>window.__storyQA.controller.yaw);await touch('touchStart',[[1,300,400]]);await touch('touchMove',[[1,335,390]]);await touch('touchEnd',[]);assert.notEqual(await page.evaluate(()=>window.__storyQA.controller.yaw),before);assert.equal((await state()).target,null);
    await setup();await touch('touchStart',[[1,300,600]]);await touch('touchCancel',[]);assert.equal((await state()).target,null);
    await tapWorld([3,0,.7]);await tapWorld([3,0,.7]);assert.equal((await state()).origin,'touch');await step(240);assert.equal((await state()).target,null);return{drag:true,cancelled:true,repeated:true};
  });
  await check('real closed 316 door is approached without opening or crossing',async()=>{
    await setup('first_campus_3f',[2.4,1.7,0],[2.4,1.3,3]);
    const door=await page.evaluate(()=>window.__storyQA.worldRouter.activeZoneInstance.interactables.find(o=>o.userData.type==='office_316_door').userData.id);
    await aimTapObject(door);await step(240);const end=await state();assert.equal(end.zone,'first_campus_3f');assert.equal(end.target,null);
    const actual=await page.evaluate(()=>{const q=window.__storyQA;return{open:q.worldRouter.activeZoneInstance.levelInstance.officeDoorOpen,collision:q.controller.checkCollision(q.controller.position.x,q.controller.position.z)};});assert.equal(actual.open,false);assert.equal(actual.collision,false);return{door,position:end.position,...actual};
  });
  await check('B2 exit target does not auto-interact or leave the one-way archive',async()=>{
    await setup('b2_archive',[2,1.7,-2],[0,1.15,1.18]);const before=await state();await aimTapObject('B2_ONE_WAY_EXIT');await step(240);const end=await state();assert.equal(end.zone,'b2_archive');assert.equal(end.target,null);assert.deepEqual(end.run,before.run);assert(Math.hypot(end.position[0]-before.position[0],end.position[2]-before.position[2])>.5);return{position:end.position,hover:end.hover};
  });
  await check('M9 approach does not open or submit identity choices',async()=>{
    await page.evaluate(async()=>{const q=window.__storyQA,m=q.identityManager,d=q.identityRouteDirector;q.uiManager.closeAllTransientOverlays();q.uiManager.dialogueSequence=null;d.removeInteractionTarget();m.runSave.currentRouteStep=m.route.indexOf('M9');m.runSave.currentMilestone='M9';m.save();d.busy=false;await d.loadCurrentStep({forceLoad:true});q.controller.enabled=true;});
    await page.waitForFunction(()=>!window.__storyQA.identityRouteDirector.busy,null,{timeout:120000});
    const target=await supportedApproach(await page.evaluate(()=>window.__storyQA.identityRouteDirector.boundTarget.object.userData.id));
    const before=await state();await tapWorld(target.point);assert.equal((await state()).focus,target.id);await step(180);const end=await state();assert.deepEqual(end.run,before.run);assert(Math.hypot(end.position[0]-before.position[0],end.position[2]-before.position[2])>.25,JSON.stringify({before:before.position,end:end.position}));assert.equal(end.run.runSave.m9CommittedChoice,null);assert.equal(await page.locator('.identity-selection-form').count(),0);return{id:target.id,position:end.position};
  });
  await check('modal and zone transition clear pending tap destinations',async()=>{
    await setup();await tapWorld([3,0,.7]);await page.evaluate(()=>{const q=window.__storyQA;q.uiManager.showDialogue([{speaker:'操作',text:'暫停移動'}],()=>{});q.touchControls.refresh();});assert.equal((await state()).target,null);
    await setup();await tapWorld([3,0,.7]);await page.evaluate(()=>window.__storyQA.load('first_campus_4f'));assert.equal((await state()).target,null);return{modal:true,zone:true};
  });
  await check('actual fullscreen enters/exits, survives resize and keeps controls usable',async()=>{
    await setup();await page.locator('#touch-fullscreen').tap();await page.waitForFunction(()=>!!document.fullscreenElement,null,{timeout:10000});assert.equal(await page.locator('#touch-fullscreen').getAttribute('aria-pressed'),'true');
    await cdp.send('Emulation.setDeviceMetricsOverride',{width:844,height:390,deviceScaleFactor:1,mobile:true,screenWidth:844,screenHeight:390,screenOrientation:{type:'landscapePrimary',angle:90}});await page.waitForFunction(()=>innerWidth===844);await shot('fullscreen-landscape');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    await page.locator('#touch-fullscreen').tap();await page.waitForFunction(()=>!document.fullscreenElement);assert.equal(await page.locator('#touch-fullscreen').getAttribute('aria-pressed'),'false');await page.setViewportSize({width:390,height:844});return{entered:true,exited:true,resized:true};
  });
  await check('unsupported/rejected fullscreen and rapid clicks never fake success',async()=>{
    await page.evaluate(()=>{window.__realFullscreen=document.documentElement.requestFullscreen;Object.defineProperty(document.documentElement,'requestFullscreen',{configurable:true,value:undefined});Object.defineProperty(document.documentElement,'webkitRequestFullscreen',{configurable:true,value:undefined});});
    await page.locator('#touch-fullscreen').tap();assert.match(await page.locator('#touch-control-status').innerText(),/不支援/);assert.equal(await page.evaluate(()=>document.fullscreenElement),null);
    await page.evaluate(()=>{Object.defineProperty(document.documentElement,'requestFullscreen',{configurable:true,value:()=>Promise.reject(Error('fixture rejected'))});});await page.locator('#touch-fullscreen').tap();await page.waitForFunction(()=>!document.querySelector('#touch-fullscreen').disabled);assert.match(await page.locator('#touch-control-status').innerText(),/無法啟用/);
    await page.evaluate(()=>{window.__requestCount=0;Object.defineProperty(document.documentElement,'requestFullscreen',{configurable:true,value:()=>{window.__requestCount++;return new Promise(resolve=>window.__resolveFullscreen=resolve);}});});await page.locator('#touch-fullscreen').tap();await page.evaluate(()=>document.getElementById('touch-fullscreen').click());assert.equal(await page.evaluate(()=>window.__requestCount),1);await page.evaluate(()=>window.__resolveFullscreen());await page.waitForFunction(()=>!document.querySelector('#touch-fullscreen').disabled);assert.equal(await page.locator('#touch-fullscreen').getAttribute('aria-pressed'),'false');await page.evaluate(()=>{document.documentElement.requestFullscreen=window.__realFullscreen;});return{unsupported:true,rejected:true,duplicateRequestCount:1};
  });
  await check('portrait fullscreen button has a touch target and does not cover HUD',async()=>{
    await page.evaluate(()=>{document.getElementById('touch-control-status').hidden=true;});const boxes=await page.evaluate(()=>{const b=document.getElementById('touch-fullscreen').getBoundingClientRect(),h=document.getElementById('hospital-hud-bar').getBoundingClientRect();return{button:{x:b.x,y:b.y,w:b.width,h:b.height},hud:{x:h.x,y:h.y,w:h.width,h:h.height},overlap:Math.min(b.right,h.right)>Math.max(b.left,h.left)&&Math.min(b.bottom,h.bottom)>Math.max(b.top,h.top)};});assert(boxes.button.w>=44&&boxes.button.h>=44);assert.equal(boxes.overlap,false);await shot('portrait-controls');return boxes;
  });
  assert.deepEqual(report.errors,[]);report.verdict='PASS';
}catch(error){report.verdict='FAIL';report.failure=error.stack;process.exitCode=1;console.error(error);await page.screenshot({path:out+'/failure.png'}).catch(()=>{});}
finally{await writeFile(out+'/result.json',JSON.stringify(report,null,2));await browser.close();await server?.close();}
console.log('MOBILE_NAVIGATION',report.verdict,report.checks.length);
