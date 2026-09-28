// CharacterPortraitArt.js — lightweight procedural archival portraits.
// No external image/model payloads: identity is carried by silhouette, wardrobe, prop and gesture.

import { getCharacterProfile } from '../story/CharacterBible.js';
import { isIdentityRouteMode } from '../story/IdentityPrivacy.js';

const palette = {
  photo:{skin:'#9c8068',skinShadow:'#735d4d',hair:'#292824',coat:'#d8d0bc',coatShadow:'#aaa18f',line:'#3a3027',paper:'#c6b58f'},
  cctv:{skin:'#6d8172',skinShadow:'#46584b',hair:'#1e2821',coat:'#7f9182',coatShadow:'#536458',line:'#b0c8b5',paper:'#26352b'}
};

function ellipse(ctx,x,y,rx,ry,fill){
  ctx.fillStyle=fill;ctx.beginPath();ctx.ellipse(x,y,rx,ry,0,0,Math.PI*2);ctx.fill();
}

function line(ctx,x1,y1,x2,y2,width,color){
  ctx.strokeStyle=color;ctx.lineWidth=width;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
}

function roundRect(ctx,x,y,w,h,r,fill,stroke=null){
  ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fillStyle=fill;ctx.fill();
  if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=Math.max(1,w*.025);ctx.stroke();}
}

function drawHair(ctx,style,x,y,s,p){
  ctx.fillStyle=p.hair;
  if(style==='side_part'){
    ctx.beginPath();ctx.ellipse(x,y-19*s,36*s,25*s,-.08,Math.PI,Math.PI*2);ctx.fill();
    ctx.fillRect(x-35*s,y-22*s,70*s,12*s);
    line(ctx,x+3*s,y-42*s,x+31*s,y-30*s,3*s,p.skinShadow);
  }else if(style==='messy_side'){
    ctx.beginPath();ctx.moveTo(x-36*s,y-24*s);ctx.lineTo(x-24*s,y-47*s);ctx.lineTo(x-6*s,y-41*s);ctx.lineTo(x+8*s,y-51*s);ctx.lineTo(x+36*s,y-27*s);ctx.lineTo(x+30*s,y-10*s);ctx.lineTo(x-34*s,y-8*s);ctx.closePath();ctx.fill();
  }else if(style==='short_neat'||style==='crew'){
    ctx.beginPath();ctx.ellipse(x,y-23*s,34*s,20*s,0,Math.PI,Math.PI*2);ctx.fill();
    ctx.fillRect(x-33*s,y-24*s,66*s,10*s);
  }else if(style==='bob_tied'){
    ctx.beginPath();ctx.ellipse(x,y-18*s,37*s,29*s,0,Math.PI,Math.PI*2);ctx.fill();
    ctx.fillRect(x-35*s,y-20*s,70*s,27*s);
    ellipse(ctx,x+42*s,y-3*s,9*s,12*s,p.hair);
  }else if(style==='receding'){
    ctx.beginPath();ctx.ellipse(x,y-27*s,31*s,15*s,0,Math.PI,Math.PI*2);ctx.fill();
    ctx.fillRect(x-31*s,y-28*s,12*s,22*s);ctx.fillRect(x+19*s,y-28*s,12*s,22*s);
  }else if(style==='short_wave'){
    ctx.beginPath();ctx.ellipse(x,y-20*s,37*s,27*s,0,Math.PI,Math.PI*2);ctx.fill();
    for(let i=-2;i<=2;i++)ellipse(ctx,x+i*13*s,y-38*s+(Math.abs(i)%2)*4*s,12*s,9*s,p.hair);
  }else{
    ctx.beginPath();ctx.ellipse(x,y-23*s,34*s,22*s,0,Math.PI,Math.PI*2);ctx.fill();
  }
}

