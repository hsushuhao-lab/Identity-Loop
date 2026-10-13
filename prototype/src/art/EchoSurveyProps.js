import * as THREE from 'three';
import {solid,asset} from './ArtDetails.js';
import {attachLabel} from './HospitalAtmosphere.js';
import {buildEquipmentAttendant} from './EquipmentAttendant.js';
import {EchoAcoustics} from '../audio/EchoAcoustics.js';

export function installEchoSurveyProps(zone,quest,zoneId,camera){
  if(!quest||!['first_campus_4f','ward_service_annex'].includes(zoneId))return;
  const root=new THREE.Group();root.name='EchoSurvey_Installation';zone.zoneGroup.add(root);
  const m=zone.gf.materials,annex=zoneId==='ward_service_annex',stations=[],audio=new EchoAcoustics();
  const anchor=(id,target,position,yaw=0)=>{const g=new THREE.Group();g.name=id;g.position.set(...position);g.rotation.y=yaw;g.userData={id,target,type:'echo_survey',interactable:true,label:target==='technician'?'與夜間技師交談・借用巡檢器材':target==='overview'?'查看回聲巡檢紀錄（支線）':'使用調頻記錄器・回聲巡檢'};root.add(g);zone.interactables.push(g);return g;};
  const clock=new THREE.Group();clock.name='EchoSurvey_LocalTestClock';root.add(clock);
  clock.position.set(...(annex?[5.80,2.05,4.3]:[3.38,1.22,-2.57]));clock.scale.setScalar(annex?1:.48);if(annex)clock.rotation.y=-Math.PI/2;
  else{solid(root,m.stainless,[3.38,1.02,-2.58],[.035,.30,.04]);solid(root,m.metal,[3.38,.865,-2.58],[.17,.02,.11]);}
  solid(clock,m.metal,[0,0,0],[.52,.52,.035]);
  attachLabel(clock,['檢修回路計時','非院內標準時間'],[0,-.35,.025],[.84,.18]);
  const dial=new THREE.Mesh(new THREE.CircleGeometry(.205,24),m.bedSheet);dial.position.z=.022;clock.add(dial);
  const hand=solid(clock,m.wallDark,[0,.073,.029],[.012,.15,.009]);hand.geometry.translate(0,.073,0);hand.position.y=0;
  for(let i=0;i<12;i++){const tick=solid(clock,m.wallDark,[Math.sin(i*Math.PI/6)*.175,Math.cos(i*Math.PI/6)*.175,.027],[.009,.026,.004]);tick.rotation.z=-i*Math.PI/6;}
  let actor,actorRoot,loanRecorder,loanFilter;
  if(annex){
    asset(root,'workDesk',[-4.8,0,5.7],[.72,.78,.65]);
    zone.colliders.push(new THREE.Box3(new THREE.Vector3(-5.4,0,5.38),new THREE.Vector3(-4.2,.70,6.02)));
    solid(root,m.metal,[-4.9,.66,5.7],[.38,.085,.24]);loanFilter=solid(root,m.stainless,[-4.55,.67,5.7],[.13,.08,.18]);
    loanRecorder=new THREE.Group();loanRecorder.position.set(-4.9,.73,5.7);root.add(loanRecorder);
    solid(loanRecorder,m.metal,[0,0,0],[.10,.036,.17]);solid(loanRecorder,m.lightWarm,[0,.02,-.035],[.05,.004,.04]);
    attachLabel(root,['器材借用 / 可隨時交回','記錄器　　隔離插片'],[-4.8,.72,5.7],[.58,.25],[-Math.PI/2,0,0]);
    attachLabel(root,['回聲巡檢','西室・複寫　東室・接點','北端・風道 / 順序不限'],[-5.78,1.55,5.7],[.9,.54],[0,Math.PI/2,0]);
    actorRoot=anchor('ECHO_TECHNICIAN','technician',[-3.25,0,4.35]);actor=buildEquipmentAttendant(actorRoot);
    actorRoot.traverse(o=>{if(o.isMesh&&/Cotton|Scrub/.test(o.material?.name||''))o.material.color.set(0x847560);});
    attachLabel(actorRoot,['SERVICE','夜間技師'],[0,1.27,-.126],[.18,.13]);
    const palm=actor.elbows[1].children.find(o=>o.isGroup)||actorRoot;
    solid(palm,m.metal,[0,-.070,-.025],[.09,.14,.055]);solid(palm,m.lightWarm,[0,-.060,-.055],[.047,.034,.006]);
    zone.colliders.push(new THREE.Box3(new THREE.Vector3(-3.55,0,4.05),new THREE.Vector3(-2.95,1.85,4.65)));
    for(const [id,pos,yaw,title]of [['paper',[-5.75,1.30,-5.8],Math.PI/2,'西室・複寫回聲'],['relay',[5.75,1.30,-5.8],-Math.PI/2,'東室・接點回聲'],['air',[-1.05,1.15,-8.70],0,'北端・風道回聲']]){
      const g=anchor('ECHO_'+id.toUpperCase(),id,pos,yaw);solid(g,m.wallDark,[0,0,0],[.44,.48,.095]);
      solid(g,m.stainless,[0,0,.055],[.36,.40,.019]);solid(g,m.metal,[0,-.04,.072],[.24,.17,.025]);
      for(let i=0;i<4;i++)solid(g,m.wallDark,[-.065+i*.045,-.04,.089],[.009,.12,.010]);
      attachLabel(g,[title,'隔離測試 / 接上記錄器'],[0,.39,.060],[.74,.22]);
      const ledMaterial=new THREE.MeshStandardMaterial({color:0x597267,emissive:0x234332,emissiveIntensity:.35,roughness:.45});
      const led=solid(g,ledMaterial,[.13,.13,.083],[.037,.025,.014]);
      const plug=solid(g,m.stainless,[.16,-.15,.10],[.047,.09,.035]);plug.name='Echo_IsolationPlug';
      const traces=new THREE.Group();traces.name='EchoResidue_'+id;g.add(traces);
      for(const x of [-.06,.06]){const paper=solid(traces,m.bedSheet,[x,-.18,.10],[.09,.32,.004]);paper.rotation.z=x*.45;}
      const stamp=attachLabel(traces,['回傳關閉','訊號仍留存'],[0,-.18,.11],[.30,.24]);stamp.raycast=()=>{};
      stations.push({id,root:g,led,traces,plug});
    }
  }else{
    const box=anchor('ECHO_RECORDS','overview',[3.35,.865,-2.68]);
    solid(box,m.doorWood,[0,0,0],[.38,.035,.25]);attachLabel(box,['回聲巡檢','儲藏室後方 / 可中止'],[0,.025,0],[.36,.24],[-Math.PI/2,0,0]);
    const receipt=attachLabel(box,['三份聲紋已歸檔','觀察 / 未確認事項分列'],[0,.03,0],[.34,.23],[-Math.PI/2,0,0]);
    stations.push({id:'overview',root:box,receipt});
  }
  const status=[];
  for(let level=0;level<4;level++){const sign=attachLabel(clock,[['回傳關閉','檢修鐘偏移一格','回傳關閉 / 收到訊號','三段訊號 / 回程合流'][level],level?'已留存・可用插片隔離':'巡檢可只錄取'],[0,.41,.028],[1.18,.23]);sign.visible=false;status.push(sign);}
  let elapsed=0,ambientElapsed=0,gestureRemaining=0,manualRemaining=0,index=0;
  const visual={root,stations,actor,clock,hand,audio,camera,
    gesture(){gestureRemaining=1.8;},
    replay(id){const station=stations.find(s=>s.id===id)||stations[0];if(!station||!this.camera)return false;manualRemaining=.8;return audio.play(station.root.getWorldPosition(new THREE.Vector3()),this.camera,Math.max(1,quest.getView().level),id);},
    sync(){const view=quest.getView();hand.rotation.z=-view.level*Math.PI/6;status.forEach((s,i)=>s.visible=i===view.level);if(loanRecorder)loanRecorder.visible=!view.recorder;if(loanFilter)loanFilter.visible=!view.filter;
      for(const s of stations){const data=view.stations.find(p=>p.id===s.id);if(data){s.traces.visible=data.broadcast;s.plug.visible=data.isolated;s.led.material.color.set(data.isolated?0x72968f:data.broadcast?0xc59652:data.recorded?0x81999a:0x597267);s.led.material.emissive.set(data.isolated?0x396961:data.broadcast?0x6b421e:0x234332);}else if(s.receipt)s.receipt.visible=view.filed;}
      root.userData.echoLevel=view.level;root.userData.echoEffectiveLevel=view.effectiveLevel;return view;
    },
    update(delta,camera,{blocked=false,hidden=false}={}){
      this.camera=camera;const dt=Math.max(0,Math.min(delta||0,.1));elapsed+=dt;gestureRemaining=Math.max(0,gestureRemaining-dt);manualRemaining=Math.max(0,manualRemaining-dt);
      actor?.update(dt,{z:actorRoot.position.z,mode:gestureRemaining>0?'inspect':'patrol'},camera.position,{heading:Math.PI});
      const view=this.sync();for(const s of stations)if(s.led)s.led.material.emissiveIntensity=.35+(view.level>=2?.06*Math.sin(elapsed*2.1):0);
      if(hidden||audio.muted()){audio.stop();return;}if(blocked){if(!manualRemaining)audio.stop();return;}
      if(!view.effectiveLevel)return;
      ambientElapsed+=dt;if(ambientElapsed<10)return;ambientElapsed=0;
      const sources=annex?stations.filter(s=>view.stations.find(p=>p.id===s.id)?.broadcast&&s.id!==view.filterAt):view.level>=3?stations:[];
      if(sources.length){const source=sources[index++%sources.length];audio.play(source.root.getWorldPosition(new THREE.Vector3()),camera,view.effectiveLevel,source.id);}
    }
  };
  root.userData.disposeArt=()=>audio.stop();zone.echoSurveyVisual=visual;visual.sync();return visual;
}
