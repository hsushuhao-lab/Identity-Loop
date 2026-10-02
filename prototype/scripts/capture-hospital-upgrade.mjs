import {chromium} from 'playwright';
import {preview} from 'vite';
import {mkdir,readFile,readdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const out=process.argv[2]||'../../qa-evidence/hospital-upgrade/before';await mkdir(out,{recursive:true});
const server=await preview({root:fileURLToPath(new URL('..',import.meta.url)),preview:{host:'127.0.0.1',port:4211,strictPort:true}});
const files=await readdir('dist/assets'),js=await readFile('dist/assets/'+files.find(f=>/^index-.*\.js$/.test(f)),'utf8');
const loop=js.match(/function (\w+)\(\)\{requestAnimationFrame\(\1\)/)[1];
const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const report={errors:[],views:[]};
try{
 for(const mobile of [false,true]){
  const context=await browser.newContext({viewport:mobile?{width:844,height:390}:{width:1280,height:800},hasTouch:mobile,isMobile:mobile,deviceScaleFactor:1});
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));
  await page.addInitScript(name=>{const raf=requestAnimationFrame.bind(window);window.requestAnimationFrame=fn=>{if(fn.name===name){window.__captureFrame=fn;return 0;}return raf(fn);};},loop);
  await page.goto('http://127.0.0.1:4211/?qa=story&identity=LI',{timeout:120000});
  await page.waitForFunction(()=>window.__storyQA?.identityRouteDirector&&!window.__storyQA.identityRouteDirector.busy);
  await page.evaluate(async()=>{const q=window.__storyQA,d=q.identityRouteDirector,m=q.identityManager;q.uiManager.closeAllTransientOverlays();q.uiManager.dialogueSequence=null;d.removeInteractionTarget();m.runSave.currentRouteStep=m.route.indexOf('M2');m.runSave.currentMilestone='M2';m.save();await d.loadCurrentStep({forceLoad:true});q.gameState.setGameTime('21:17');q.controller.enabled=true;});
  const views=[{id:'station',position:[2.3,1.7,-.9],target:[2.8,1,-2.4]},{id:'staff',position:[5.65,1.7,-12.3],target:[5.65,1.15,-13.8]},{id:'storage',position:[-10.2,1.7,1],target:[-11.8,1.35,1]}];
  for(const view of views){
   const details=await page.evaluate(async view=>{const q=window.__storyQA;q.controller.teleport(...view.position);q.lookAt(view.target);await new Promise(requestAnimationFrame);q.qualitySettings.lastRender=0;window.__captureFrame();return {supported:q.controller.supportedHeight(view.position[0],view.position[2])!==null,collision:q.controller.checkCollision(view.position[0],view.position[2]),performance:q.qualitySettings.snapshot()};},view);
   const name=`${mobile?'mobile':'desktop'}-${view.id}.png`;await page.screenshot({path:out+'/'+name});report.views.push({...view,...details,file:name});
  }
  await context.close();
 }
}finally{await writeFile(out+'/result.json',JSON.stringify(report,null,2));await browser.close();await new Promise(r=>server.httpServer.close(r));}
console.log('CAPTURE',out,report.errors);
