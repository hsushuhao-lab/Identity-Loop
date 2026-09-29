import * as THREE from 'three';
import {solid} from '../../art/ArtDetails.js';
import {PlanWalls} from './PlanArchitecture.js';
import {CollisionFactory} from './CollisionFactory.js';

// Enclosed wet area inside the existing room. The south doorway stays open;
// no extra key or story condition is required to use the bathroom.
export function buildSecondDutyBathroom(zone, origin) {
  const m=zone.gf.materials, root=new THREE.Group();
  root.name='IdentitySecond5F_DutyBathroom';zone.zoneGroup.add(root);
  const wall=new PlanWalls(zone);
  wall.line('z',origin+10.8,2.12,5.25);
  wall.line('x',5.25,origin+8.12,origin+10.8);
  wall.cut('x',5.25,origin+9.25,1.15);
  wall.build();
  zone.gf.buildFloor(root,zone.walkables,origin+9.46,.004,3.66,2.66,3.17,m.floorTile);
  // Name every solid that owns collision so tests check geometry, not marker strings.
  const fixture=(name,material,position,size,collide=false)=>{
    const mesh=solid(root,material,position,size);mesh.name=`SecondDutyBathroom_${name}`;
    if(collide)CollisionFactory.addBox(zone.colliders,...position,...size);
    return mesh;
  };
  for(const [name,p,s] of [
    ['WestTiles',[origin+8.13,1.08,3.64],[.025,2.12,3.05]],
    ['NorthTiles',[origin+9.45,1.08,2.13],[2.62,2.12,.025]],
    ['EastTiles',[origin+10.69,1.08,3.64],[.025,2.12,3.05]]
  ])fixture(name,m.bedSheet,p,s);
  // Real-height toilet: ceramic pedestal, oval bowl/seat and wall-side cistern.
  const bowl=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),m.bedSheet);
  bowl.name='SecondDutyBathroom_ToiletBowl';bowl.scale.set(.29,.18,.39);bowl.position.set(origin+8.72,.35,2.85);root.add(bowl);
  fixture('ToiletPedestal',m.bedSheet,[origin+8.72,.17,2.86],[.36,.34,.44]);
  fixture('ToiletCistern',m.bedSheet,[origin+8.72,.63,2.46],[.48,.68,.21]);
  fixture('FlushButton',m.stainless,[origin+8.72,.985,2.46],[.12,.015,.04]);
  const seat=new THREE.Mesh(new THREE.TorusGeometry(.21,.035,12,36),m.bedSheet);
  seat.name='SecondDutyBathroom_ToiletSeat';seat.rotation.x=Math.PI/2;seat.scale.y=1.4;seat.position.set(origin+8.72,.505,2.88);root.add(seat);
  const opening=new THREE.Mesh(new THREE.CircleGeometry(.195,32),m.wallDark);
  opening.rotation.x=-Math.PI/2;opening.scale.y=1.4;opening.position.set(origin+8.72,.49,2.88);root.add(opening);
  CollisionFactory.addBox(zone.colliders,origin+8.72,.47,2.76,.62,.94,1.0);
  // Shower at the east/north corner, with a walkable flush pan and screen.
  fixture('ShowerPan',m.bedSheet,[origin+10.07,.025,2.85],[1.1,.04,1.15]);
  zone.gf.buildFloor(root,zone.walkables,origin+10.07,.046,2.85,1.1,1.15,m.floorTile);
  fixture('ShowerDrain',m.stainless,[origin+10.25,.056,2.52],[.16,.012,.16]);
  fixture('ShowerRiser',m.stainless,[origin+10.45,1.42,2.3],[.03,1.8,.03]);
  fixture('ShowerArm',m.stainless,[origin+10.27,2.28,2.3],[.38,.028,.03]);
  const head=new THREE.Mesh(new THREE.CylinderGeometry(.10,.10,.035,24),m.stainless);
  head.name='SecondDutyBathroom_ShowerHead';head.position.set(origin+10.1,2.26,2.3);root.add(head);
  fixture('ShowerMixer',m.stainless,[origin+10.45,1.07,2.29],[.22,.05,.07]);
  const frosted=new THREE.MeshStandardMaterial({color:0xd7e3da,roughness:.8,transparent:true,opacity:.45,side:THREE.DoubleSide});
  fixture('ShowerScreen',frosted,[origin+9.49,1.13,2.8],[.035,2.18,1.14],true);
  fixture('ScreenPost',m.stainless,[origin+9.49,1.14,3.35],[.035,2.26,.035]);
  // Sink along the east wall; leaves a continuous standing route from the door.
  fixture('Vanity',m.wallBumper,[origin+10.4,.39,4.65],[.5,.78,.68],true);
  fixture('Sink',m.bedSheet,[origin+10.38,.825,4.65],[.59,.11,.72]);
  fixture('Faucet',m.stainless,[origin+10.56,1.0,4.65],[.035,.26,.035]);
  fixture('FaucetSpout',m.stainless,[origin+10.46,1.115,4.65],[.22,.03,.035]);
  fixture('MirrorFrame',m.stainless,[origin+10.68,1.65,4.65],[.035,.90,.73]);
  fixture('Mirror',m.glass,[origin+10.657,1.65,4.65],[.013,.82,.65]);
  fixture('TowelRail',m.stainless,[origin+8.23,1.18,4.28],[.1,.03,.45]);
  fixture('Towel',m.bedSheet,[origin+8.29,.99,4.28],[.018,.42,.32]);
  fixture('Vent',m.wallDark,[origin+9.0,2.65,2.16],[.45,.26,.028]);
  for(let i=0;i<5;i++)fixture(`VentSlat${i}`,m.stainless,[origin+8.83+i*.085,2.65,2.179],[.015,.2,.01]);
  zone.gf.buildCeilingLight(root,origin+9.45,3.12,3.65,.42,4.5,0xe4ece5);
  zone.secondDutyBathroom={root,bounds:[origin+8.12,2.12,origin+10.8,5.25],
    doorway:[origin+9.25,1.7,5.25],
    walkingPath:[[origin+9.25,1.7,5.85],[origin+9.25,1.7,4.9],[origin+9.35,1.7,3.8],[origin+10.1,1.7,3.8],[origin+10.1,1.75,2.95]],
    fixtures:['ToiletBowl','ToiletSeat','ShowerPan','ShowerHead','Sink','Mirror']};
  return root;
}
