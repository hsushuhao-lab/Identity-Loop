// Canvas foregrounds for the two M6 films. The shared memory-fragment atlas stays
// underneath; no image fetch, character label or extra WebGL context is needed.
export function drawIdentityM6Memory(ctx, sequence, frame, width, height, elapsedMs = 0) {
  const li = sequence.id === 'LI_6F_ORDER_MEMORY';
  if (!li && sequence.id !== 'ZHOU_6F_WARNING_MEMORY') return false;
  const t = Math.min(1, Math.max(0, elapsedMs) / 4000);
  const ink = li ? '#b8bfa9' : '#e2ddcf';
  const accent = li ? '#c5a35f' : '#b8c4c0';
  const rect = (x,y,w,h,fill,stroke) => {
    if (fill) { ctx.fillStyle=fill;ctx.fillRect(x,y,w,h); }
    if (stroke) { ctx.strokeStyle=stroke;ctx.lineWidth=3;ctx.strokeRect(x,y,w,h); }
  };
  const text = (s,x,y,size=24,color=ink) => {
    ctx.fillStyle=color;ctx.font=`${size}px ui-monospace, monospace`;ctx.fillText(s,x,y);
  };
  const line = (x1,y1,x2,y2,color=ink) => {
    ctx.strokeStyle=color;ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
  };
  const circle = (x,y,r,color) => {
    ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=color;ctx.fill();
  };
  const paper = (x,y,label) => {
    rect(x,y,330,240,'#b8b29c','#d9d2bb');
    text(label,x+24,y+42,24,'#343a36');
    for(let i=0;i<5;i++)line(x+24,y+76+i*27,x+302,y+76+i*27,'#6e756c');
  };
  const hand = (x,y,pen=false) => {
    ctx.save();ctx.translate(x,y);
    rect(-75,80,105,150,'#adb5aa','#303b36');rect(-78,76,110,25,'#d1d3bd');
    circle(-20,50,36,'#8a9486');rect(-40,-8,21,76,'#a1a797');
    if(pen){rect(-37,-58,7,124,'#a54c3e');circle(-32,28,10,accent);}
    else circle(-27,91,8,accent);
    ctx.restore();
  };
  const camera = (x,y,scale=1) => {
    ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
    rect(-150,-74,300,170,'#242c2b',ink);rect(-72,-110,108,36,'#48534e',ink);
    circle(12,8,69,'#78827c');circle(12,8,54,'#101a1b');circle(12,8,32,'#314342');
    rect(-127,-57,42,27,'#858b7c');rect(105,-89,22,16,accent);
    line(-170,13,-206,190,'#555e57');line(170,13,206,190,'#555e57');
    ctx.restore();
  };
  const dial = (x,y,digital=false) => {
    if(digital){rect(x-93,y-43,186,86,'#252d2d',ink);rect(x-77,y-27,154,51,'#95a496');text('CASIO',x-41,y-48,18);text(`02:17:${String(10+Math.floor(t*4)).padStart(2,'0')}`,x-70,y+9,26,'#202c27');}
    else{circle(x,y,57,accent);circle(x,y,49,'#d9d3b7');line(x,y,x+25,y-15,'#374239');line(x,y,x-12,y-31,'#374239');const a=t*Math.PI*2;line(x,y,x+40*Math.sin(a),y-40*Math.cos(a),'#a74638');}
  };
  const doorway = (gap=0) => {
    rect(302,18,392,342,'#1a2625',ink);rect(313,28,177-gap,320,'#3b4841','#6e7a6f');rect(501+gap,28,181-gap,320,'#3b4841','#6e7a6f');
    line(489-gap,142,489-gap,207,accent);line(515+gap,142,515+gap,207,accent);
    rect(436,42,126,38,'#b6b7a1');text('409-A',449,70,26,'#303831');
  };

  ctx.save();ctx.translate(72,178);ctx.scale((width-144)/1000,(height-245)/380);
  ctx.beginPath();ctx.rect(0,0,1000,380);ctx.clip();
  rect(0,0,1000,380,li?'rgba(14,27,25,.84)':'rgba(23,28,27,.86)');
  // Slow optical drift and exposure changes make the memories move between cuts.
  ctx.translate((t-.5)*8, (t-.5)*3);
  switch(frame.m6Shot){
    case 'cuff':
      paper(420,65,'HANDOVER / UNSIGNED');hand(430+Math.sin(t*6)*6,180,true);dial(355,288);text('17:00',70,86,52,accent);break;
    case 'forms':
      for(let i=0;i<3;i++)paper(230+i*47+t*18,30+i*34,'409-A / COPY');
      rect(600,171,265,80,undefined,'#bd6f59');text('NOT VERIFIED',616,220,30,'#df9984');hand(660,233,true);break;
    case 'switches': {
      rect(136,53,724,255,'#35413c',ink);const active=[0,2,3][Math.min(2,Math.floor(t*3))];
      for(let i=0;i<4;i++){const x=208+i*176;rect(x-41,114,82,123,'#172521',accent);rect(x-25,136+(i===active?31:0),50,29,i===active?'#ba6651':'#8a967e');text(String(i+1),x-10,92,31);}
      text('MEMORY ONLY / NOT A LIVE CONTROL',209,351,26,'#df9984');break;
    }
    case 'door': doorway((1-t)*39);hand(505,214);rect(768,82,167,105,'#999e8b');text('COMPLETE',778,140,25,'#703e35');break;
    case 'coat':
      doorway(22);circle(506,100,40,'#3c4941');ctx.fillStyle='#b3b9a8';ctx.beginPath();ctx.moveTo(451,142);ctx.lineTo(561,142);ctx.lineTo(603,343);ctx.lineTo(414,343);ctx.closePath();ctx.fill();
      rect(520,169,45,24,'#68766b');hand(600,210);text('NAME: UNRESOLVED',62,66,28);break;
    case 'hold': paper(324,57,'SIGNATURE: __________');hand(609,213-t*14,true);text('HOLD / VERIFY FIRST',64,347,27,accent);break;
    case 'viewfinder':
      rect(402,90,300,213,'#444e49',ink);for(let i=0;i<4;i++)rect(426+i*60,145,34,99,'#182725',accent);
      circle(542,151,22+Math.sin(t*9)*5,'#c6c4a8');
      for(const [x,y,dx,dy] of [[116,48,1,1],[881,48,-1,1],[116,318,1,-1],[881,318,-1,-1]]){line(x,y,x+dx*72,y);line(x,y,x,y+dy*54);}
      line(480,186,520,186);line(500,166,500,206);text('27 / FOCUS',132,91,25);break;
    case 'camera': camera(500,191,1.14);dial(212,300,true);text(t<.55?'FRAME 27':'FRAME 28',742,73,28);break;
    case 'memo': paper(189,53,'409-A / NOT SENT');camera(746,269,.69);text('WAIT / DO NOT ...',224,183,27,'#343a36');line(622,54,421,341,'#3d4841');break;
    case 'delay':
      doorway(10);for(let i=0;i<3;i++){rect(43+i*26,104+i*32,220,145,'#899189',ink);rect(56+i*26,115+i*32,194,112,'#35433e');}
      dial(815,93,true);text('STILL HERE',707,261,29);break;
    case 'bed':
      rect(173,188,607,73,'#aeb7a7',ink);line(174,168,174,329);line(780,176,780,329);line(185,265,773,265);rect(191,183,113,42,'#d4d6c5');
      text('408C',105,89,45);circle(854,156,16+Math.sin(t*10)*4,'#d6bc8b');paper(567,278,'NOT SENT');break;
    case 'lower':
      doorway(38);camera(500,205+t*214,1.2);paper(68,286,'WARNING');text('DELIVER THE WARNING',621,91,26);break;
  }
  if(!li&&['viewfinder','camera'].includes(frame.m6Shot)&&elapsedMs<240){
    rect(0,0,1000,380,`rgba(248,247,233,${.45*(1-elapsedMs/240)})`);
  }
  ctx.restore();
  return true;
}