function drawFace(ctx,profile,x,y,s,p,obscure){
  const face=profile?.visual?.face||'oval';
  const scaleX={square:1.08,long:.91,angular:.96,round:1.04,broad:1.12,soft_square:1.04,rect:1.05}[face]||1;
  const scaleY={long:1.08,round:.94,broad:.97,rect:1.04}[face]||1;
  ellipse(ctx,x,y,31*s*scaleX,38*s*scaleY,p.skin);
  drawHair(ctx,profile?.visual?.hair||'short_soft',x,y,s,p);
  if(obscure){
    ctx.fillStyle='rgba(30,28,25,.62)';ctx.fillRect(x-36*s,y-14*s,72*s,24*s);
    return;
  }
  // Restrained archival facial marks; enough to distinguish age/attitude without portrait-photo payloads.
  line(ctx,x-16*s,y-5*s,x-7*s,y-7*s,2*s,p.line);
  line(ctx,x+7*s,y-7*s,x+16*s,y-5*s,2*s,p.line);
  line(ctx,x,y-1*s,x-2*s,y+10*s,2*s,p.skinShadow);
  line(ctx,x-8*s,y+18*s,x+8*s,y+18*s,2*s,p.line);
}

function drawCoat(ctx,profile,x,topY,s,p){
  const v=profile?.visual||{};
  const build=v.build||1;
  const role=profile?.role||'';
  const bodyW=76*s*build,bodyH=135*s;
  let coat=p.coat,edge=p.coatShadow;
  if(v.coat==='security'){coat='#38483e';edge='#26332c';}
  else if(v.coat==='admin'){coat='#8a776a';edge='#65574e';}
  else if(v.coat==='engineer'){coat='#72634d';edge='#514737';}
  else if(v.coat==='nurse'){coat='#d7dfd8';edge='#9eafa3';}
  roundRect(ctx,x-bodyW/2,topY,bodyW,bodyH,12*s,coat,edge);
  ctx.fillStyle=v.undershirt||'#66736d';
  ctx.beginPath();ctx.moveTo(x-17*s,topY+2*s);ctx.lineTo(x,topY+42*s);ctx.lineTo(x+17*s,topY+2*s);ctx.closePath();ctx.fill();
  if(v.coat==='open'){
    line(ctx,x-8*s,topY+18*s,x-19*s,topY+122*s,3*s,edge);
    line(ctx,x+8*s,topY+18*s,x+19*s,topY+122*s,3*s,edge);
  }else{
    line(ctx,x,topY+34*s,x,topY+126*s,2*s,edge);
  }
  if(role.includes('護理')){ctx.fillStyle=v.accent||'#5a756a';ctx.fillRect(x-bodyW*.35,topY+50*s,bodyW*.7,7*s);}
  return {bodyW,bodyH,topY};
}

function drawArms(ctx,profile,x,topY,s,p){
  const gesture=profile?.visual?.gesture||'record_check';
  const sleeve=p.coatShadow;
  if(gesture==='watch_check'){
    line(ctx,x-28*s,topY+50*s,x-4*s,topY+83*s,14*s,sleeve);
    line(ctx,x+27*s,topY+49*s,x+3*s,topY+81*s,14*s,sleeve);
    ellipse(ctx,x,topY+84*s,10*s,8*s,p.skin);
    ctx.strokeStyle='#4f4032';ctx.lineWidth=4*s;ctx.strokeRect(x-9*s,topY+78*s,18*s,12*s);
  }else if(gesture==='half_turn'){
    line(ctx,x-30*s,topY+50*s,x-49*s,topY+88*s,13*s,sleeve);
    line(ctx,x+28*s,topY+48*s,x+43*s,topY+76*s,13*s,sleeve);
  }else if(gesture==='walking_read'){
    line(ctx,x-28*s,topY+48*s,x-10*s,topY+92*s,13*s,sleeve);
    line(ctx,x+29*s,topY+48*s,x+12*s,topY+90*s,13*s,sleeve);
  }else if(gesture==='organize'||gesture==='sort_files'){
    line(ctx,x-28*s,topY+50*s,x-12*s,topY+96*s,13*s,sleeve);
    line(ctx,x+28*s,topY+50*s,x+14*s,topY+96*s,13*s,sleeve);
  }else if(gesture==='ledger_guard'){
    line(ctx,x-30*s,topY+54*s,x-38*s,topY+103*s,14*s,sleeve);
    line(ctx,x+30*s,topY+54*s,x+28*s,topY+103*s,14*s,sleeve);
  }else if(gesture==='urgent_point'){
    line(ctx,x-28*s,topY+50*s,x-44*s,topY+94*s,14*s,sleeve);
    line(ctx,x+28*s,topY+49*s,x+64*s,topY+65*s,13*s,sleeve);
    line(ctx,x+64*s,topY+65*s,x+79*s,topY+62*s,5*s,p.skin);
  }else{
    line(ctx,x-28*s,topY+52*s,x-14*s,topY+98*s,13*s,sleeve);
    line(ctx,x+28*s,topY+52*s,x+12*s,topY+97*s,13*s,sleeve);
  }
}

