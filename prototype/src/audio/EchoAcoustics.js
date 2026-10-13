import {soundManager} from './SoundManager.js';
// One short spatial burst, at most three oscillators; no background timer/audio file.
export class EchoAcoustics {
  constructor({sound=soundManager}={}){this.sound=sound;this.nodes=new Set();this.bursts=0;}
  muted(){return this.sound.isMuted;}
  stop(){for(const node of this.nodes)try{node.stop();}catch{}this.nodes.clear();}
  play(position,camera,level=1,kind='relay'){
    const ctx=this.sound.ctx;if(!camera||!ctx||ctx.state!=='running'||!this.sound.userUnlocked||this.sound.isMuted||this.nodes.size)return false;
    const direction=camera.getWorldDirection(camera.position.clone()),listener=ctx.listener;
    if(listener.positionX){listener.positionX.value=camera.position.x;listener.positionY.value=camera.position.y;listener.positionZ.value=camera.position.z;listener.forwardX.value=direction.x;listener.forwardY.value=direction.y;listener.forwardZ.value=direction.z;listener.upX.value=0;listener.upY.value=1;listener.upZ.value=0;}
    else{listener.setPosition(camera.position.x,camera.position.y,camera.position.z);listener.setOrientation(direction.x,direction.y,direction.z,0,1,0);}
    const panner=ctx.createPanner();panner.panningModel='HRTF';panner.distanceModel='inverse';panner.refDistance=1.4;panner.rolloffFactor=.8;
    if(panner.positionX){panner.positionX.value=position.x;panner.positionY.value=position.y;panner.positionZ.value=position.z;}else panner.setPosition(position.x,position.y,position.z);
    const gain=ctx.createGain();gain.gain.value=.012;panner.connect(gain);gain.connect(ctx.destination);
    const types=kind==='overview'?['paper','relay','air']:kind==='paper'?['paper','paper']:kind==='air'?['air','air']:['relay','relay','relay'];
    if(!this.noise||this.noiseContext!==ctx){this.noiseContext=ctx;this.noise=ctx.createBuffer(1,Math.floor(ctx.sampleRate*.26),ctx.sampleRate);const data=this.noise.getChannelData(0);let seed=9173;for(let i=0;i<data.length;i++){seed=(seed*1664525+1013904223)>>>0;data[i]=(seed/4294967296*2-1)*.45;}}
    let remaining=types.length;const time=ctx.currentTime;
    for(let i=0;i<types.length;i++){
      const type=types[i],oscillator=type==='relay'?ctx.createOscillator():ctx.createBufferSource(),envelope=ctx.createGain(),at=time+i*.16,filter=ctx.createBiquadFilter();
      if(type==='relay'){oscillator.type='triangle';oscillator.frequency.value=760+i*113-level*17;filter.type='lowpass';filter.frequency.value=1800;}
      else{oscillator.buffer=this.noise;filter.type=type==='paper'?'highpass':'bandpass';filter.frequency.value=type==='paper'?1500:520-level*37;filter.Q.value=2.4;}
      const duration=type==='relay'?.075:.23;
      envelope.gain.setValueAtTime(0,at);envelope.gain.linearRampToValueAtTime(type==='relay'?.4:.7,at+.015);envelope.gain.exponentialRampToValueAtTime(.001,at+duration);
      oscillator.connect(filter);filter.connect(envelope);envelope.connect(panner);this.nodes.add(oscillator);
      oscillator.onended=()=>{this.nodes.delete(oscillator);oscillator.disconnect();filter.disconnect();envelope.disconnect();if(--remaining===0){panner.disconnect();gain.disconnect();}};
      oscillator.start(at);oscillator.stop(at+duration+.01);
    }
    this.bursts++;return true;
  }
}
