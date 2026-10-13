import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {FPSController} from '../src/player/FPSController.js';

function fixture(){
  globalThis.document={addEventListener(){}};globalThis.window={addEventListener(){}};
  const camera=new THREE.PerspectiveCamera(70,1,.1,100),root=new THREE.Group();
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(30,30),new THREE.MeshBasicMaterial());floor.rotation.x=-Math.PI/2;root.add(floor);
  const canvas={addEventListener(){},getBoundingClientRect:()=>({left:0,top:0,width:600,height:600})};
  const c=new FPSController(camera,canvas,[],[],[floor]);c.navigationRoot=root;c.teleport(0,1.7,8,0);
  let calls=0;c.onInteract=()=>calls++;
  const pointEvent=point=>{root.updateMatrixWorld(true);camera.updateMatrixWorld(true);const p=new THREE.Vector3(...point).project(camera);return {clientX:(p.x+1)*300,clientY:(1-p.y)*300};};
  return {c,root,floor,pointEvent,get calls(){return calls;},tick:n=>{for(let i=0;i<n;i++)c.update(1/60);}};
}

test('floor tap advances on supported ground, retargets and never interacts',()=>{
  const f=fixture();assert(f.c.handleTap(f.pointEvent([0,0,2])));f.tick(60);assert(f.c.position.z<7);
  assert(f.c.handleTap(f.pointEvent([2,0,3])));f.tick(250);assert(Math.hypot(f.c.position.x-2,f.c.position.z-3)<.5);assert.equal(f.c.autoMoveTarget,null);assert.equal(f.calls,0);
});
test('opaque walls occlude target selection and collision blocks a target after selection',()=>{
  const f=fixture(),wall=new THREE.Mesh(new THREE.BoxGeometry(6,3,.3),new THREE.MeshBasicMaterial());wall.position.set(0,1.5,5);f.root.add(wall);
  assert.equal(f.c.handleTap(f.pointEvent([0,0,1])),false);
  f.root.remove(wall);assert(f.c.handleTap(f.pointEvent([0,0,1])));
  f.c.colliders.push(new THREE.Box3(new THREE.Vector3(-3,0,4.85),new THREE.Vector3(3,3,5.15)));f.tick(180);
  assert(f.c.position.z>5.49);assert.equal(f.c.autoMoveTarget,null);
});
test('interactive and irreversible targets are approached but require explicit interaction',()=>{
  const f=fixture(),item=new THREE.Mesh(new THREE.BoxGeometry(.7,.7,.4),new THREE.MeshBasicMaterial());item.position.set(0,1,2);item.userData={interactable:true,id:'B2_ONE_WAY_EXIT',type:'b2_exit_door'};f.root.add(item);f.c.interactables.push(item);
  assert(f.c.handleTap(f.pointEvent([0,1,2])));f.tick(250);assert(f.c.position.z>3.2&&f.c.position.z<3.8);assert.equal(f.c.autoMoveTarget,null);assert.equal(f.calls,0);assert.equal(f.c.currentInteractable,item.userData);
  f.c.interact();assert.equal(f.calls,1);
});
test('removed targets, disabled controls, blockers, manual keys and resets cancel movement',()=>{
  for(const cancel of [f=>{f.c.enabled=false;},f=>{f.c.tapNavigationBlocked=()=>true;},f=>{f.c.keys.forward=true;},f=>f.c.resetInput()]){
    const f=fixture();assert(f.c.handleTap(f.pointEvent([0,0,2])));cancel(f);f.tick(1);assert.equal(f.c.autoMoveTarget,null);
  }
  const f=fixture(),item=new THREE.Mesh(new THREE.BoxGeometry(.7,.7,.4),new THREE.MeshBasicMaterial());item.position.set(0,1,2);item.userData={interactable:true,id:'OLD'};f.root.add(item);f.c.interactables.push(item);assert(f.c.handleTap(f.pointEvent([0,1,2])));item.userData.id='NEW';f.tick(1);assert.equal(f.c.autoMoveTarget,null);
});
test('tap navigation stops before portal boundaries without crossing floors',()=>{
  const f=fixture();assert(f.c.handleTap(f.pointEvent([0,0,1])));f.c.tapTravelBoundaries=[[[-1,-1,3],[1,3,4]]];f.tick(250);assert(f.c.position.z>4.39);assert.equal(f.c.autoMoveTarget,null);
  assert.equal(f.c.handleTap(f.pointEvent([0,0,3.5])),false);
});
test('hidden targets and gaps cannot be tapped into walkable destinations',()=>{
  const f=fixture(),wall=new THREE.Mesh(new THREE.BoxGeometry(6,3,.3),new THREE.MeshBasicMaterial());wall.position.set(0,1.5,5);wall.visible=false;wall.userData={interactable:true,id:'HIDDEN'};f.root.add(wall);f.c.interactables.push(wall);assert(f.c.handleTap(f.pointEvent([0,0,2])));assert.equal(f.c.autoMoveFocus,null);
  f.c.cancelAutoMove();f.c.walkables=[];assert.equal(f.c.handleTap(f.pointEvent([0,0,2])),false);
});
