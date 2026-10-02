import * as THREE from 'three';
import {buildEquipmentAttendant} from '../../art/EquipmentAttendant.js';
import {dressHospitalSlice} from '../../art/HospitalAtmosphere.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';

const pads = [[6.45, -5.05], [6.45, -6.45]];
export function installHospitalSystems(zone, zoneId, simulation) {
  if (zoneId !== 'first_campus_4f') return;
  const group = new THREE.Group(); group.name = 'HospitalSystems_4F'; zone.zoneGroup.add(group);
  const metal = new THREE.MeshStandardMaterial({ color: 0x69756b, roughness: .8 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1b302b, roughness: .6 });
  const screen = new THREE.MeshStandardMaterial({ color: 0x92bba7, emissive: 0x183b2c, emissiveIntensity: .5 });
  const box = (parent, size, position, material) => {
    const mesh = new THREE.Mesh(new RoundedBoxGeometry(...size,1,Math.min(.014,...size.map(v=>v/5))), material); mesh.position.set(...position);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh); return mesh;
  };
  const anchor = (id, label, position) => {
    const root = new THREE.Group(); root.position.set(...position); group.add(root);
    root.userData = { interactable: true, id, type: 'hospital_system', label };
    zone.interactables.push(root); return root;
  };
  // A dedicated equipment shelf keeps all objects physically supported and
  // leaves the original story computers and medication cart unchanged.
  const shelf = new THREE.Group(); shelf.name='HospitalSystems_EquipmentShelf'; group.add(shelf);
  box(shelf,[1.95,.06,.60],[3.05,.80,-2.4],metal);
  for(const x of [2.17,3.93])for(const z of [-2.62,-2.18])box(shelf,[.035,.77,.035],[x,.385,z],metal);
  zone.colliders.push(new THREE.Box3(new THREE.Vector3(2.075,0,-2.70),new THREE.Vector3(4.025,.83,-2.10)));
  const terminal = anchor('HOSPITAL_TERMINAL', '查看護理站夜間設備', [2.3, .83, -2.4]);
  box(terminal, [.46,.32,.055], [0,.20,0], dark);
  box(terminal, [.40,.25,.012], [0,.20,.035], screen);
  box(terminal, [.30,.035,.23], [0,0,.09], metal);
  box(terminal,[.045,.07,.035],[0,.035,0],metal);
  const phone = anchor('HOSPITAL_PHONE', '撥打院內分機', [3.12,.83,-2.25]);
  box(phone,[.32,.10,.24],[0,.05,0],dark);
  box(phone,[.36,.08,.08],[0,.13,-.04],metal);
  const badge = anchor('HOSPITAL_BADGE', '核對夜間門禁紀錄', [3.75,.83,-2.28]);
  box(badge,[.19,.26,.07],[0,.13,0],dark);
  box(badge,[.13,.055,.015],[0,.17,.045],screen);
  const lamp = new THREE.PointLight(0xb4cfb8, .5, 4, 2); lamp.position.set(2.4,2.2,-2.8); group.add(lamp);
  const wheelchair = anchor('HOSPITAL_WHEELCHAIR', '移動輪椅／查看收納袋', [pads[0][0],0,pads[0][1]]);
  box(wheelchair,[.50,.07,.45],[0,.58,0],dark);
  box(wheelchair,[.50,.48,.06],[0,.85,.20],dark);
  box(wheelchair,[.30,.27,.08],[0,.76,.25],metal);
  for (const x of [-.30,.30]) {
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(.30,.025,8,20),metal);
    wheel.rotation.y = Math.PI/2; wheel.position.set(x,.32,.08); wheelchair.add(wheel);
    box(wheelchair,[.035,.60,.035],[x,.50,0],metal);
  }
  const collider = new THREE.Box3(); zone.colliders.push(collider);
  // A separate, anonymous equipment attendant; no story NPC or identity badge.
  const staff = anchor('HOSPITAL_STAFF', '詢問器材巡查人員', [5.65,0,-13.8]);
  staff.name = 'HospitalSystems_EquipmentAttendant';
  const actor=buildEquipmentAttendant(staff);
  const staffCollider = new THREE.Box3(); zone.colliders.push(staffCollider);
  const synchronizeStaff = (delta=0,player) => {
    const state = simulation.data.staff;
    if(state.z !== staff.position.z) staff.rotation.y = state.z>staff.position.z ? Math.PI : 0;
    staff.position.z = state.z;
    actor.update(delta,state,player);
    staffCollider.set(new THREE.Vector3(5.41,.1,state.z-.22),new THREE.Vector3(5.89,1.66,state.z+.22));
    staff.updateMatrixWorld(true);
  };
  const synchronize = () => {
    const state = simulation.snapshot(), [x,z] = pads[state.wheelchairPad];
    wheelchair.position.set(x,0,z); lamp.intensity = state.taskPower ? .5 : 0;
    collider.set(new THREE.Vector3(x-.34,.05,z-.32),new THREE.Vector3(x+.34,1.13,z+.34));
    group.updateMatrixWorld(true);
    synchronizeStaff();
    zone.hospitalSystems?.dressing?.synchronize();
  };
  zone.hospitalSystems = { group, wheelchair, synchronize, collider, pads, staff, actor, staffCollider, synchronizeStaff,
    blockedStaff: (x,z,player) => {
      if(player && Math.hypot(player.x-x,player.z-z)<.85) return true;
      const candidate = new THREE.Box3(new THREE.Vector3(x-.24,.1,z-.22),new THREE.Vector3(x+.24,1.66,z+.22));
      return zone.colliders.some(box=>box!==staffCollider && candidate.intersectsBox(box));
    }
  };
  zone.hospitalSystems.dressing=dressHospitalSlice(zone,{group,terminal,phone,badge,shelf,wheelchair,simulation});
  synchronize();
}
