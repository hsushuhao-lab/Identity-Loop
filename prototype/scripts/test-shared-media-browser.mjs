import {chromium} from 'playwright';
import {preview} from 'vite';
import {readFile,readdir,mkdir,writeFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const out=process.argv[2]||'qa-results/shared-media/browser';await mkdir(out,{recursive:true});
const assets=await readdir('dist/assets');const bundle=await readFile('dist/assets/'+assets.find(n=>/^index-.*\.js$/.test(n)),'utf8');
const mainName=bundle.match(/function (\w+)\(\)\{requestAnimationFrame\(\1\)/)?.[1];assert(mainName,'identify main render loop in tested build');
const report={method:'Production build, four seeded scene fixtures; actual E-key + geometry-ray checks and exhaustive reader pages. Render sampled on demand. Not a full route walkthrough.',routes:[],errors:[],warnings:[]};
const server=await preview({root:fileURLToPath(new URL('..',import.meta.url)),preview:{host:'127.0.0.1',port:4177,strictPort:true}});
const browser=await chromium.launch({headless:true,...(existsSync('/usr/bin/chromium')?{executablePath:'/usr/bin/chromium'}:{}),args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const forbidden=/張守恆|李承禮|周啟文|陳柏勳|林婉真|王世榮|謝玉琴|劉志遠|守恆|[張李周陳]醫師|(?:MED|NUR|SEC|ENG|ADM)-\d|LI_CHENG_LI|可能是真線索|體制性誤導|TRUE_CLUE|FALSE_CLUE/;
try{
 for(const identity of process.env.MEDIA_ROUTE?[process.env.MEDIA_ROUTE]:['LI','ZHOU','ZHANG','CHEN']){
  const page=await browser.newPage({viewport:{width:1280,height:860}});
  page.on('pageerror',e=>report.errors.push(`${identity}: ${e.message}`));page.on('response',r=>{if(r.status()>=400)report.errors.push(`${r.status()} ${r.url()}`);});
  page.on('console',m=>{if(m.type()==='warning'||m.type()==='error')report.warnings.push(m.text());});
  await page.addInitScript(name=>{const raf=requestAnimationFrame.bind(window);window.requestAnimationFrame=fn=>{if(fn.name===name){window.__mediaFrame=fn;return 0;}return raf(fn);};window.__mediaText=new Set();const draw=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(t,...a){window.__mediaText.add(String(t));return draw.call(this,t,...a);};},mainName);
  await page.goto(`http://127.0.0.1:4177/?qa=story&identity=${identity}`,{waitUntil:'load'});
  await page.waitForFunction(()=>window.__storyQA?.identityRouteDirector&&!window.__storyQA.identityRouteDirector.busy,{},{timeout:60000});
  const route={identity,zones:[],reads:[]};report.routes.push(route);
  for(const zone of ['second_campus_2f','second_campus_1f','first_campus_3f','first_campus_4f','first_campus_2f','first_campus_1f','first_campus_8f','second_campus_5f','skybridge','phantom_6f','b2_archive','b1_dispatch_hub','second_campus_4f_story']){
   await page.evaluate(zone=>{const q=window.__storyQA,u=q.uiManager;u.closeAllTransientOverlays();u.dialogueSequence=null;q.identityRouteDirector.busy=true;q.identityRouteDirector.step='M1';q.identityRouteDirector.beatIndex=0;q.load(zone);q.controller.enabled=false;},zone);
   await page.waitForTimeout(300);
   await page.waitForFunction(()=>{const z=window.__storyQA.worldRouter.activeZoneInstance;return z.interactables.filter(o=>o.userData?.type==='identity_floor_photo').every(o=>o.material.map?.image?.width>0);},{},{timeout:15000});
   const data=await page.evaluate(()=>{
    const q=window.__storyQA,z=q.worldRouter.activeZoneInstance,c=q.controller;z.zoneGroup.updateMatrixWorld(true);
    const visible=o=>{for(let p=o;p;p=p.parent)if(!p.visible)return false;return true;};
    const media=z.interactables.filter(o=>['era_poster','memory_evidence','identity_floor_photo','identity_photo'].includes(o.userData?.type)||['SECOND_GUARD_PHOTO_ALBUM','ARCHIVE_HISTORY_PHOTO_WALL'].includes(o.userData?.id));window.__mediaObjects=media;
    return media.map(o=>{
     const center=o.getWorldPosition(c.camera.position.clone()),normal=center.clone().set(0,0,1).transformDirection(o.matrixWorld);
     const tangent=center.clone().set(1,0,0).transformDirection(o.matrixWorld);
     const eye=center.clone().addScaledVector(normal,1.5);eye.y=1.7;
     if(o.userData.id==='SECOND_GUARD_PHOTO_ALBUM')eye.set(center.x,1.7,center.z+1.2);
     // Find a physically supported standing point, including the real 0.35 m body radius.
     const standable=p=>{c.teleport(p.x,1.7,p.z,0);return !c.checkCollision(p.x,p.z)&&c.supportedHeight(p.x,p.z)!==null;};
     if(!standable(eye)){
       let found=false;
       for(const distance of [1.1,2.1,2.8,3.4]){for(const lateral of [0,-.8,.8,-1.4,1.4]){
         const candidate=center.clone().addScaledVector(normal,distance).addScaledVector(tangent,lateral);candidate.y=1.7;
         if(candidate.distanceTo(center)<4.25&&standable(candidate)){eye.copy(candidate);found=true;break;}
       }if(found)break;}
     }
     const blocked=!standable(eye);
     const param=o.geometry?.parameters||{},w=param.width||.2,h=param.height||.2;
     const ray=new c.raycaster.constructor(),samples=[];
     for(const [u,v] of [[0,0],[-.34,-.34],[.34,-.34],[-.34,.34],[.34,.34]]){
      const target=center.clone().set(u*w,v*h,0).applyMatrix4(o.matrixWorld);if(o.userData.id==='SECOND_GUARD_PHOTO_ALBUM')target.copy(center).add(center.clone().set(0,.03,0));
      const distance=target.distanceTo(eye);ray.set(eye,target.clone().sub(eye).normalize());ray.near=.01;ray.far=distance+.01;
      const hits=ray.intersectObject(z.zoneGroup,true).filter(h=>{const m=h.object.material;return visible(h.object)&&m&&(Array.isArray(m)?m:[m]).some(m=>m.visible!==false&&(!m.transparent||m.opacity>=.85));});
      const first=hits[0];let self=false;for(let p=first?.object;p;p=p.parent)if(p===o)self=true;
      c.teleport(...eye.toArray(),0);const pick=q.lookAt(target.toArray());
      samples.push({clear:!first||self||first.distance>=distance-.001,pick:pick.current,first:first?{name:first.object.name,position:first.object.getWorldPosition(center.clone()).toArray(),distance:first.distance}:null});
     }
     return {id:o.userData.id,type:o.userData.type,position:center.toArray(),eye:eye.toArray(),blocked,samples,width:w,height:h};
    });
   });route.zones.push({zone,media:data});
   console.log(identity,zone,data.length);
   await writeFile(`${out}/result.json`,JSON.stringify(report,null,2));
   for(const m of data){
    await page.evaluate(()=>{const q=window.__storyQA;const u=q.uiManager;if(u.memorySequence)u.closeMemorySequence(false);u.closeAllTransientOverlays();u.dialogueSequence=null;window.__mediaText.clear();q.controller.enabled=true;});
    const before=await page.evaluate(()=>({flags:[...window.__storyQA.gameState.flags],run:JSON.stringify(window.__storyQA.identityManager.snapshot())}));
    // E-key from the authored surface for unobstructed targets; no clicks through walls.
    const pick=await page.evaluate(m=>{const q=window.__storyQA;q.controller.teleport(...m.eye,0);return q.lookAt(m.position).current;},m);
    const canE=pick===m.id&&!m.blocked&&m.samples.every(s=>s.clear&&s.pick===m.id);
    assert.equal(canE,true,`${identity}/${zone}/${m.id}: every shared surface needs an unobstructed five-point E-key approach`);
    if(canE)await page.keyboard.press('KeyE');
    else await page.evaluate(id=>{const q=window.__storyQA;return q.controller.onInteract(window.__mediaObjects.find(o=>o.userData.id===id).userData);},m.id);
    const kind=await page.evaluate(()=>window.__storyQA.uiManager.memorySequence?'memory':document.getElementById('poster-modal')?.classList.contains('active')?'poster':'none');
    const read={zone,id:m.id,via:canE?'E_KEY':'HANDLER_ONLY',kind,frames:[]};route.reads.push(read);
    assert.notEqual(kind,'none',`${identity}/${zone}/${m.id} must respond outside its mainline binding`);
    if(kind==='memory'){
     await page.waitForFunction(()=>document.getElementById('memory-frame-canvas').dataset.mediaLoaded==='true',{},{timeout:15000});
     const count=await page.evaluate(()=>window.__storyQA.uiManager.memoryPresentation.frames.length);
     for(let i=0;i<count;i++){
      if(i)await page.locator('#btn-memory-next').click();
      await page.waitForFunction(()=>document.getElementById('memory-frame-canvas').dataset.mediaLoaded==='true',{},{timeout:15000});
      const frame=await page.evaluate(()=>({text:document.getElementById('memory-modal').innerText,canvas:[...window.__mediaText].join('\n'),photo:document.getElementById('memory-frame-canvas').dataset.mediaPhoto,style:document.getElementById('memory-frame-canvas').dataset.mediaStyle,loaded:document.getElementById('memory-frame-canvas').dataset.mediaLoaded}));
      assert.doesNotMatch(frame.text+'\n'+frame.canvas,forbidden);assert.equal(frame.style,'photographic');assert.equal(frame.loaded,'true');read.frames.push(frame);
      if(identity==='LI'&&((m.id==='MEMORY_M2_DUTYROOM_ALBUM'&&i===2)||(m.id==='SECOND_GUARD_PHOTO_ALBUM'&&i===1)))await page.locator('#memory-modal').screenshot({path:`${out}/${identity}-${m.id}-${i}.png`});
     }
    }else{
     const text=await page.locator('#poster-modal').innerText();assert.doesNotMatch(text,forbidden);read.text=text;
    }
    const after=await page.evaluate(()=>({flags:[...window.__storyQA.gameState.flags],run:JSON.stringify(window.__storyQA.identityManager.snapshot())}));
    // Required photo-wall mainline flags are exercised in their own fixture, not here.
    assert.deepEqual(after,before,`${m.id}: optional read must not grant plot flags or advance seed`);
    await page.evaluate(()=>{const q=window.__storyQA,u=q.uiManager;if(u.memorySequence)u.closeMemorySequence(false);u.closeAllTransientOverlays();q.controller.enabled=false;});
   }
   if(identity==='LI'&&['second_campus_2f','first_campus_3f','second_campus_5f'].includes(zone)){
    const photo=data.find(m=>m.type==='identity_floor_photo');
    await page.evaluate(m=>{const q=window.__storyQA;q.controller.teleport(...m.eye,0);q.lookAt(m.position);q.uiManager.subtitleEl.style.display='none';window.__mediaFrame?.();},photo);
    await page.screenshot({path:`${out}/${zone}-mount.png`,timeout:20000});
   }
   await writeFile(`${out}/result.json`,JSON.stringify(report,null,2));
  }
  // Narrow-viewport pagination on the production UI; no responsive mock markup.
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>{const q=window.__storyQA;q.load('second_campus_1f');q.identityRouteDirector.busy=true;q.identityRouteDirector.step='M1';q.uiManager.closeAllTransientOverlays();const o=q.worldRouter.activeZoneInstance.interactables.find(o=>o.userData.id==='SECOND_GUARD_PHOTO_ALBUM');q.controller.onInteract(o.userData);});
  await page.waitForFunction(()=>document.getElementById('memory-frame-canvas').dataset.mediaLoaded==='true');
  for(let i=0;i<3;i++){
    if(i)await page.locator('#btn-memory-next').click();
    await page.waitForFunction(()=>document.getElementById('memory-frame-canvas').dataset.mediaLoaded==='true');
    assert.doesNotMatch(await page.locator('#memory-modal').innerText(),forbidden);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'mobile no horizontal overflow');
  }
  await page.locator('#memory-modal').screenshot({path:`${out}/${identity}-mobile-album.png`});
  route.mobile='PASS';
  if(identity==='ZHANG'){
    // Exercise the authorized onRead gate, not just the optional-exploration path.
    for(const [zone,id,step,flag] of [['second_campus_1f','SECOND_GUARD_PHOTO_ALBUM','ZHANG_SECOND_CAMPUS_SECURITY','ZHANG_GUARD_ALBUM_REVIEWED'],['first_campus_3f','ARCHIVE_HISTORY_PHOTO_WALL','ZHANG_3F_ARCHIVE','ARCHIVE_HISTORY_WALL_REVIEWED']]){
      await page.evaluate(({zone,id,step,flag})=>{const q=window.__storyQA,u=q.uiManager;if(u.memorySequence)u.closeMemorySequence(false);q.load(zone);q.identityRouteDirector.busy=true;q.identityRouteDirector.step='M1';q.identityManager.runSave.currentRouteStep=q.identityManager.route.indexOf(step);q.gameState.setFlag(flag,false);u.closeAllTransientOverlays();const obj=q.worldRouter.activeZoneInstance.interactables.find(o=>o.userData.id===id);q.controller.onInteract(obj.userData);},{zone,id,step,flag});
      await page.waitForFunction(()=>document.getElementById('memory-frame-canvas').dataset.mediaLoaded==='true');
      assert.equal(await page.evaluate(flag=>window.__storyQA.gameState.getFlag(flag),flag),false,'opening alone does not complete an album');
      const count=await page.evaluate(()=>window.__storyQA.uiManager.memoryPresentation.frames.length);
      for(let i=1;i<count;i++){await page.locator('#btn-memory-next').click();await page.waitForFunction(()=>document.getElementById('memory-frame-canvas').dataset.mediaLoaded==='true');}
      assert.equal(await page.evaluate(flag=>window.__storyQA.gameState.getFlag(flag),flag),true,'all loaded pages unlock only the matching required read');
      assert.equal(await page.evaluate(()=>window.__storyQA.identityManager.currentRouteStep),step,'reading does not skip the active route step');
    }
    route.requiredReads='PASS';
  }
  // The historical roster is a late source, not an early optional identity answer.
  await page.evaluate(()=>{const q=window.__storyQA,u=q.uiManager;if(u.memorySequence)u.closeMemorySequence(false);q.load('first_campus_3f');q.identityRouteDirector.busy=true;q.identityRouteDirector.step='M1';q.identityManager.runSave.currentRouteStep=q.identityManager.route.indexOf('M1');const obj=q.worldRouter.activeZoneInstance.interactables.find(o=>o.userData.id==='ARCHIVE_PERSONNEL_1998');window.__rosterData=obj.userData;u.openArchiveDocument({title:obj.userData.documentTitle,pages:obj.userData.pages});});
  assert.doesNotMatch(await page.locator('#archive-document-page').innerText(),forbidden);
  assert.equal(await page.evaluate(()=>window.__storyQA.uiManager.archivePages.length),1);
  await page.evaluate(identity=>{const q=window.__storyQA,step=({LI:'LI_3F_EVIDENCE',ZHANG:'ZHANG_3F_ARCHIVE',ZHOU:'M8',CHEN:'CHEN_M8_DISPATCH'})[identity];q.identityManager.runSave.currentRouteStep=q.identityManager.route.indexOf(step);q.uiManager.openArchiveDocument({title:window.__rosterData.documentTitle,pages:window.__rosterData.pages});},identity);
  assert.equal(await page.evaluate(()=>window.__storyQA.uiManager.archivePages.length),7,'late canonical candidates must remain available');
  route.rosterGate='PASS';
  await page.close();
 }
 assert.deepEqual(report.errors,[]);report.verdict='PASS';
}catch(e){report.verdict='FAIL';report.failure=e.stack;console.error(e);process.exitCode=1;}
finally{await writeFile(`${out}/result.json`,JSON.stringify(report,null,2));await browser.close();await new Promise(r=>server.httpServer.close(r));console.log(report.verdict);}
