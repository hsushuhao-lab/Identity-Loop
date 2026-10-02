// Local playable art fixture. Independent localhost server; production source,
// story/identity maps, save format, and owner's worktree are untouched.
// node scripts/preview-annie-asset.mjs [--smoke]
import {createServer} from 'vite';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import assert from 'node:assert/strict';
const root=fileURLToPath(new URL('..',import.meta.url));
const script=`
import * as api from '/src/art/AnnieAsset.js';
window.__annieAssetPreview={status:'loading',api};
async function install(){
 while(!window.__storyQA?.identityRouteDirector||window.__storyQA.identityRouteDirector.busy)await new Promise(r=>setTimeout(r,100));
 const q=window.__storyQA;
 await api.preloadAnnieAsset();await q.prefetch({zoneId:'second_campus_5f'});q.load('second_campus_5f');
 const zone=q.worldRouter.activeZoneInstance,old=zone.zoneGroup.getObjectByName('Second5F_StorageAnnie');
 const actor=api.createAnnieAsset(zone.zoneGroup,{state:old.userData.state,position:old.position.toArray(),rotationY:old.rotation.y});await actor.userData.ready;
 old.traverse(o=>{if(o.isMesh)o.visible=false;});
 q.uiManager.closeAllTransientOverlays();q.uiManager.dialogueSequence=null;q.identityRouteDirector.removeInteractionTarget();q.controller.enabled=true;
 q.controller.teleport(63,1.25,1.65);q.lookAt([61,.95,1]);
 window.__annieAssetPreview={status:'ready',api,actor,stats:api.inspectAnnieAsset(actor)};
}install().catch(error=>{window.__annieAssetPreview={status:'failed',error:error.message};console.error(error);});
`;
const server=await createServer({root,plugins:[{name:'optional-annie-playable-fixture',transformIndexHtml:{order:'pre',handler(html){return html.replace('</head>',`<script type="module">${script}</script></head>`);}}}],server:{host:'127.0.0.1',port:4238,strictPort:true}});
await server.listen();
console.log('Optional Annie playable fixture: http://127.0.0.1:4238/?qa=story&identity=LI');
console.log('WASD / touch controls are active. Existing 5F interaction and practical remain. Ctrl+C closes local preview.');
if(process.argv.includes('--smoke')){
 const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage({viewport:{width:800,height:700}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4238/?qa=story&identity=LI');
  await page.waitForFunction(()=>window.__annieAssetPreview?.status==='ready',null,{timeout:120000});
  const check=await page.evaluate(()=>{const p=window.__annieAssetPreview,q=window.__storyQA;return {actor:p.stats,enabled:q.controller.enabled,existingInteraction:q.worldRouter.activeZoneInstance.interactables.some(o=>o.userData.id==='SECOND_5F_STORAGE_ANNIE'),attached:!!p.actor.parent};});
  assert(check.enabled&&check.existingInteraction&&check.attached);assert.equal(check.actor.bones,53);assert.deepEqual(errors,[]);
  console.log('PASS local playable fixture',JSON.stringify(check));
 }finally{await browser.close();await server.close();}
}
