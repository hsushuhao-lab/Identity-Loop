import * as THREE from 'three';
import {profileGeometry,characterMesh,mergedCharacterMesh,strokeGeometry,faceDetailGeometry} from './ClinicalCharacterGeometry.js';
import {clinicalCharacterMaterials,footContactTexture} from './ClinicalCharacterMaterials.js';

const THIGH=.405,CALF=.410,REST_HIP=.912,WALK_HIP=.885;
const headRings=[[-.118,.046,.058,-.006],[-.091,.064,.065,-.003],[-.045,.083,.078,0],[.006,.087,.084,0],[.058,.086,.083,.004],[.099,.059,.063,.006],[.126,.012,.015,.006]];
const wrappedAngle=a=>Math.atan2(Math.sin(a),Math.cos(a));
const skinTone=(point,a)=>{const warmth=Math.max(0,-Math.cos(a))*Math.exp(-(((point[1]+.03)/.065)**2));return [1,.97-warmth*.035,.94-warmth*.045];};

function maskGeometry(){
  const positions=[],uv=[],indices=[],columns=16,rows=8;
  for(let row=0;row<=rows;row++)for(let col=0;col<=columns;col++){
    const u=col/columns*2-1,t=row/rows,top=-.026+.022*(1-u*u),bottom=-.085+.005*u*u;
    positions.push(.088*u,THREE.MathUtils.lerp(top,bottom,t),-.087-.027*(1-u*u)+Math.sin(t*Math.PI*6)*.0018);uv.push(col/columns,t);
  }
  for(let row=0;row<rows;row++)for(let col=0;col<columns;col++){const a=row*(columns+1)+col,b=a+1,c=a+columns+1;indices.push(a,b,c,b,c+1,c);}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}
function hairGeometry(){
  const positions=[],colors=[],indices=[],segments=28,rows=7;
  const section=y=>{for(let i=1;i<headRings.length;i++)if(y<=headRings[i][0]){const a=headRings[i-1],b=headRings[i],t=(y-a[0])/(b[0]-a[0]);return [THREE.MathUtils.lerp(a[1],b[1],t),THREE.MathUtils.lerp(a[2],b[2],t),THREE.MathUtils.lerp(a[3],b[3],t)];}return [.008,.009,.006];};
  for(let row=0;row<=rows;row++)for(let col=0;col<=segments;col++){
    const a=col/segments*Math.PI*2,front=Math.max(0,-Math.cos(a)),base=-.064+front*.126+Math.sin(a*7)*.0025;
    const y=THREE.MathUtils.lerp(base,.127,row/rows),[w,d,z]=section(y),strand=1+Math.sin(a*17+row*.47)*.008;
    positions.push(Math.sin(a)*w*1.045*strand,y+.001,(Math.cos(a)<0?-d*Math.pow(-Math.cos(a),.45):Math.cos(a)*d)*1.045+z);
    const shade=.90+Math.sin(a*19+row*.5)*.08;colors.push(shade,shade*.99,shade*.95);
  }
  for(let row=0;row<rows;row++)for(let col=0;col<segments;col++){const a=row*(segments+1)+col,b=a+1,c=a+segments+1;indices.push(a,b,c,b,c+1,c);}
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}

