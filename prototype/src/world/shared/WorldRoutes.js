import { CORE_ORIGINS, corePoint } from './VerticalCore.js';
import {DEBUG_SPAWN_POINTS} from './DebugSpawnPoints.js';
export const FIRST_FLOORS=[1,2,3,4,8];
export const SECOND_FLOORS=[1,2,5];
export const WORLD_SPAWNS=Object.fromEntries(Object.entries(DEBUG_SPAWN_POINTS).filter(([,spawn])=>!['hillside_route','ecology_pond'].includes(spawn.zoneId)));
const add=(id,zoneId,pos,yaw,name)=>{WORLD_SPAWNS[id]={zoneId,pos,yaw,name,milestone:'BASELINE'};};
// Story-only 4F exists for scripted scenes but is deliberately absent from
// SECOND_FLOORS, LIFT_PANELS and STAIR_DOORS, so players never see a 4F button.
add('second_4f_story','second_campus_4f_story',corePoint('second_campus_4f_story',0,1.5),0,'第二院區 4F 劇情專用場景');
add('first_bridge_return','first_campus_8f',[-1.6,1.7,0],Math.PI/2,'返回第一院區 8F');
add('bridge_from_first','skybridge',[1.6,1.7,0],-Math.PI/2,'天橋第一院區端');
add('bridge_from_second','skybridge',[58.4,1.7,0],Math.PI/2,'天橋第二院區端');
add('second_bridge_return','second_campus_2f',[61.6,1.7,0],-Math.PI/2,'第二院區 2F 連通口');
add('phantom_6f_lift','phantom_6f',[0,1.7,1.0],0,'不存在的 6F 電梯口');
add('b2_archive_entry','b2_archive',[0,1.7,1.0],Math.PI,'B2 封存隔離層入口');
add('chen_b1_dispatch','b1_dispatch_hub',[0,1.7,1.2],Math.PI,'B1 救護車接駁調度室');
add('ward_service_entry','ward_service_annex',[0,1.7,5.8],0,'4F 檢修廊入口');
add('ward_service_return','first_campus_4f',[-10.5,1.7,1],-Math.PI/2,'返回4F入口儲藏室');
add('first_1f_guard_back','first_campus_1f',[-12.55,1.7,4.55],Math.PI/2,'第一院區 1F 警衛台後方');

export const ROUTE_PORTALS=[
 {id:'first_to_bridge',gated:true,from:'first_campus_8f',spawn:'bridge_from_first',bounds:[[-.75,-1,-1],[.2,3,1]]},
 {id:'bridge_to_first',gated:true,from:'skybridge',spawn:'first_bridge_return',bounds:[[-.2,-1,-1],[.75,3,1]]},
 {id:'bridge_to_second',gated:true,from:'skybridge',spawn:'second_bridge_return',bounds:[[59.2,-1,-1],[60.2,3,1]]},
 {id:'second_to_bridge',gated:true,from:'second_campus_2f',spawn:'bridge_from_second',bounds:[[59.8,-1,-1],[60.8,3,1]]},
];

// Lift and stair destinations share the actual visual core attachment.
export const LIFT_PANELS={}, STAIR_DOORS={};
for(const campus of ['first','second'])for(const f of campus==='first'?FIRST_FLOORS:SECOND_FLOORS){
 const zoneId=`${campus}_campus_${f}f`,o=CORE_ORIGINS[zoneId];
 add(`${campus}_${f}f_lift`,zoneId,corePoint(zoneId,0,1.5),0,`${campus==='first'?'第一':'第二'}院區 ${f}F 電梯`);
 const stair=campus==='first'?[6.2,1]:[-5,2.2];
 add(`${campus}_${f}f_stairs`,zoneId,corePoint(zoneId,...stair),campus==='first'?-Math.PI/2:Math.PI,`${f}F 安全梯門前`);
 LIFT_PANELS[zoneId]={position:[o[0]+1.65,1.23,o[1]+3.72],yaw:Math.PI};
 STAIR_DOORS[zoneId]={position:[o[0]+(campus==='first'?7.78:-5),0,o[1]+(campus==='first'?1:3.78)],yaw:campus==='first'?-Math.PI/2:Math.PI};
}