function drawProp(ctx,profile,x,topY,s,p){
  const prop=profile?.visual?.prop;
  if(prop==='black_mug'){
    ctx.fillStyle='#171817';ctx.fillRect(x+8*s,topY+82*s,25*s,27*s);
    ctx.strokeStyle='#171817';ctx.lineWidth=4*s;ctx.beginPath();ctx.arc(x+35*s,topY+95*s,9*s,-Math.PI/2,Math.PI/2);ctx.stroke();
    ctx.strokeStyle='rgba(235,225,205,.35)';ctx.lineWidth=2*s;ctx.beginPath();ctx.moveTo(x+16*s,topY+78*s);ctx.bezierCurveTo(x+8*s,topY+67*s,x+30*s,topY+66*s,x+23*s,topY+54*s);ctx.stroke();
  }else if(prop==='red_pen_watch'){
    ctx.strokeStyle='#7f2e2d';ctx.lineWidth=4*s;ctx.beginPath();ctx.moveTo(x+18*s,topY+45*s);ctx.lineTo(x+30*s,topY+74*s);ctx.stroke();
  }else if(prop==='note_camera'){
    ctx.fillStyle=p.paper;ctx.fillRect(x-4*s,topY+81*s,31*s,24*s);
    ctx.strokeStyle='#3d352b';ctx.lineWidth=2*s;ctx.strokeRect(x-50*s,topY+70*s,27*s,21*s);ellipse(ctx,x-36*s,topY+80*s,6*s,6*s,'#222');
  }else if(prop==='transfer_folder'){
    ctx.fillStyle='#4f6659';ctx.fillRect(x-25*s,topY+79*s,52*s,34*s);
    ctx.fillStyle='#d9d5bd';ctx.fillRect(x-20*s,topY+84*s,42*s,4*s);
  }else if(prop==='green_chart_timer'){
    ctx.fillStyle='#466b5a';ctx.fillRect(x-28*s,topY+78*s,55*s,37*s);
    ctx.strokeStyle='#d8d8c8';ctx.lineWidth=2*s;ctx.strokeRect(x+32*s,topY+78*s,16*s,21*s);
  }else if(prop==='purple_key_thermos'){
    ctx.fillStyle='#5b3d63';ctx.fillRect(x-38*s,topY+84*s,12*s,24*s);ellipse(ctx,x-32*s,topY+84*s,6*s,6*s,'#7c5a86');
    ctx.fillStyle='#777369';ctx.fillRect(x+25*s,topY+70*s,21*s,45*s);
  }else if(prop==='photo_index_pencil'){
    ctx.fillStyle='#d7c9a4';ctx.fillRect(x-29*s,topY+80*s,57*s,38*s);
    line(ctx,x+21*s,topY+75*s,x+44*s,topY+112*s,4*s,'#76562f');
  }else if(prop==='toolbox_tag'){
    ctx.fillStyle='#4b4539';ctx.fillRect(x-46*s,topY+91*s,64*s,36*s);
    ctx.strokeStyle='#9a8b65';ctx.lineWidth=3*s;ctx.strokeRect(x-35*s,topY+82*s,42*s,15*s);
    ctx.fillStyle='#c8a96e';ctx.fillRect(x+25*s,topY+62*s,22*s,33*s);
  }
}

