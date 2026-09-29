// SoundManager.js - Procedural Web Audio synthesizer for hospital ambience and interactions
export class SoundManager {
  constructor() {
    this.ctx = null;
    this.ambientGain = null;
    this.ambientPlaying = false;
    this.isMuted = false;
    this.userUnlocked = false;
    this.phoneRingTimer = null;
    this.phoneOscillators = new Set();
    this.phoneRingActive = false;
    this.debugCounters = {phoneBurst:0};
    this.pendingRouteTheme=null;
    this.routeTheme=null;
  }

  init() { return this.ensureRunning(); }

  async ensureRunning() {
    if(this.resumePromise)return this.resumePromise;
    this.resumePromise=(async()=>{
      try {
        if(!this.ctx||this.ctx.state==='closed'){
          const AudioCtx=window.AudioContext||window.webkitAudioContext;
          this.ctx=new AudioCtx();this.ambientPlaying=false;this.ambientGain=null;
        }
        const recovering=!this.userUnlocked||this.ctx.state!=='running';
        if(this.ctx.state!=='running')await this.ctx.resume();
        if(this.ctx.state!=='running')return false;
        this.userUnlocked=true;this.startAmbient();this.applyPendingRouteTheme();
        if(recovering&&this.phoneRingActive)this.playPhoneRingPattern();
        return true;
      }catch(error){console.warn('[audio] unlock failed',error);return false;}
    })();
    try{return await this.resumePromise;}finally{this.resumePromise=null;}
  }

  installUnlockHandlers() {
    if(this.unlockHandler)return;
    this.unlockHandler=event=>{if(event.isTrusted)void this.ensureRunning();};
    for(const type of ['pointerdown','keydown','touchstart'])document.addEventListener(type,this.unlockHandler,true);
    document.addEventListener('visibilitychange',()=>{
      if(document.visibilityState==='visible'&&this.userUnlocked)void this.ensureRunning();
    });
  }

  startPhoneRing() {
    if(this.phoneRingActive)return;
    this.phoneRingActive=true;
    this.playPhoneRingPattern();
    this.phoneRingTimer=setInterval(()=>this.playPhoneRingPattern(),4200);
  }

  stopPhoneRing() {
    this.phoneRingActive=false;
    clearInterval(this.phoneRingTimer);this.phoneRingTimer=null;
    for(const oscillator of this.phoneOscillators){try{oscillator.stop();}catch{}}
    this.phoneOscillators.clear();
  }

  startAmbient() {
    if (this.ambientPlaying || !this.ctx) return;
    try {
      // Low air conditioning / ventilation hum
      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = this.ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      // Filter to simulate distant air duct drone (50Hz - 220Hz)
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 95;
      filter.Q.value = 1.8;

      this.ambientGain = this.ctx.createGain();
      this.ambientGain.gain.value = 0.08;

      whiteNoise.connect(filter);
      filter.connect(this.ambientGain);
      this.ambientGain.connect(this.ctx.destination);

      whiteNoise.start();
      this.ambientPlaying = true;
    } catch (e) {
      console.warn('Ambient sound failed:', e);
    }
  }

  setRouteTheme(identity,step){
    this.pendingRouteTheme={identity,step};
    if(this.ctx?.state==='running')this.applyPendingRouteTheme();
  }

