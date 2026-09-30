import * as THREE from 'three';
import {asset,solid} from '../art/ArtDetails.js';
import {getMaterials,materialForSurface} from '../art/MaterialRegistry.js';
import {IDENTITY_PROFILES} from '../core/IdentityManager.js';

const ease=t=>{t=THREE.MathUtils.clamp(t,0,1);return t*t*(3-2*t);};
const shot=(title,line,from,to,look)=>({title,line,from,to,look});
export const ENDING_CODAS=Object.freeze({
  LI:{root:45,notes:[0,1,7,5,3,0],spacing:2.8,partials:[1,2.006,3.97]},
  ZHANG:{root:48,notes:[0,7,3,10,7,0],spacing:3.1,partials:[1,1.003,2]},
  ZHOU:{root:50,notes:[0,6,2,9,7,2],spacing:2.9,partials:[1,2.01,4.08]},
  CHEN:{root:43,notes:[0,5,7,2,5,0],spacing:3.2,partials:[1,2,3]}
});

// Film sets use the same GLB furniture and PBR surfaces as the game; no cast
// names or final images are loaded into the world before the M9 commit.
export function buildIdentityGoodEnding(identity){
  const m=getMaterials(),profile=IDENTITY_PROFILES[identity];
  if(!profile)throw Error('Unknown ending identity');
  const scene=new THREE.Scene();scene.name=`IdentityGoodEnding_${identity}`;scene.background=new THREE.Color(0x111915);
  scene.fog=new THREE.Fog(0x182019,9,20);
  solid(scene,materialForSurface('floorTile',8,7),[0,-.06,0],[8,.1,7]);
  if(identity==='ZHANG'){
    // A real opening, not a door standing in front of an unbroken wall.
    for(const [x,width]of [[-1.45,5.1],[3.15,1.7]])solid(scene,materialForSurface('wall',width,3.3),[x,1.65,-3.4],[width,3.3,.14]);
    solid(scene,materialForSurface('wall',1.2,.7),[1.7,2.95,-3.4],[1.2,.7,.14]);
    solid(scene,new THREE.MeshBasicMaterial({color:0xbecbbe}),[1.7,1.3,-3.52],[1.19,2.58,.02]);
    for(const x of [1.06,2.34])solid(scene,m.metal,[x,1.32,-3.32],[.08,2.64,.09]);
    solid(scene,m.metal,[1.7,2.64,-3.32],[1.36,.08,.09]);
  }else solid(scene,materialForSurface('wall',8,3.3),[0,1.65,-3.4],[8,3.3,.14]);
  for(const x of [-4,4])solid(scene,materialForSurface('wall',7,3.3),[x,1.65,0],[.14,3.3,7]);
  for(const x of [-3.9,3.9])solid(scene,m.wallBumper,[x,.18,0],[.05,.30,7]);
  scene.add(new THREE.HemisphereLight(0xced9d3,0x28231c,1.15));
  const key=new THREE.DirectionalLight(0xe1e5d8,2.2);key.position.set(-2.5,5,4);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-5;key.shadow.camera.right=5;key.shadow.camera.top=5;key.shadow.camera.bottom=-5;scene.add(key);
  const dawn=new THREE.PointLight(0xe7c191,1,10,2);dawn.position.set(2.3,2.8,-1.9);scene.add(dawn);
  const wx=identity==='ZHANG'?3.1:2.4;
  const windowPanel=solid(scene,m.metal,[wx,1.9,-3.28],[1.4,1.6,.06]);windowPanel.name='EndingWindow';
  const windowMat=new THREE.MeshBasicMaterial({color:0x839e93});solid(scene,windowMat,[wx,1.9,-3.23],[1.3,1.5,.025]);
  for(const x of [wx-.6,wx,wx+.6])solid(scene,m.metal,[x,1.9,-3.20],[.025,1.5,.035]);
  function label(lines,pos,size=[.6,.4],flat=false,dark=false){
    const canvas=document.createElement('canvas');canvas.width=768;canvas.height=512;const c=canvas.getContext('2d');
    c.fillStyle=dark?'#0c1a13':'#dedace';c.fillRect(0,0,768,512);
    c.fillStyle=dark?'#a9cfb1':'#28362e';c.font='600 44px "Noto Sans CJK TC","Microsoft JhengHei",sans-serif';
    lines.forEach((s,i)=>c.fillText(s,38,85+i*88,695));
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(...size),new THREE.MeshStandardMaterial({map:texture,roughness:.92,side:THREE.DoubleSide,...(dark?{emissive:0x506d53,emissiveMap:texture,emissiveIntensity:.3}:{})}));
    mesh.position.set(...pos);if(flat)mesh.rotation.x=-Math.PI/2;scene.add(mesh);return mesh;
  }
  function desk(){
    const table=asset(scene,'workDesk',[0,0,0],[1.4,1,1.8]);table.name='EndingDesk';scene.updateMatrixWorld(true);
    return new THREE.Box3().setFromObject(table).max.y;
  }
  function terminal(y){
    solid(scene,m.metal,[.5,y+.16,-.18],[.07,.32,.07]);solid(scene,m.wallDark,[.5,y+.39,-.18],[.79,.50,.14]);
    label(['316 / 最後交班',profile.name,profile.employeeId,'RECORD RESTORED'],[.5,y+.4,-.101],[.72,.44],false,true);
  }
  let shots,animate;
  if(identity==='LI'){
    const y=desk();terminal(y);asset(scene,'officeChair',[.65,0,1.25],[.8,.8,.8],Math.PI);
    const original=label(['原始紀錄','02:17  /  原筆跡保留','異常來源：待查','不覆蓋、不補造'],[-.55,y+.005,.1],[.56,.43],true);original.name='LI_OriginalRecord';
    const amendment=label(['更正說明','李承禮  MED-820316','保留原始命令','另附更正，不抹除'],[.18,y+.006,.36],[.56,.43],true);amendment.name='LI_SeparateAmendment';
    const pen=solid(scene,new THREE.MeshStandardMaterial({color:0x652525,roughness:.4}),[-.52,y+.020,.18],[.019,.019,.29]);pen.name='LI_RedPen';
    solid(scene,m.wallDark,[-.75,y+.18,-.255],[.34,.24,.035]);
    solid(scene,m.metal,[-.75,y+.075,-.27],[.035,.15,.035]);
    solid(scene,m.metal,[-.75,y+.015,-.25],[.20,.03,.14]);
    const clock=label(['02:17','ORIGINAL TIME'],[-.75,y+.18,-.232],[.30,.2]);clock.name='LI_Clock';
    shots=[shot('原筆跡仍在','02:17 的錯誤命令是我下的。',[-1.5,1.55,1.9],[-1.15,1.38,1.45],[-.55,y,.2]),shot('另一張紙','這次，我把更正寫在旁邊，不再把原始紀錄擦掉。',[.1,1.9,1.6],[.2,1.6,1.25],[-.35,y,.2]),shot('THE ORDER','我是李承禮。交班完成，不代表錯誤不曾發生。',[1.4,1.65,2.45],[.9,1.55,2.2],[.2,y+.3,-.1])];
    animate=t=>{pen.position.x=-.52+.92*ease(t/7);pen.rotation.y=-.6*ease(t/7);amendment.position.z=.36-.26*ease((t-8)/7);};
  }else if(identity==='ZHANG'){
    const bed=asset(scene,'hospitalBed',[-.6,0,-.1],[1,1,1]);bed.name='ZHANG_PatientBed';
    const board=solid(scene,m.doorWood,[-.6,1.15,-1.45],[.78,.52,.045]);board.name='ZHANG_HandoverBoard';
    const sheet=label(['床邊交班','親見與轉述分列','未確認事項保留','下一班接收確認'],[-.6,1.16,-1.417],[.72,.46]);sheet.name='ZHANG_BedsideRecord';
    for(const x of [-.95,-.25])solid(scene,m.stainless,[x,.56,-1.47],[.025,1.12,.025]);
    solid(scene,m.metal,[-2.25,1.7,-3.30],[1.36,.86,.04]);
    label(['張守恆','MED-870409','值班責任已交接'],[-2.25,1.7,-3.273],[1.3,.8]);
    const hinge=new THREE.Group();hinge.position.set(1.1,0,-3.36);scene.add(hinge);
    const door=solid(hinge,m.doorWood,[.6,1.3,0],[1.2,2.6,.10]);door.name='ZHANG_OpeningDoor';
    solid(hinge,m.stainless,[1.05,1.1,.08],[.14,.035,.035]);
    const band=label(['姓名已核對','不是無名氏'],[-.95,.94,.33],[.23,.13],true);band.name='ZHANG_NameBand';
    shots=[shot('床邊留下的名字','名字不是可以為了結案而填上的空白。',[-1.9,1.8,1.65],[-1.55,1.55,1.35],[-.65,.9,.05]),shot('有人接手','親見、轉述與尚待確認的事，一項一項交給下一班。',[-1.6,1.65,.6],[-1.05,1.55,.3],[-.6,1.2,-1.42]),shot('THE NAME','我是張守恆。交班不是把病人留在門的另一側。',[.9,1.75,2.65],[.55,1.75,2.35],[.1,1.2,-1])];
    animate=t=>{hinge.rotation.y=-1.23*ease((t-10)/12);sheet.position.y=1.16+.03*Math.sin(Math.PI*ease(t/8));};
  }else if(identity==='ZHOU'){
    const y=desk();terminal(y);
    const camera=new THREE.Group();camera.name='ZHOU_LoweredCamera';camera.position.set(-.55,y+.14,.13);scene.add(camera);
    solid(camera,m.wallDark,[0,0,0],[.40,.24,.20]);
    const lens=new THREE.Mesh(new THREE.CylinderGeometry(.09,.09,.16,32),m.metal);lens.rotation.x=Math.PI/2;lens.position.z=.16;camera.add(lens);
    const glass=new THREE.Mesh(new THREE.CircleGeometry(.077,32),new THREE.MeshStandardMaterial({color:0x182c28,roughness:.15,metalness:.6}));glass.position.z=.244;camera.add(glass);
    label(['底片留存','27  28  29  30'],[-.67,y+.022,-.28],[.65,.26],true);
    const memo=label(['警告已送達','停止未核對的醫囑','接收者已回讀','不再等下一張照片'],[-.1,y+.006,.35],[.50,.36],true);memo.name='ZHOU_DeliveredMemo';
    const tray=solid(scene,m.metal,[.68,y+.035,.35],[.55,.07,.44]);tray.name='ZHOU_ReceivingTray';
    shots=[shot('放下相機','我看見了，也留下了證據。',[-1.7,1.5,1.65],[-1.3,1.36,1.35],[-.7,y+.12,.15]),shot('警告離開桌角','但留下影像，不等於已經有人收到警告。',[-.2,1.85,1.65],[.4,1.7,1.4],[.25,y,.4]),shot('THE WARNING','我是周啟文。這一次，警告不會再停在桌上。',[1.6,1.55,2.45],[1.2,1.5,2.2],[.15,y+.3,.1])];
    animate=t=>{camera.rotation.x=-.24*ease(t/7);camera.position.x=-.55-.20*ease(t/7);memo.position.x=-.1+.76*ease((t-8)/7);memo.position.y=y+.006+.068*ease((t-8)/7);};
  }else{
    const chair=new THREE.Group();chair.name='CHEN_HaltedWheelchair';scene.add(chair);chair.position.set(-.75,0,.55);
    solid(chair,m.wallBumper,[0,.59,0],[.55,.07,.53]);solid(chair,m.wallBumper,[0,.9,-.23],[.55,.57,.07]);
    for(const x of [-.35,.35]){
      const wheel=new THREE.Mesh(new THREE.TorusGeometry(.32,.035,12,40),m.stainless);wheel.rotation.y=Math.PI/2;wheel.position.set(x,.36,-.09);wheel.name='CHEN_Wheel';chair.add(wheel);
      const caster=new THREE.Mesh(new THREE.TorusGeometry(.10,.023,10,24),m.metal);caster.rotation.y=Math.PI/2;caster.position.set(x,.13,.33);chair.add(caster);
      solid(chair,m.stainless,[x,.72,0],[.03,.80,.03]);solid(chair,m.wallDark,[x,1.04,-.38],[.045,.045,.23]);
    }
    const barrier=solid(scene,m.metal,[-.7,.85,-1.7],[2.4,.055,.055]);barrier.name='CHEN_StopBarrier';
    for(const x of [-1.85,.45])solid(scene,m.metal,[x,.44,-1.7],[.055,.88,.055]);
    const stand=solid(scene,m.doorWood,[1.55,.43,.45],[1.05,.86,.60]);stand.name='CHEN_DispatchStand';
    const order=label(['醫囑單','預填目的地：撤銷','現場接收未確認','停止，不再往下傳'],[1.52,.876,.47],[.61,.41],true);order.name='CHEN_CancelledOrder';
    solid(scene,m.metal,[1.55,1.35,.18],[.77,.50,.04]);
    for(const x of [1.27,1.83])solid(scene,m.stainless,[x,1.02,.18],[.025,.30,.025]);
    label(['陳柏勳','MED-890605','跨院支援 / 交班完成'],[1.55,1.35,.207],[.72,.45]);
    const badge=label(['MED-890605','陳柏勳'],[1.9,.88,.53],[.22,.15],true);badge.name='CHEN_GreyBadge';
    shots=[shot('停在門前','我一直知道怎麼走，卻沒有先確認那是不是能抵達的地方。',[-2.2,1.65,2.55],[-1.9,1.5,2.15],[-.7,.7,.1]),shot('撤銷目的地','錯誤的目的地，就應該停止流程。',[2.9,1.75,1.8],[2.35,1.55,1.55],[1.55,.95,.4]),shot('THE TRANSFER','我是陳柏勳。這一次，我把接收的責任也一起核對。',[1.75,1.7,3.0],[1.1,1.65,2.6],[.05,.8,-.4])];
    animate=t=>{chair.position.z=.55-.48*ease(t/7);chair.rotation.y=.62*ease((t-8)/9);order.rotation.z=.035*ease((t-8)/7);};
  }
  return {scene,shots,update(t){animate(t);dawn.intensity=1+2*ease(t/24);windowMat.color.setRGB(.35+.3*ease(t/24),.45+.25*ease(t/24),.4+.2*ease(t/24));scene.updateMatrixWorld(true);}};
}
