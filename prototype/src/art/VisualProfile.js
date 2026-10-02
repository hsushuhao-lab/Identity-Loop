import * as THREE from 'three';

export const VisualProfile = Object.freeze({
  ACT1_DUSK_NORMAL: { fill: 0.42, sky: 0xe6e5de, ground: 0xd0c7b6, background: 0xabb4b4 },
  NIGHT_NORMAL: { fill: 0.22, sky: 0x718187, ground: 0x3c4540, background: 0x10171b },
  NIGHT_LATE: { fill: 0.08, sky: 0x465c5b, ground: 0x1d2824, background: 0x080e10 },
  NIGHT_HORROR: { fill: 0.04, sky: 0x263d3b, ground: 0x111a17, background: 0x040708 }
});

const zones = {
  first_campus_3f: { lamps: [[-8, 0], [-1.5, 0], [6.5, 0], [14, 0], [6, 5.5]], intensity: 4.2 },
  first_campus_4f: { lamps: [[0, 6], [-11, 6], [0, -3], [-2, -9], [0, -15], [8, -3]], intensity: 4.0 },
  ward_service_annex:{lamps:[[0,5],[0,-1],[-4,-4],[4,-4]],intensity:2.0,width:2.0},
  first_campus_2f: { lamps: [[-8, 0], [0, 0], [8, 0], [16, 0], [3.5, 6], [14.5, 6.5], [3.5, -6.5], [12.5, -6.5]], intensity: 4.8, color: 0xf1f4ed },
  first_campus_1f: { lamps: [[-7, 0], [2, -3], [2, 3], [12, 0]], intensity: 6.0, y: 3.65, width: 5 },
  first_campus_8f: { lamps: [[-8, 0], [-2, 0]], intensity: 3.8 },
  skybridge: { lamps: [[4, 0], [14, 0], [27, 0], [41, 0], [55, 0]], intensity: 3.4, width: 5.5, color: 0xe1e9e6 },
  second_campus_2f: { lamps: [[65, 0], [75, 0]], intensity: 3.7, width: 4 },
  second_campus_std: { lamps: [[72, 6], [76, -2], [72, -9], [72, -15], [81, -8], [65, -8], [83, 6]], intensity: 3.8 },
  second_campus_1f: { lamps: [[72, -4], [72, -11]], intensity: 3.5 },
  hillside_route: { lamps: [], intensity: 0 },
  ecology_pond: { lamps: [], intensity: 0 },
  phantom_6f: { lamps: [[0,-1],[0,-6],[0,-11]], intensity: 4.5, width: 2.4, color: 0x8a5b4b, night: true },
  b2_archive: { lamps: [[0,-1],[0,-6],[0,-11]], intensity: 4.0, width: 2.2, color: 0x6b5146, night: true }
};

export function applyZoneLighting({group,scene,zoneGroup,zoneId,storyTime='17:00',roomLamps=[]}) {
  group.traverse(object => { if (object.isLight) object.shadow?.dispose(); });
  group.clear();
  const zone = zones[zoneId] || { lamps: [], intensity: 0, night: true };
  const timeOrder={'21:17':1,'23:55':1,'00:30':1,'00:33':2,'01:15':2,'01:45':2,'02:00':3,'02:17':3,'03:30':3,'04:05':3};
  const stage=timeOrder[storyTime]??0;
  const profile = stage>=3?VisualProfile.NIGHT_HORROR:stage>=2?VisualProfile.NIGHT_LATE:stage>=1||zone.night?VisualProfile.NIGHT_NORMAL:VisualProfile.ACT1_DUSK_NORMAL;
  const practicalScale=stage===0?1:stage===1?.76:stage===2?.30:.12;
  const fixtureScale=stage===0?1:stage===1?.90:stage===2?.66:.42;
  zoneGroup?.traverse(object=>{
    if(!object.userData.practicalEmitter)return;
    object.material.color.setHex(object.userData.baseColor).multiplyScalar(fixtureScale);
  });
  scene.background = new THREE.Color(profile.background);
  scene.fog = null;
  group.userData.profile = zone.night ? 'NIGHT_NORMAL' : 'ACT1_DUSK_NORMAL';
  group.add(new THREE.HemisphereLight(profile.sky, profile.ground, profile.fill));
  if (zoneId === 'hillside_route' || zoneId === 'ecology_pond') {
    const sun = new THREE.DirectionalLight(0xffedcf, 2.2);
    sun.position.set(20,35,-5);
    sun.target.position.set(50,0,-35);
    sun.castShadow=true;
    sun.shadow.mapSize.set(2048,2048);
    Object.assign(sun.shadow.camera,{left:-50,right:50,top:45,bottom:-45,near:1,far:120});
    sun.shadow.bias=-.0002;
    group.add(sun,sun.target);
  }
  if (zoneId === 'first_campus_3f') {
    const daylight = new THREE.SpotLight(0xffe2b5, 150, 24, .70, .65, 2);
    daylight.position.set(1.5,2.8,-5);
    daylight.target.position.set(7,.4,1.4);
    daylight.castShadow=true;
    daylight.shadow.mapSize.set(1024,1024);
    daylight.shadow.bias=-.0002;
    group.add(daylight,daylight.target);
  }
  if (zoneId === 'first_campus_4f') {
    const readingLight=new THREE.PointLight(0xffdcaa,9,3.3,2);
    readingLight.position.set(-11.25,1.0,8.1);
    group.add(readingLight);
  }
  for (const [x, z] of zone.lamps) {
    const panel = new THREE.RectAreaLight(zone.color || 0xfff0d9, zone.intensity*practicalScale, zone.width || 3.6, 1.2);
    panel.position.set(x, zone.y || 3.05, z);
    panel.lookAt(x, 0, z);
    group.add(panel);
  }
  for (const [x,z] of roomLamps) {
    const panel=new THREE.RectAreaLight(0xfff0d9,3.5*practicalScale,2,1.2);
    panel.position.set(x,3,z);
    panel.lookAt(x,0,z);
    group.add(panel);
  }
  if(stage>=2&&['first_campus_3f','first_campus_4f','first_campus_2f','first_campus_1f'].includes(zoneId)){
    const emergency=new THREE.PointLight(0x63b982,stage===2?.40:.82,5.5,2);
    emergency.position.set(zoneId==='first_campus_4f'?6:0,2.45,zoneId==='first_campus_4f'?-3:0);
    emergency.name='LocalizedGreenEmergencySpill';group.add(emergency);
  }
}