/** Anonymous adult attendant. Visual pose is separate from saved patrol state. */
export function buildEquipmentAttendant(root){
  const m=clinicalCharacterMaterials(),hips=new THREE.Group(),torso=new THREE.Group();hips.name='Attendant_Hips';hips.position.y=REST_HIP;root.add(hips);hips.add(torso);
  characterMesh(hips,profileGeometry([[-.075,.108,.087],[0,.132,.093],[.08,.129,.099],[.115,.116,.090]]),m.trousers,'Attendant_TrouserWaist');
  characterMesh(torso,profileGeometry([[.030,.146,.109],[.055,.151,.110],[.105,.149,.106],[.205,.146,.105],[.330,.161,.111],[.425,.187,.106],[.466,.166,.091],[.505,.072,.061]],{warp:(p,a,r)=>{if(r>=2&&r<=5){const fold=Math.sin(a*4+r*.7)*.002;p[0]*=1+fold;p[2]+=fold;}return p;}}),m.cloth,'Attendant_ScrubTop');
  const neck=profileGeometry([[.468,.046,.047],[.526,.039,.041],[.575,.042,.044]],{color:skinTone});characterMesh(torso,neck,m.skin,'Attendant_Neck');
  const neckLine=strokeGeometry([[-.069,.493,-.059],[-.039,.470,-.088],[0,.427,-.113],[.039,.470,-.088],[.069,.493,-.059]],.003);
  const hem=strokeGeometry([[-.145,.056,-.015],[-.115,.053,-.079],[0,.052,-.111],[.115,.053,-.079],[.145,.056,-.015]],.0015);
  const pocket=strokeGeometry([[.028,.308,-.111],[.031,.206,-.110],[.092,.204,-.085],[.104,.297,-.090]],.0014);
  mergedCharacterMesh(torso,[neckLine,hem,pocket],m.seam,'Attendant_TopSeams');
  // A cloth pocket panel, not a box floating off the chest.
  const pocketGeometry=new THREE.PlaneGeometry(.065,.087,2,2);pocketGeometry.rotateY(.17);pocketGeometry.translate(.067,.255,-.106);characterMesh(torso,pocketGeometry,m.cloth,'Attendant_Pocket');
  const head=new THREE.Group();head.name='Attendant_Head';head.position.set(0,.690,-.003);torso.add(head);
  characterMesh(head,profileGeometry(headRings,{segments:24,color:skinTone,warp:(p,a,r)=>{if(Math.cos(a)<0)p[2]=-headRings[r][2]*Math.pow(-Math.cos(a),.45)+headRings[r][3];return p;}}),m.skin,'Attendant_AdultFace');
  characterMesh(head,hairGeometry(),m.hair,'Attendant_CroppedHair');
  const eyes=characterMesh(head,faceDetailGeometry(),m.detail,'Attendant_EyesAndBrows');
  characterMesh(head,profileGeometry([[-.033,.006,.008,-.097],[-.009,.012,.010,-.102],[.018,.005,.007,-.084]],{segments:10,color:skinTone}),m.skin,'Attendant_NoseBridge');
  characterMesh(head,maskGeometry(),m.mask,'Attendant_FittedMask');
  const ears=[],loops=[];
  for(const side of [-1,1]){
    const ear=profileGeometry([[-.028,.008,.010],[0,.010,.014],[.027,.007,.009]],{segments:10,color:skinTone});ear.translate(side*.090,-.001,0);ears.push(ear);
    loops.push(strokeGeometry([[side*.087,-.026,-.085],[side*.105,.006,-.020],[side*.101,-.029,.006],[side*.094,-.052,-.021],[side*.086,-.079,-.089]],.0013));
  }
  mergedCharacterMesh(head,ears,m.skin,'Attendant_Ears');mergedCharacterMesh(head,loops,m.mask,'Attendant_MaskLoops');
  const arms=[],elbows=[],legs=[],knees=[],feet=[],contacts=[];
  const contactMap=footContactTexture();
  for(const side of [-1,1]){
    const arm=new THREE.Group();arm.name='Attendant_Shoulder_'+side;arm.position.set(side*.181,.456,0);torso.add(arm);arms.push(arm);
    characterMesh(arm,profileGeometry([[-.245,.044,.044],[-.187,.048,.049],[-.100,.053,.053],[-.035,.059,.053],[.016,.042,.043]]),m.cloth,'Attendant_Sleeve_'+side);
    const elbow=new THREE.Group();elbow.position.y=-.240;arm.add(elbow);elbows.push(elbow);
    characterMesh(elbow,profileGeometry([[-.265,.024,.029],[-.222,.026,.030],[-.166,.034,.035],[-.063,.043,.041],[.018,.044,.042]]),m.cloth,'Attendant_Forearm_'+side);
    const hand=new THREE.Group();hand.position.y=-.270;elbow.add(hand);
    const palm=profileGeometry([[-.106,.019,.018],[-.075,.030,.021],[-.034,.029,.018],[.016,.024,.025]],{segments:12,color:skinTone});
    const thumb=profileGeometry([[-.053,.010,.011],[-.020,.013,.012],[.013,.009,.010]],{segments:10,color:skinTone});thumb.rotateZ(side*.61);thumb.translate(side*.028,-.028,-.007);
    mergedCharacterMesh(hand,[palm,thumb],m.skin,'Attendant_Hand_'+side);
    const leg=new THREE.Group();leg.name='Attendant_Hip_'+side;leg.position.x=side*.086;hips.add(leg);legs.push(leg);
    characterMesh(leg,profileGeometry([[-THIGH-.018,.052,.056],[-.330,.057,.059],[-.232,.066,.067],[-.130,.073,.072],[.014,.075,.074]]),m.trousers,'Attendant_Thigh_'+side);
    const knee=new THREE.Group();knee.position.y=-THIGH;leg.add(knee);knees.push(knee);
    characterMesh(knee,profileGeometry([[-CALF+.006,.034,.036],[-.340,.036,.039],[-.230,.046,.048],[-.130,.052,.051],[.014,.052,.056]]),m.trousers,'Attendant_TrouserLeg_'+side);
    const foot=new THREE.Group();foot.name='Attendant_Ankle_'+side;foot.position.y=-CALF;knee.add(foot);feet.push(foot);
    characterMesh(foot,profileGeometry([[-.063,.059,.103,-.044],[-.039,.057,.101,-.044],[-.015,.050,.077,-.022],[.028,.035,.046,.003],[.054,.030,.040,.006]],{segments:16}),m.shoe,'Attendant_WorkShoe_'+side);
    characterMesh(foot,profileGeometry([[-.095,.057,.103,-.043],[-.082,.060,.106,-.044],[-.064,.061,.106,-.044]],{segments:16}),m.sole,'Attendant_ShoeSole_'+side);
    const contact=new THREE.Mesh(new THREE.PlaneGeometry(.17,.34),new THREE.MeshBasicMaterial({map:contactMap,transparent:true,opacity:1,depthWrite:false}));contact.name='Attendant_FootContact_'+side;contact.rotation.x=-Math.PI/2;contact.position.set(side*.086,.010,-.043);root.add(contact);contacts.push(contact);
  }
  let previousZ,phase=0,elapsed=0,motion=0,heading=0,turnInitialized=false;
  const actor={head,eyes,hips,torso,arms,elbows,legs,knees,feet,contacts,pose:{motion:0,phase:0,footTargets:[]},
    update(delta,state,player,{heading:requestedHeading}={}){
      const dt=Number.isFinite(delta)?THREE.MathUtils.clamp(delta,0,.25):0;
      const displacement=previousZ===undefined?0:state.z-previousZ;previousZ=state.z;
      const moved=dt>0&&Math.abs(displacement)>.000001&&Math.abs(displacement)<.3;
      if(moved){phase+=Math.abs(displacement)*Math.PI*2/.70;heading=displacement>0?Math.PI:0;}
      if(Number.isFinite(requestedHeading))heading=requestedHeading;
      const inspection=state.mode==='inspect';
      const playerDistance=player?Math.hypot(player.x-root.position.x,player.z-root.position.z):Infinity;
      let desiredHeading=inspection?-Math.PI/2:heading;
      if(!moved&&!inspection&&playerDistance<3.0)desiredHeading=Math.atan2(root.position.x-player.x,root.position.z-player.z);
      if(!turnInitialized){root.rotation.y=desiredHeading;turnInitialized=true;}
      else root.rotation.y+=THREE.MathUtils.clamp(wrappedAngle(desiredHeading-root.rotation.y),-dt*1.75,dt*1.75);
      elapsed+=dt;motion=THREE.MathUtils.damp(motion,moved?1:0,7,dt);
      hips.position.y=THREE.MathUtils.lerp(REST_HIP,WALK_HIP,motion)+Math.cos(phase*2)*.002*motion;
      hips.position.x=Math.sin(elapsed*.43)*.0025*(1-motion);
      torso.rotation.x=THREE.MathUtils.damp(torso.rotation.x,inspection?-.095:-.014*motion,6,dt);
      torso.rotation.z=Math.sin(phase)*.007*motion+Math.sin(elapsed*.57)*.003*(1-motion);
      torso.position.y=Math.sin(elapsed*1.15)*.0013;
      const footTargets=[];
      for(let i=0;i<2;i++){
        const cycle=((phase/(Math.PI*2)+i*.5)%1+1)%1,swing=cycle>=.60,t=swing?(cycle-.60)/.40:cycle/.60;
        const z=(swing?.21-.42*THREE.MathUtils.smoothstep(t,0,1):-.21+.42*t)*motion+(i===0?-.014:.018)*(1-motion);
        const lift=swing?Math.sin(t*Math.PI)*.052*motion:0;
        const roll=(swing?0:t<.14?.09*(1-t/.14):t>.86?-.10*(t-.86)/.14:0)*motion;
        const footY=.100+Math.abs(Math.sin(roll))*.16+lift;
        const dy=footY-hips.position.y,distance=Math.min(THIGH+CALF-.00015,Math.hypot(dy,z));
        const aim=Math.atan2(-z,-dy),hipAngle=Math.acos(THREE.MathUtils.clamp((THIGH*THIGH+distance*distance-CALF*CALF)/(2*THIGH*distance),-1,1));
        const flex=Math.PI-Math.acos(THREE.MathUtils.clamp((THIGH*THIGH+CALF*CALF-distance*distance)/(2*THIGH*CALF),-1,1));
        legs[i].rotation.x=aim+hipAngle;knees[i].rotation.x=-flex;feet[i].rotation.x=-(aim+hipAngle-flex)+roll;
        arms[i].rotation.x=THREE.MathUtils.damp(arms[i].rotation.x,inspection&&i===1?.42:-.055-Math.sin(phase+i*Math.PI)*.16*motion,8,dt);
        arms[i].rotation.z=(i===0?1:-1)*.035;elbows[i].rotation.x=THREE.MathUtils.damp(elbows[i].rotation.x,inspection&&i===1?.43:.14,7,dt);
        contacts[i].position.set((i===0?-1:1)*.086+hips.position.x,.010,z-.043);contacts[i].material.opacity=1-lift/.065;
        footTargets.push({z,y:footY,lift,stance:!swing});
      }
      let gaze=0;if(playerDistance<3.2)gaze=THREE.MathUtils.clamp(wrappedAngle(Math.atan2(root.position.x-player.x,root.position.z-player.z)-root.rotation.y),-.48,.48);
      head.rotation.y=THREE.MathUtils.damp(head.rotation.y,gaze,5,dt);head.rotation.x=THREE.MathUtils.damp(head.rotation.x,inspection?-.18:Math.sin(elapsed*.61)*.008,5,dt);
      Object.assign(actor.pose,{motion,phase,footTargets});
    }
  };
  actor.update(0,{z:root.position.z,mode:'patrol'});turnInitialized=false;return actor;
}