export function drawCharacterFigure(ctx,name,x,baseY,scale=1,{cctv=false,label=false,obscure=false,showProp=true}={}){
  label = label && !isIdentityRouteMode();
  if(name==='Annie'){
    const p=cctv?palette.cctv:palette.photo,s=scale;
    // Old CPR mannequin: blank vinyl face, wig, yellowed coat, rigid teaching-joint silhouette.
    roundRect(ctx,x-38*s,baseY-141*s,76*s,136*s,10*s,cctv?'#89958a':'#c4baa0',cctv?'#5b6a5e':'#8e846f');
    ellipse(ctx,x,baseY-181*s,31*s,38*s,cctv?'#849487':'#c8bea7');
    ctx.fillStyle=cctv?'#263129':'#39342d';ctx.beginPath();ctx.ellipse(x,baseY-204*s,35*s,23*s,0,Math.PI,Math.PI*2);ctx.fill();
    ellipse(ctx,x,baseY-180*s,5*s,8*s,cctv?'#6e7d72':'#a69b86');
    line(ctx,x-27*s,baseY-89*s,x-48*s,baseY-38*s,13*s,cctv?'#657267':'#9e957f');
    line(ctx,x+27*s,baseY-89*s,x+48*s,baseY-38*s,13*s,cctv?'#657267':'#9e957f');
    for(const [jx,jy] of [[-48,-38],[48,-38],[-22,4],[22,4]])ellipse(ctx,x+jx*s,baseY+jy*s,6*s,6*s,cctv?'#4e5e52':'#827866');
    if(label){ctx.fillStyle=cctv?'#d4ded5':'#30291f';ctx.font=`${Math.max(14,20*s)}px sans-serif`;ctx.textAlign='center';ctx.fillText(name,x,baseY+82*s);ctx.textAlign='left';}
    return null;
  }
  const profile=getCharacterProfile(name);
  const p=cctv?palette.cctv:palette.photo;
  const s=scale*(profile?.visual?.height||1);
  const build=profile?.visual?.build||1;
  const headY=baseY-181*s;
  drawCoat(ctx,profile,x,baseY-141*s,s,p);
  drawArms(ctx,profile,x,baseY-141*s,s,p);
  drawFace(ctx,profile,x,headY,s,p,obscure);
  if(showProp)drawProp(ctx,profile,x,baseY-141*s,s,p);
  // legs/stance make silhouettes distinct even at wall-photo scale.
  const stance=(profile?.visual?.gesture==='walking_read'||profile?.visual?.gesture==='urgent_point')?22:13;
  line(ctx,x-18*s*build,baseY-8*s,x-(17+stance)*s,baseY+55*s,16*s,p.coatShadow);
  line(ctx,x+18*s*build,baseY-8*s,x+(17+stance*.6)*s,baseY+55*s,16*s,p.coatShadow);
  if(label){
    ctx.fillStyle=cctv?'#d4ded5':'#30291f';ctx.font=`${Math.max(14,20*s)}px sans-serif`;ctx.textAlign='center';ctx.fillText(name,x,baseY+82*s);ctx.textAlign='left';
  }
  return profile;
}

export function drawCharacterStrip(ctx,names,{left=90,right=null,baseY=460,cctv=false,labels=true,maxScale=1}={}){
  const list=(names||[]).filter(Boolean);
  if(!list.length)return;
  right=right??(ctx.canvas.width-90);
  const span=right-left,slot=span/list.length;
  const scale=Math.min(maxScale,Math.max(.48,slot/185));
  list.forEach((name,i)=>{
    const x=left+slot*(i+.5);
    const obscure=name==='未知醫師'||name==='被刪除的醫師'||name==='另一個值班醫師';
    drawCharacterFigure(ctx,name,x,baseY,scale,{cctv,label:labels,obscure});
    if(name==='被刪除的醫師'){
      ctx.save();ctx.strokeStyle=cctv?'rgba(190,220,198,.42)':'rgba(248,238,210,.62)';ctx.lineWidth=9;
      for(let k=-2;k<=2;k++){ctx.beginPath();ctx.moveTo(x-58*scale,baseY-190*scale+k*22*scale);ctx.lineTo(x+61*scale,baseY-120*scale+k*19*scale);ctx.stroke();}
      ctx.restore();
    }
  });
}
