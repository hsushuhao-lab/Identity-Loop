import * as THREE from 'three';
import {solid} from '../../art/ArtDetails.js';
import {CollisionFactory} from './CollisionFactory.js';

// Fixtures only: retain the existing 4F bathroom walls, 1.1 m doorway and door ID.
export function buildFirstDutyBathroom(zone){
  const m=zone.gf.materials,root=new THREE.Group();
  root.name='First4F_DutyBathroom';zone.zoneGroup.add(root);
  const fixture=(name,material,p,size,collide=false)=>{
    const mesh=solid(root,material,p,size);mesh.name='FirstDutyBathroom_'+name;
    if(collide)CollisionFactory.addBox(zone.colliders,...p,...size);
    return mesh;
  };
  // Tile lining stays inside the original 2.5 x 3.2 m bathroom.
  fixture('WestTiles',m.bedSheet,[-13.875,1.02,3.6],[.025,1.98,2.94]);
  fixture('NorthTiles',m.bedSheet,[-12.75,1.02,2.125],[2.24,1.98,.025]);
  fixture('SouthTiles',m.bedSheet,[-12.75,1.02,5.075],[2.24,1.98,.025]);
  for(const y of [.52,1.02,1.52])fixture('TileJoint_'+y,m.wallBumper,[-13.855,y,3.6],[.012,.012,2.9]);

  // North-west shower, entered from the south without a raised collision barrier.
  fixture('ShowerPan',m.bedSheet,[-13.22,.026,2.78],[1.12,.04,1.12]);
  const showerFloor=zone.gf.buildFloor(root,zone.walkables,-13.22,.047,2.78,1.1,1.1,m.floorTile);
  showerFloor.name='FirstDutyBathroom_ShowerFloor';
  fixture('ShowerDrain',m.stainless,[-13.55,.055,2.43],[.18,.014,.18]);
  fixture('ShowerRiser',m.stainless,[-13.73,1.43,2.64],[.035,1.70,.035]);
  fixture('ShowerArm',m.stainless,[-13.56,2.28,2.64],[.38,.03,.035]);
  const head=new THREE.Mesh(new THREE.CylinderGeometry(.105,.105,.035,24),m.stainless);
  head.name='FirstDutyBathroom_ShowerHead';head.position.set(-13.38,2.25,2.64);root.add(head);
  fixture('ShowerMixer',m.stainless,[-13.71,1.03,2.64],[.08,.055,.24]);
  const hose=new THREE.CatmullRomCurve3([
    new THREE.Vector3(-13.68,1.0,2.58),new THREE.Vector3(-13.59,.60,2.72),
    new THREE.Vector3(-13.64,.58,2.9),new THREE.Vector3(-13.69,1.40,2.84)
  ]);
  const tube=new THREE.Mesh(new THREE.TubeGeometry(hose,28,.013,8,false),m.stainless);
  tube.name='FirstDutyBathroom_ShowerHose';root.add(tube);
  const screenMaterial=new THREE.MeshStandardMaterial({color:0xd7e3da,roughness:.8,transparent:true,opacity:.45,side:THREE.DoubleSide});
  fixture('ShowerScreen',screenMaterial,[-12.64,1.12,2.72],[.03,2.18,1.10],true);
  fixture('ScreenPost',m.stainless,[-12.64,1.12,3.27],[.035,2.24,.035]);

  // Toilet remains inside the same room, moved south to clear the shower approach.
  const bowl=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),m.bedSheet);
  bowl.name='FirstDutyBathroom_ToiletBowl';bowl.scale.set(.29,.18,.38);bowl.position.set(-13.2,.35,4.55);root.add(bowl);
  fixture('ToiletPedestal',m.bedSheet,[-13.2,.17,4.60],[.36,.34,.46]);
  fixture('ToiletCistern',m.bedSheet,[-13.2,.64,4.91],[.50,.70,.20]);
  fixture('FlushButton',m.stainless,[-13.2,.995,4.91],[.12,.014,.045]);
  const seat=new THREE.Mesh(new THREE.TorusGeometry(.205,.033,12,36),m.bedSheet);
  seat.name='FirstDutyBathroom_ToiletSeat';seat.rotation.x=Math.PI/2;seat.scale.y=1.38;seat.position.set(-13.2,.515,4.5);root.add(seat);
  const opening=new THREE.Mesh(new THREE.CircleGeometry(.19,32),m.wallDark);
  opening.rotation.x=-Math.PI/2;opening.scale.y=1.38;opening.position.set(-13.2,.494,4.5);root.add(opening);
  CollisionFactory.addBox(zone.colliders,-13.2,.51,4.62,.62,1.02,.94);
  fixture('PaperHolder',m.stainless,[-13.78,.89,4.33],[.13,.035,.26]);
  const paper=new THREE.Mesh(new THREE.CylinderGeometry(.085,.085,.22,20),m.bedSheet);
  paper.name='FirstDutyBathroom_ToiletPaper';paper.rotation.x=Math.PI/2;paper.position.set(-13.72,.89,4.33);root.add(paper);

  // North-east sink; standing space is shared with the clear central aisle.
  fixture('Vanity',m.wall,[-12,.39,2.62],[.62,.78,.48],true);
  fixture('Sink',m.bedSheet,[-12,.835,2.62],[.68,.11,.54]);
  fixture('BasinInterior',m.wallBumper,[-12,.893,2.66],[.44,.008,.32]);
  fixture('Faucet',m.stainless,[-12,1.02,2.40],[.035,.26,.035]);
  fixture('FaucetSpout',m.stainless,[-12,1.145,2.49],[.035,.035,.20]);
  fixture('MirrorFrame',m.stainless,[-12,1.65,2.165],[.76,.88,.035]);
  fixture('Mirror',m.glass,[-12,1.65,2.191],[.68,.80,.018]);
  fixture('SoapDispenser',m.bedSheet,[-11.73,1.01,2.55],[.11,.22,.10]);
  fixture('TowelRail',m.stainless,[-13.78,1.18,3.65],[.14,.035,.40]);
  fixture('Towel',m.bedSheet,[-13.70,.99,3.65],[.025,.39,.31]);
  fixture('FloorDrain',m.stainless,[-12.65,.016,4.93],[.20,.025,.20]);
  fixture('BathMat',m.wallBumper,[-12.1,.023,3.12],[.64,.025,.36]);
  const bin=new THREE.Mesh(new THREE.CylinderGeometry(.13,.15,.38,20),m.stainless);
  bin.name='FirstDutyBathroom_WasteBin';bin.position.set(-12.16,.19,4.90);root.add(bin);
  CollisionFactory.addBox(zone.colliders,-12.16,.19,4.90,.30,.38,.30);
  fixture('Vent',m.wallDark,[-13.22,2.64,2.16],[.52,.28,.028]);
  for(let i=0;i<5;i++)fixture('VentSlat_'+i,m.stainless,[-13.40+i*.09,2.64,2.18],[.015,.20,.01]);
  zone.gf.buildCeilingLight(root,-12.75,3.15,3.6,.48,5,0xfff2dc);
  zone.dutyBathroom={
    root,door:[-11.5,1.7,4.0],bounds:[-14,2,-11.5,5.2],
    fixtures:['toilet','sink','mirror','towel_rail','floor_drain','shower'],
    details:['tile_wainscot','mirror_frame','soap_dispenser','toilet_paper','waste_bin','flush_button','exhaust_grille','bath_mat','shower_screen','shower_drain','shower_mixer'],
    visualRefinement:'V5_3_4F_SHOWER_TOILET',
    walkingPath:[[-10.8,1.7,4],[-12.1,1.7,4],[-12.1,1.7,3.7],[-13.22,1.7,3.7],[-13.22,1.75,2.85]]
  };
  return root;
}
