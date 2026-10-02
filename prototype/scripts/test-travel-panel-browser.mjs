import {chromium} from 'playwright';
import {preview} from 'vite';
import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
const output=process.argv[2]||'../docs/traversal-qa/panels';await mkdir(output,{recursive:true});
const server=await preview({root:fileURLToPath(new URL('..',import.meta.url)),preview:{port:4173,strictPort:true}});
const browser=await chromium.launch({channel:'chrome',headless:true});const errors=[],panels=[];
try{
 const page=await browser.newPage({viewport:{width:960,height:720}});page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:4173/?mode=linear');await page.waitForFunction(()=>window.worldRouter?.activeZoneInstance);
 const zones=await page.evaluate(()=>Object.keys(window.worldRouter.zones).filter(z=>z!=='second_campus_std'));
 for(const zone of zones){
  const ids=await page.evaluate(zone=>{const r=window.worldRouter;r.loadZone(zone);return r.activeZoneInstance.interactables.filter(o=>o.userData?.type==='travel_selector').map(o=>o.userData.id);},zone);
  for(const id of ids){
   await page.evaluate(id=>{const r=window.worldRouter,c=r.controller,button=r.activeZoneInstance.interactables.find(o=>o.userData?.id===id),root=button.parent;const front=root.localToWorld(c.position.clone().set(.45,.35,1.6));c.teleport(front.x,front.y,front.z);const target=button.getWorldPosition(c.position.clone()),d=target.sub(c.camera.position);c.yaw=Math.atan2(-d.x,-d.z);c.pitch=Math.atan2(d.y,Math.hypot(d.x,d.z));c.updateCameraRotation();},id);
   await page.waitForFunction(id=>window.worldRouter.controller.currentInteractable?.id===id,id);await page.waitForTimeout(120);await page.screenshot({path:`${output}/${id}.jpg`,type:'jpeg',quality:85});panels.push({zone,id,raycastReachable:true});
  }
 }
 // VerticalCore authors one stair selector on these nine distinct floors.
 // Elevators use type=elevator and are covered by cinematic travel QA.
 const expected=['first_campus_1f','first_campus_2f','first_campus_3f','first_campus_4f','first_campus_8f','second_campus_1f','second_campus_2f','second_campus_4f_story','second_campus_5f'].map(zone=>`${zone}_stairs`).sort();
 assert.deepEqual(panels.map(p=>p.id).sort(),expected);assert.deepEqual(errors,[]);await writeFile(`${output}/result.json`,JSON.stringify({verdict:'PASS',method:'Linear-mode spatial fixture; isolated oblique closeups via QA positioning; continuous movement is tested separately.',panels,errors},null,2));console.log('PANEL BROWSER PASS: 9 authored stair selectors and reachable controls');
}finally{await browser.close();await new Promise(r=>server.httpServer.close(r));}