  applyPendingRouteTheme(){
    if(!this.ctx||this.ctx.state!=='running'||!this.pendingRouteTheme)return;
    const {identity,step}=this.pendingRouteTheme,now=this.ctx.currentTime;
    if(this.routeTheme?.identity===identity&&this.routeTheme?.step===step)return;
    if(this.routeTheme){
      const previous=this.routeTheme;
      previous.gain.gain.cancelScheduledValues(now);
      previous.gain.gain.setValueAtTime(previous.gain.gain.value,now);
      previous.gain.gain.linearRampToValueAtTime(.0001,now+.65);
      for(const oscillator of previous.oscillators)oscillator.stop(now+.7);
      this.routeTheme=null;
    }
    if(!identity||step==='M9'||step==='ENDING'||this.isMuted)return;
    const profiles={ZHANG:{wave:'sine',notes:[55,82.41],level:.035},LI:{wave:'triangle',notes:[61.74,92.5],level:.026},ZHOU:{wave:'sawtooth',notes:[73.42,110],level:.022},CHEN:{wave:'square',notes:[46.25,69.3],level:.024}};
    const profile=profiles[identity];if(!profile)return;
    try{
      const gain=this.ctx.createGain();gain.gain.setValueAtTime(.0001,now);gain.gain.linearRampToValueAtTime(profile.level,now+1.4);gain.connect(this.ctx.destination);
      const filter=this.ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=identity==='ZHOU'?420:identity==='LI'?260:180;filter.Q.value=.7;filter.connect(gain);
      const oscillators=profile.notes.map((frequency,index)=>{const oscillator=this.ctx.createOscillator();oscillator.type=profile.wave;oscillator.frequency.setValueAtTime(frequency,now);oscillator.detune.value=index?3:-2;oscillator.connect(filter);oscillator.start(now);return oscillator;});
      this.routeTheme={identity,step,gain,oscillators};
    }catch(error){console.warn('[audio] route theme unavailable',error);}
  }

