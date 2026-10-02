import * as THREE from 'three';
import {solid} from './ArtDetails.js';
import {attachLabel} from './HospitalAtmosphere.js';

// The independent folder occupies the back of the existing equipment shelf.
// No new collision, room, access gate or story target is introduced.
export function installSignalLedgerProps(zone) {
  const m=zone.gf.materials,root=new THREE.Group();root.name='SignalLedger_Folder';root.position.set(2.93,.842,-2.54);zone.zoneGroup.add(root);
  root.userData={id:'SIGNAL_LEDGER_FOLDER',interactable:true,type:'hospital_ledger',label:'查看封存通訊資料夾（可隨時放回）'};zone.interactables.push(root);
  solid(root,m.wallBumper,[0,0,0],[.85,.018,.24]);
  for(const [i,id,title] of [[0,'strips','A / B 列印帶'],[1,'carbon','複寫底板'],[2,'calibration','設備校驗卡'],[3,'seal','封存頁']]){
    const paper=new THREE.Group();paper.position.set(-.32+i*.21,.013,0);root.add(paper);
    paper.userData={id:'SIGNAL_LEDGER_'+id.toUpperCase(),point:id,interactable:true,type:'hospital_ledger',label:'調查封存夾：'+title};zone.interactables.push(paper);
    solid(paper,m.bedSheet,[0,0,0],[.19,.007,.19]);attachLabel(paper,[title,'原件保留'],[0,.0045,0],[.18,.17],[-Math.PI/2,0,0]);
  }
  return root;
}
