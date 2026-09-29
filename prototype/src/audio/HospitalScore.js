// Original chamber-ambient score. Four motifs share one hospital sound world.
// Enveloped phrases evolve over 48 seconds; no external recordings or parallel context.
export const SCORE_MOTIFS=Object.freeze({
  ZHANG:[0,7,3,10], LI:[0,1,7,5], ZHOU:[0,6,2,9], CHEN:[0,5,7,2]
});
export function scoreMood(zone='',step='',position={}){
  if(zone==='phantom_6f'||step==='M6')return 'memory';
  if(zone==='b2_archive'||zone==='b1_dispatch_hub')return 'archive';
  if(zone==='second_campus_5f'&&position.z>2)return 'rest';
  if(zone==='first_campus_4f'&&position.x< -8&&position.z>2)return 'rest';
  if(zone==='second_campus_2f'||zone==='first_campus_2f')return 'monitor';
  if((zone==='first_campus_4f'&&step==='M2')||zone==='skybridge')return 'threat';
  return 'explore';
}
const MOODS=Object.freeze({
  explore:{root:43,tempo:3,level:.12,cutoff:950},
  rest:{root:40,tempo:4,level:.075,cutoff:650},
  monitor:{root:42,tempo:2,level:.12,cutoff:1250},
  threat:{root:37,tempo:1.35,level:.15,cutoff:1500},
  memory:{root:39,tempo:1.7,level:.13,cutoff:1800},
  archive:{root:35,tempo:3.7,level:.105,cutoff:750}
});
export function scorePhrase(identity,mood,phrase=0){
  const p=MOODS[mood]||MOODS.explore,motif=SCORE_MOTIFS[identity]||SCORE_MOTIFS.ZHANG;
  const root=p.root+[0,-2,3,-5][phrase%4];
  const events=[{at:0,midi:root,duration:11.8,kind:'bow',level:.22,pan:-.24},
    {at:.4,midi:root+7,duration:10.8,kind:'bow',level:.10,pan:.25}];
  for(let i=0;i<Math.floor(11/p.tempo);i++){
    const note={at:.8+i*p.tempo+(i%2?.13:0),midi:root+24+motif[(i+phrase)%4],duration:2.8,kind:'piano',level:.20,pan:i%2?.42:-.42};
    events.push(note,{...note,at:note.at+.43,level:.055,pan:-note.pan});
  }
  // Widely spaced, inharmonic metal residue rather than a constant alarm.
  if(mood==='monitor'||mood==='memory'||mood==='threat')events.push({at:7.1,midi:root+38,duration:3.1,kind:'metal',level:.08,pan:.60});
  return {identity,mood,phrase,level:p.level,cutoff:p.cutoff,events};
}

export class HospitalScore{
  constructor(ctx,identity,step){
    this.ctx=ctx;this.identity=identity;this.step=step;this.phrase=0;this.voices=new Set();this.stopped=false;
    this.gain=ctx.createGain();this.gain.gain.value=1;
    this.filter=ctx.createBiquadFilter();this.filter.type='lowpass';this.filter.Q.value=.55;
    this.limiter=ctx.createDynamicsCompressor();this.limiter.threshold.value=-20;this.limiter.knee.value=10;this.limiter.ratio.value=4;this.limiter.attack.value=.015;this.limiter.release.value=.35;
    this.filter.connect(this.gain);this.gain.connect(this.limiter);this.limiter.connect(ctx.destination);
    this.next=ctx.currentTime+.06;
  }
  playPhrase(mood,at=this.ctx.currentTime){
    const plan=scorePhrase(this.identity,mood,this.phrase++);
    this.mood=mood;this.lastPlan=plan;this.filter.frequency.setTargetAtTime(plan.cutoff,at,.7);
    for(const event of plan.events){
      const start=at+event.at,end=start+event.duration;
      const amp=this.ctx.createGain();const pan=this.ctx.createStereoPanner();pan.pan.value=event.pan;
      amp.gain.setValueAtTime(.00001,start);
      amp.gain.linearRampToValueAtTime(plan.level*event.level,start+(event.kind==='bow'?1.8:.015));
      amp.gain.exponentialRampToValueAtTime(.00001,end);amp.connect(pan);pan.connect(this.filter);
      const partials=event.kind==='piano'?[1,2.006,3.97]:event.kind==='metal'?[1,2.71,4.13]:[1,1.003];
      let remaining=partials.length;
      for(const [index,partial]of partials.entries()){
        const osc=this.ctx.createOscillator(),weight=this.ctx.createGain();
        osc.type='sine';osc.frequency.value=440*Math.pow(2,(event.midi-69)/12)*partial;
        weight.gain.value=index===0?1:event.kind==='bow'?.35:.18/(index+1);
        osc.connect(weight);weight.connect(amp);this.voices.add(osc);
        osc.onended=()=>{this.voices.delete(osc);osc.disconnect();weight.disconnect();if(--remaining===0){amp.disconnect();pan.disconnect();}};
        osc.start(start);osc.stop(end+.02);
      }
    }
    return plan;
  }
  start(getEnvironment){
    const tick=()=>{
      if(this.stopped)return;
      const env=getEnvironment();const now=this.ctx.currentTime;
      const mood=scoreMood(env.zone,this.step,env.position);
      if(this.mood&&mood!==this.mood){
        // Let the phrase decay naturally; next chord answers the new room within 3 seconds.
        this.next=Math.min(this.next,now+3);
      }
      if(this.next<now-.2)this.next=now+.05;
      if(this.next<=now+.25){this.playPhrase(mood,this.next);this.next+=12;}
      this.gain.gain.setTargetAtTime(env.muted?0:env.duck?.22:1,now,.20);
    };
    tick();this.timer=setInterval(tick,200);this.timer.unref?.();
  }
  stop(){
    if(this.stopped)return;this.stopped=true;clearInterval(this.timer);
    const now=this.ctx.currentTime;this.gain.gain.cancelScheduledValues(now);this.gain.gain.setTargetAtTime(.00001,now,.15);
    for(const osc of this.voices){try{osc.stop(now+.8);}catch{}}
    const cleanup=setTimeout(()=>{this.filter.disconnect();this.gain.disconnect();this.limiter.disconnect();},1000);cleanup.unref?.();
  }
}
