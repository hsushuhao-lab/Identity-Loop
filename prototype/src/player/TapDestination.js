import {Vector2} from 'three';

export function visibleInWorld(object){
  for(let node=object;node;node=node.parent)if(node.visible===false)return false;
  return true;
}

// Pick the visible surface first, so a floor or hotspot behind a wall cannot
// become a destination. The existing controller handles movement/collision.
export function pickTapDestination(controller,event){
  const rect=controller.domElement.getBoundingClientRect();
  if(!rect.width||!rect.height)return null;
  const ndc=new Vector2((event.clientX-rect.left)/rect.width*2-1,-((event.clientY-rect.top)/rect.height)*2+1);
  controller.camera.updateMatrixWorld(true);
  controller.navigationRoot?.updateWorldMatrix(true,true);
  const roots=controller.navigationRoot?[controller.navigationRoot]:[...controller.walkables,...controller.interactables.filter(o=>o?.isObject3D)];
  const ray=controller.clickRaycaster;ray.setFromCamera(ndc,controller.camera);
  for(const hit of ray.intersectObjects(roots,true)){
    if(!visibleInWorld(hit.object))continue;
    let object=null;
    for(let node=hit.object;node;node=node.parent){
      if(node.userData?.interactable&&controller.interactables.includes(node)){object=node;break;}
    }
    const materials=Array.isArray(hit.object.material)?hit.object.material:[hit.object.material];
    if(!object&&!materials.some(m=>m&&m.visible!==false&&(!m.transparent||m.opacity>.01)))continue;
    if(object){
      return {point:hit.point.clone(),stopDistance:1.5,focus:{object,id:object.userData.id,localPoint:object.worldToLocal(hit.point.clone())}};
    }
    if(!controller.walkables.includes(hit.object))return null;
    const normal=hit.face?.normal.clone().transformDirection(hit.object.matrixWorld);
    if(!normal||normal.y<.5||Math.abs(hit.point.y-(controller.position.y-controller.eyeHeight))>.35)return null;
    if(controller.checkCollision(hit.point.x,hit.point.z)||controller.supportedHeight(hit.point.x,hit.point.z)===null)return null;
    return {point:hit.point.clone(),stopDistance:.4,focus:null};
  }
  return null;
}

export function tapBoundaryAt(controller,x,z){
  const margin=controller.playerRadius+.05;
  return (controller.tapTravelBoundaries||[]).some(([min,max])=>x>=min[0]-margin&&x<=max[0]+margin&&z>=min[2]-margin&&z<=max[2]+margin);
}

export function tapFocusPoint(controller){
  const focus=controller.autoMoveFocus;
  if(!focus)return null;
  if(!controller.interactables.includes(focus.object)||!focus.object.userData.interactable||focus.id!==focus.object.userData.id||!visibleInWorld(focus.object))return false;
  return focus.object.localToWorld(focus.localPoint.clone());
}
