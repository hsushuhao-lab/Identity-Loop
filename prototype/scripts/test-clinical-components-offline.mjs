// Offline component integration. No network navigation, production-game mocks or QA teleport.
import {build} from 'esbuild';
import {chromium} from 'playwright';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=process.argv[2]||'qa-results/closure/components';await mkdir(out,{recursive:true});
const entry=`import {UIManager} from './src/ui/UIManager.js';
import {HospitalScore} from './src/audio/HospitalScore.js';
import {playElevatorGlimpse} from './src/story/ElevatorGlimpseScene.js';
import {soundManager} from './src/audio/SoundManager.js';
window.components={UIManager,HospitalScore,playElevatorGlimpse,soundManager};`;
const built=await build({stdin:{contents:entry,resolveDir:process.cwd()},bundle:true,format:'iife',write:false,define:{'import.meta.env':'{}'},logLevel:'silent'});
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const page=await browser.newPage({viewport:{width:1280,height:860}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
const report={kind:'OFFLINE_REAL_COMPONENTS_NOT_FULL_GAME',views:[],errors};
try{
 await page.setContent('<!doctype html><meta charset="UTF-8"><style>'+await readFile('style.css','utf8')+'</style>');
 await page.addScriptTag({content:built.outputFiles[0].text});
 for(const width of [1280,390]){
  await page.setViewportSize({width,height:860});
  await page.evaluate(()=>{
   const {UIManager}=window.components;window.componentState={unlocks:0,collected:0,closed:0,flags:{}};
   const state=window.componentState,ui=Object.create(UIManager.prototype);ui.gameState={setFlag:(k,v)=>state.flags[k]=v};ui.onTerminalClose=()=>state.closed++;
   window.componentUI=ui;ui.openChen5042Lockbox({onUnlock:()=>state.unlocks++});
  });
  await page.locator('#chen-5042-code').fill('1111');await page.locator('#chen-5042-submit').click();
  assert.equal(await page.evaluate(()=>window.componentState.unlocks),0);
  await page.locator('#chen-5042-code').fill('5042');
  await page.locator('#chen-5042-submit').click();
  await page.evaluate(()=>document.getElementById('chen-5042-submit').onclick());
  await page.waitForFunction(()=>window.componentState.unlocks===1);
  await page.waitForTimeout(700);assert.equal(await page.evaluate(()=>window.componentState.unlocks),1);
  await page.evaluate(()=>window.componentUI.openChenBadgeInspection({onComplete:()=>window.componentState.collected++}));
  await page.locator('#chen-badge-turn').click();await page.locator('#chen-badge-turn').click();await page.waitForTimeout(200);
  assert.match(await page.locator('#chen-badge-status').innerText(),/背面/);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.screenshot({path:`${out}/badge-${width}.png`});
  const rect=await page.locator('#chen-badge-card').boundingBox();assert(rect.x>=0&&rect.x+rect.width<=width,'card fits viewport');
  await page.evaluate(()=>{const done=document.getElementById('chen-badge-done').onclick;done();done();});
  const state=await page.evaluate(()=>window.componentState);assert.equal(state.collected,1);assert.equal(state.flags.CHEN_GREY_BADGE_COLLECTED,true);report.views.push({width,unlock:'PASS',wrongCode:'PASS',badge:'PASS',doubleSubmit:'PASS',overflow:'PASS'});
 }
 if(!process.env.SKIP_WEBGL_COMPONENT){
 await page.setViewportSize({width:1280,height:860});
 await page.evaluate(()=>{window.glimpseDone=false;window.components.playElevatorGlimpse(document.body).then(()=>window.glimpseDone=true);});
 await page.waitForTimeout(1300);await page.screenshot({path:`${out}/elevator-seam-component.png`});
 await page.waitForFunction(()=>window.glimpseDone);assert.equal(await page.locator('.elevator-glimpse-canvas').count(),0);report.glimpseCleanup='PASS';
 }else report.glimpseCleanup='NOT_RUN_LOCAL_WEBGL_UNAVAILABLE';
 // Render 48s of the actual new composer, then analyse/export PCM for review.
 for(const [identity,mood]of [['LI','threat'],['ZHOU','rest']]){
  const result=await page.evaluate(async ({identity,mood})=>{
   const rate=22050,length=48*rate,ctx=new OfflineAudioContext(2,length,rate),score=new window.components.HospitalScore(ctx,identity,'M2');
   const plans=[];for(let i=0;i<4;i++)plans.push(score.playPhrase(mood,i*12));
   const b=await ctx.startRendering(),pcm=new Int16Array(length*2);let peak=0,total=0;const windows=[];
   for(let i=0;i<length;i++){for(let ch=0;ch<2;ch++){const v=b.getChannelData(ch)[i];peak=Math.max(peak,Math.abs(v));total+=v*v;pcm[2*i+ch]=Math.max(-32767,Math.min(32767,Math.round(v*32767)));}}
   for(let second=0;second<48;second++){let sum=0;for(let i=second*rate;i<(second+1)*rate;i++)sum+=b.getChannelData(0)[i]**2;windows.push(Math.sqrt(sum/rate));}
   let binary='';const bytes=new Uint8Array(pcm.buffer);for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));
   return {rate,peak,rms:Math.sqrt(total/(length*2)),windows,events:plans.map(x=>x.events.length),data:btoa(binary)};
  },{identity,mood});
  const {data,...stats}=result;assert(stats.peak<1&&stats.rms>.001);assert(new Set(stats.windows.map(x=>x.toFixed(5))).size>20,'time-varying music');
  const pcm=Buffer.from(data,'base64'),header=Buffer.alloc(44);header.write('RIFF');header.writeUInt32LE(36+pcm.length,4);header.write('WAVEfmt ',8);header.writeUInt32LE(16,16);header.writeUInt16LE(1,20);header.writeUInt16LE(2,22);header.writeUInt32LE(result.rate,24);header.writeUInt32LE(result.rate*4,28);header.writeUInt16LE(4,32);header.writeUInt16LE(16,34);header.write('data',36);header.writeUInt32LE(pcm.length,40);
  await writeFile(`${out}/score-${identity}-${mood}.wav`,Buffer.concat([header,pcm]));(report.audio??=[]).push({identity,mood,...stats});
 }
 assert.deepEqual(errors,[]);report.verdict='PASS';
}catch(e){report.verdict='FAIL';report.failure=e.stack;process.exitCode=1;console.error(e);}
finally{await writeFile(out+'/result.json',JSON.stringify(report,null,2));await browser.close();console.log(JSON.stringify({...report,audio:report.audio?.map(({windows,...x})=>x)}));}