  playFootstep() {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(90 + Math.random() * 30, now);
      osc.frequency.exponentialRampToValueAtTime(30, now + 0.08);

      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.08);
    } catch (e) {}
  }

  playKeyPickup() {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      // Multiple metal resonance rings
      const freqs = [1800, 2400, 3200];
      freqs.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq + Math.random() * 80, now + idx * 0.04);

        gain.gain.setValueAtTime(0.12, now + idx * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.3);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.04);
        osc.stop(now + idx * 0.04 + 0.35);
      });
    } catch (e) {}
  }

  playPaperSign() {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const bufferSize = this.ctx.sampleRate * 0.3;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.sin((i / bufferSize) * Math.PI * 4);
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 2800;
      filter.Q.value = 3.0;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      noise.start(now);
      noise.stop(now + 0.3);
    } catch (e) {}
  }

  playElevatorChime() {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      // First chime: 660 Hz (E5)
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now);
      gain1.gain.setValueAtTime(0.2, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
      osc1.connect(gain1);
      gain1.connect(this.ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.8);

      // Second chime: 523.25 Hz (C5)
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(523.25, now + 0.4);
      gain2.gain.setValueAtTime(0.25, now + 0.4);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.4);
      osc2.connect(gain2);
      gain2.connect(this.ctx.destination);
      osc2.start(now + 0.4);
      osc2.stop(now + 1.4);
    } catch (e) {}
  }

  playElevatorMotor() {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(55, now);
      osc.frequency.linearRampToValueAtTime(65, now + 1.5);
      osc.frequency.linearRampToValueAtTime(45, now + 3.0);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.1, now + 0.5);
      gain.gain.linearRampToValueAtTime(0.1, now + 2.5);
      gain.gain.linearRampToValueAtTime(0.001, now + 3.2);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 180;

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 3.2);
    } catch (e) {}
  }

  playComputerBeep() {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(1174.66, now + 0.08);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.2);
    } catch (e) {}
  }

  playPhoneRingPattern() {
    if (!this.ctx || this.ctx.state!=='running' || this.isMuted) return;
    try {
      const ringAt=(t)=>{
        for(const [freq,offset] of [[930,0],[1380,.055],[1040,.11]]){
          const osc=this.ctx.createOscillator();const gain=this.ctx.createGain();
          this.phoneOscillators.add(osc);osc.onended=()=>this.phoneOscillators.delete(osc);
          osc.type='square';osc.frequency.setValueAtTime(freq,t+offset);
          gain.gain.setValueAtTime(.001,t+offset);
          gain.gain.linearRampToValueAtTime(.13,t+offset+.012);
          gain.gain.exponentialRampToValueAtTime(.001,t+offset+.30);
          osc.connect(gain);gain.connect(this.ctx.destination);
          osc.start(t+offset);osc.stop(t+offset+.32);
        }
      };
      const now=this.ctx.currentTime;
      ringAt(now);ringAt(now+.48);ringAt(now+2.35);ringAt(now+2.83);
      this.debugCounters.phoneBurst++;
    } catch (e) {}
  }

  playBed33KnockPattern(volume=.13) {
    if(!this.ctx||this.isMuted)return;
    try{
      const now=this.ctx.currentTime;
      const knockAt=(t)=>{
        const osc=this.ctx.createOscillator(),gain=this.ctx.createGain(),filter=this.ctx.createBiquadFilter();
        osc.type='triangle';osc.frequency.setValueAtTime(92,t);osc.frequency.exponentialRampToValueAtTime(42,t+.08);
        filter.type='lowpass';filter.frequency.value=280;
        gain.gain.setValueAtTime(volume,t);gain.gain.exponentialRampToValueAtTime(.001,t+.11);
        osc.connect(filter);filter.connect(gain);gain.connect(this.ctx.destination);osc.start(t);osc.stop(t+.13);
      };
      let t=now;
      for(let i=0;i<4;i++){knockAt(t);t+=.31;}
      t+=1.18;
      for(let i=0;i<9;i++){knockAt(t);t+=.28;}
    }catch(e){}
  }

  playFuriousWallKnockPattern(volume=.16) {
    if(!this.ctx||this.isMuted)return;
    try{
      const now=this.ctx.currentTime;
      const offsets=[0,.11,.21,.31,.54,.63,.72,.89,1.03,1.14,1.23,1.39,1.47,1.62];
      offsets.forEach((offset,index)=>{
        const t=now+offset;
        const osc=this.ctx.createOscillator(),gain=this.ctx.createGain(),filter=this.ctx.createBiquadFilter();
        osc.type=index%3===0?'sawtooth':'triangle';
        osc.frequency.setValueAtTime(118+(index%4)*17,t);
        osc.frequency.exponentialRampToValueAtTime(38+(index%3)*8,t+.075);
        filter.type='lowpass';filter.frequency.value=340;
        const level=volume*(index%5===0?.72:1+(index%3)*.12);
        gain.gain.setValueAtTime(level,t);gain.gain.exponentialRampToValueAtTime(.001,t+.105);
        osc.connect(filter);filter.connect(gain);gain.connect(this.ctx.destination);
        osc.start(t);osc.stop(t+.12);
      });
    }catch(e){}
  }

  playCprCompression(){
    if(!this.ctx||this.isMuted)return;
    const now=this.ctx.currentTime,osc=this.ctx.createOscillator(),gain=this.ctx.createGain(),filter=this.ctx.createBiquadFilter();
    osc.type='sine';osc.frequency.setValueAtTime(74,now);osc.frequency.exponentialRampToValueAtTime(38,now+.16);
    filter.type='lowpass';filter.frequency.value=150;
    gain.gain.setValueAtTime(.11,now);gain.gain.exponentialRampToValueAtTime(.001,now+.19);
    osc.connect(filter);filter.connect(gain);gain.connect(this.ctx.destination);osc.start(now);osc.stop(now+.20);
  }

  playDoorLockClack() {
    if(!this.ctx||this.isMuted)return;
    try{
      const now=this.ctx.currentTime;
      const osc=this.ctx.createOscillator(),gain=this.ctx.createGain(),filter=this.ctx.createBiquadFilter();
      osc.type='triangle';osc.frequency.setValueAtTime(150,now);osc.frequency.exponentialRampToValueAtTime(58,now+.12);
      filter.type='lowpass';filter.frequency.value=620;
      gain.gain.setValueAtTime(.16,now);gain.gain.exponentialRampToValueAtTime(.001,now+.16);
      osc.connect(filter);filter.connect(gain);gain.connect(this.ctx.destination);osc.start(now);osc.stop(now+.18);
    }catch(e){}
  }

  playWheelchairRattle(volume=.13) {
    if(!this.ctx||this.isMuted)return;
    try{
      const now=this.ctx.currentTime;
      for(let i=0;i<3;i++){
        const t=now+i*.24;
        const osc=this.ctx.createOscillator(),gain=this.ctx.createGain(),filter=this.ctx.createBiquadFilter();
        osc.type='sawtooth';osc.frequency.setValueAtTime(320+i*18,t);osc.frequency.exponentialRampToValueAtTime(92,t+.16);
        filter.type='bandpass';filter.frequency.value=540;filter.Q.value=1.4;
        gain.gain.setValueAtTime(.001,t);gain.gain.linearRampToValueAtTime(volume,t+.01);gain.gain.exponentialRampToValueAtTime(.001,t+.19);
        osc.connect(filter);filter.connect(gain);gain.connect(this.ctx.destination);osc.start(t);osc.stop(t+.21);
      }
    }catch(e){}
  }

  playWheelchairApproach() {
    if(!this.ctx||this.isMuted)return;
    this.playWheelchairRattle(.10);
    setTimeout(()=>this.playWheelchairRattle(.15),620);
    setTimeout(()=>this.playWheelchairRattle(.20),1180);
  }

  duckAmbient(level=.2,durationMs=4200) {
    if(!this.ctx||!this.ambientGain)return;
    try{
      const now=this.ctx.currentTime,base=.08,target=Math.max(.001,base*level);
      this.ambientGain.gain.cancelScheduledValues(now);
      this.ambientGain.gain.setValueAtTime(this.ambientGain.gain.value,now);
      this.ambientGain.gain.linearRampToValueAtTime(target,now+.08);
      this.ambientGain.gain.linearRampToValueAtTime(base,now+durationMs/1000);
    }catch(e){}
  }

  playIntercomBurst() {
    if(!this.ctx||this.isMuted)return;
    try{
      const now=this.ctx.currentTime;
      const click=this.ctx.createOscillator(),clickGain=this.ctx.createGain();
      click.type='square';click.frequency.setValueAtTime(1450,now);
      clickGain.gain.setValueAtTime(.07,now);clickGain.gain.exponentialRampToValueAtTime(.001,now+.045);
      click.connect(clickGain);clickGain.connect(this.ctx.destination);click.start(now);click.stop(now+.05);

      const length=Math.floor(this.ctx.sampleRate*.42);
      const buffer=this.ctx.createBuffer(1,length,this.ctx.sampleRate);
      const data=buffer.getChannelData(0);
      for(let i=0;i<length;i++)data[i]=(Math.random()*2-1)*(.42*(1-i/length));
      const noise=this.ctx.createBufferSource();noise.buffer=buffer;
      const filter=this.ctx.createBiquadFilter();filter.type='bandpass';filter.frequency.value=1650;filter.Q.value=.75;
      const gain=this.ctx.createGain();gain.gain.setValueAtTime(.001,now+.035);gain.gain.linearRampToValueAtTime(.065,now+.06);gain.gain.exponentialRampToValueAtTime(.001,now+.42);
      noise.connect(filter);filter.connect(gain);gain.connect(this.ctx.destination);noise.start(now+.035);noise.stop(now+.45);
    }catch(e){}
  }

  playTrolleyWheelPass() {
    if(!this.ctx||this.isMuted)return;
    try{
      const now=this.ctx.currentTime;
      const wheel=(t,freq,gainValue)=>{
        const osc=this.ctx.createOscillator(),gain=this.ctx.createGain(),filter=this.ctx.createBiquadFilter();
        osc.type='sawtooth';osc.frequency.setValueAtTime(freq,t);osc.frequency.linearRampToValueAtTime(freq*.72,t+.55);
        filter.type='lowpass';filter.frequency.value=520;
        gain.gain.setValueAtTime(.001,t);
        gain.gain.linearRampToValueAtTime(gainValue,t+.05);
        gain.gain.exponentialRampToValueAtTime(.001,t+.62);
        osc.connect(filter);filter.connect(gain);gain.connect(this.ctx.destination);
        osc.start(t);osc.stop(t+.65);
      };
      wheel(now,58,.055);
      wheel(now+.34,52,.05);
      wheel(now+.72,61,.045);
      const clack=(t)=>{
        const osc=this.ctx.createOscillator(),gain=this.ctx.createGain();
        osc.type='triangle';osc.frequency.setValueAtTime(170,t);osc.frequency.exponentialRampToValueAtTime(60,t+.08);
        gain.gain.setValueAtTime(.09,t);gain.gain.exponentialRampToValueAtTime(.001,t+.11);
        osc.connect(gain);gain.connect(this.ctx.destination);osc.start(t);osc.stop(t+.12);
      };
      clack(now+.18);clack(now+.52);clack(now+.86);
    }catch(e){}
  }

  playElevatorCableScrape() {
    if(!this.ctx||this.isMuted)return;
    try{
      const now=this.ctx.currentTime;
      const osc=this.ctx.createOscillator(),gain=this.ctx.createGain(),filter=this.ctx.createBiquadFilter();
      osc.type='sawtooth';osc.frequency.setValueAtTime(118,now);osc.frequency.linearRampToValueAtTime(72,now+.7);
      filter.type='bandpass';filter.frequency.value=720;filter.Q.value=.55;
      gain.gain.setValueAtTime(.001,now);gain.gain.linearRampToValueAtTime(.12,now+.09);gain.gain.exponentialRampToValueAtTime(.001,now+.9);
      osc.connect(filter);filter.connect(gain);gain.connect(this.ctx.destination);osc.start(now);osc.stop(now+.92);
    }catch(e){}
  }

  playAmbuBagBurst() {
    if(!this.ctx||this.isMuted)return;
    try{
      const now=this.ctx.currentTime;
      const puff=(t)=>{
        const length=Math.floor(this.ctx.sampleRate*.24);
        const buffer=this.ctx.createBuffer(1,length,this.ctx.sampleRate);
        const data=buffer.getChannelData(0);
        for(let i=0;i<length;i++)data[i]=(Math.random()*2-1)*Math.sin(Math.PI*i/length);
        const source=this.ctx.createBufferSource();source.buffer=buffer;
        const filter=this.ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=580;
        const gain=this.ctx.createGain();gain.gain.setValueAtTime(.001,t);gain.gain.linearRampToValueAtTime(.065,t+.04);gain.gain.exponentialRampToValueAtTime(.001,t+.23);
        source.connect(filter);filter.connect(gain);gain.connect(this.ctx.destination);source.start(t);source.stop(t+.25);
      };
      puff(now);puff(now+.42);
    }catch(e){}
  }

  playVentilationCollapse() {
    if(!this.ctx||this.isMuted)return;
    try{
      const now=this.ctx.currentTime;
      const length=Math.floor(this.ctx.sampleRate*1.2);
      const buffer=this.ctx.createBuffer(1,length,this.ctx.sampleRate);
      const data=buffer.getChannelData(0);
      for(let i=0;i<length;i++)data[i]=(Math.random()*2-1)*(1-i/length);
      const source=this.ctx.createBufferSource();source.buffer=buffer;
      const filter=this.ctx.createBiquadFilter();filter.type='lowpass';filter.frequency.setValueAtTime(900,now);filter.frequency.exponentialRampToValueAtTime(120,now+1.0);
      const gain=this.ctx.createGain();gain.gain.setValueAtTime(.001,now);gain.gain.linearRampToValueAtTime(.22,now+.08);gain.gain.exponentialRampToValueAtTime(.001,now+1.15);
      source.connect(filter);filter.connect(gain);gain.connect(this.ctx.destination);source.start(now);source.stop(now+1.2);
    }catch(e){}
  }

  playCartWheelRattle() {
    if(!this.ctx||this.isMuted)return;
    try{
      const now=this.ctx.currentTime;
      const pulse=(t,freq,gainValue)=>{
        const osc=this.ctx.createOscillator(),gain=this.ctx.createGain(),filter=this.ctx.createBiquadFilter();
        osc.type='triangle';
        osc.frequency.setValueAtTime(freq,t);
        osc.frequency.exponentialRampToValueAtTime(Math.max(45,freq*.42),t+.16);
        filter.type='bandpass';filter.frequency.value=520;filter.Q.value=.55;
        gain.gain.setValueAtTime(.001,t);
        gain.gain.linearRampToValueAtTime(gainValue,t+.025);
        gain.gain.exponentialRampToValueAtTime(.001,t+.22);
        osc.connect(filter);filter.connect(gain);gain.connect(this.ctx.destination);
        osc.start(t);osc.stop(t+.24);
      };
      pulse(now,155,.055);
      pulse(now+.19,128,.045);
      pulse(now+.43,172,.05);
      pulse(now+.66,112,.042);
    }catch(e){}
  }

  playTerminalKey() {
    if(!this.ctx||this.isMuted)return;
    try{
      const now=this.ctx.currentTime;
      const osc=this.ctx.createOscillator(),gain=this.ctx.createGain(),filter=this.ctx.createBiquadFilter();
      osc.type='square';osc.frequency.setValueAtTime(1750+Math.random()*220,now);osc.frequency.exponentialRampToValueAtTime(620,now+.035);
      filter.type='bandpass';filter.frequency.value=1550;filter.Q.value=.9;
      gain.gain.setValueAtTime(.055,now);gain.gain.exponentialRampToValueAtTime(.001,now+.055);
      osc.connect(filter);filter.connect(gain);gain.connect(this.ctx.destination);osc.start(now);osc.stop(now+.06);
    }catch(e){}
  }

  playTerminalFanHold(duration=1.2) {
    if(!this.ctx||this.isMuted)return;
    try{
      const now=this.ctx.currentTime,d=Math.max(.25,Number(duration)||1.2);
      const osc=this.ctx.createOscillator(),gain=this.ctx.createGain(),filter=this.ctx.createBiquadFilter();
      osc.type='sawtooth';osc.frequency.setValueAtTime(71,now);
      filter.type='lowpass';filter.frequency.value=210;
      gain.gain.setValueAtTime(.001,now);
      gain.gain.linearRampToValueAtTime(.035,now+.08);
      gain.gain.setValueAtTime(.035,now+Math.max(.1,d-.12));
      gain.gain.exponentialRampToValueAtTime(.001,now+d);
      osc.connect(filter);filter.connect(gain);gain.connect(this.ctx.destination);
      osc.start(now);osc.stop(now+d+.03);
    }catch(e){}
  }

  playCameraShutter() {
    if(!this.ctx||this.isMuted)return;
    try{
      const now=this.ctx.currentTime;
      const snap=(at,freq,gainValue,duration,type='square')=>{
        const osc=this.ctx.createOscillator(),gain=this.ctx.createGain(),filter=this.ctx.createBiquadFilter();
        osc.type=type;osc.frequency.setValueAtTime(freq,at);osc.frequency.exponentialRampToValueAtTime(Math.max(90,freq*.38),at+duration);
        filter.type='bandpass';filter.frequency.value=Math.max(380,freq*.9);filter.Q.value=1.2;
        gain.gain.setValueAtTime(gainValue,at);gain.gain.exponentialRampToValueAtTime(.001,at+duration);
        osc.connect(filter);filter.connect(gain);gain.connect(this.ctx.destination);osc.start(at);osc.stop(at+duration+.01);
      };
      snap(now,1850,.085,.028,'square');
      snap(now+.045,760,.065,.052,'triangle');
      snap(now+.11,1320,.04,.032,'square');
    }catch(e){}
  }

  playClick() {
    if (!this.ctx || this.isMuted) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, now);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.03);
    } catch (e) {}
  }
}

export const soundManager = new SoundManager();
