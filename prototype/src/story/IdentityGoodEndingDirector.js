import * as THREE from 'three';
import {preloadAssetNames} from '../art/AssetRegistry.js';
import {preloadMaterialSurfaces} from '../art/MaterialRegistry.js';
import {disposeZoneArt} from '../art/ArtResources.js';
import {IDENTITY_PROFILES} from '../core/IdentityManager.js';
import {buildIdentityGoodEnding,ENDING_CODAS} from './IdentityGoodEndingScene.js';
import './IdentityGoodEnding.css';

// A short voiced-instrument coda on the game's existing AudioContext, with
// independently composed intervals and partials for each restored identity.
function coda(audio,identity,elapsed){
  const ctx=audio.ctx;if(!ctx||ctx.state!=='running'||audio.isMuted)return null;
  const plan=ENDING_CODAS[identity],gain=ctx.createGain(),voices=[];
  gain.gain.value=.10;gain.connect(ctx.destination);
  plan.notes.forEach((note,i)=>{
    const offset=.2+i*plan.spacing;if(offset<elapsed)return;
    const at=ctx.currentTime+offset-elapsed;
    for(const [j,partial]of plan.partials.entries()){
      const osc=ctx.createOscillator(),env=ctx.createGain();osc.type='sine';osc.frequency.value=440*2**((plan.root+note-69)/12)*partial;
      env.gain.setValueAtTime(.00001,at);env.gain.linearRampToValueAtTime(.36/(j+1),at+.09);env.gain.exponentialRampToValueAtTime(.00001,at+3.4);
      osc.connect(env);env.connect(gain);osc.start(at);osc.stop(at+3.5);voices.push(osc);
      osc.onended=()=>{osc.disconnect();env.disconnect();};
    }
  });
  return {gain,stop(){gain.gain.cancelScheduledValues(ctx.currentTime);gain.gain.setTargetAtTime(0,ctx.currentTime,.02);for(const osc of voices){try{osc.stop(ctx.currentTime+.12);}catch{}}setTimeout(()=>gain.disconnect(),160);}};
}

export class IdentityGoodEndingDirector{
  constructor({soundManager}){this.audio=soundManager;this.active=false;this.root=null;}
  async play(result,{onComplete=()=>{}}={}){
    if(this.active||result.type!=='GOOD_END'||!IDENTITY_PROFILES[result.identity])return false;
    this.active=true;this.identity=result.identity;this.onComplete=onComplete;this.elapsed=0;this.frameCount=0;this.paused=false;this.lastShot=-1;this.status='loading';this.frame=null;
    const root=document.createElement('section');this.root=root;root.id='identity-good-ending';root.className='identity-good-ending active';
    root.setAttribute('role','dialog');root.setAttribute('aria-modal','true');root.setAttribute('aria-label','本輪通關結局動畫');root.dataset.identity=result.identity;
    root.innerHTML='<div class="ige-stage"></div><div class="ige-shade"></div><header><span class="ige-kicker">IDENTITY LOOP / RECORD RESTORED</span><span class="ige-name"></span></header><div class="ige-caption" aria-live="polite"><small>最後交班</small><h1>正在讀取這一輪的記憶</h1><p>已保存交班結果；動畫載入不會更改你的選擇。</p></div><div class="ige-controls"><button type="button" data-ige-pause disabled>暫停</button><button type="button" data-ige-skip>略過動畫，查看結局</button></div><div class="ige-progress" aria-hidden="true"><i></i></div>';
    const profile=IDENTITY_PROFILES[result.identity];root.querySelector('.ige-name').textContent=`${profile.name} / ${profile.employeeId}`;
    document.body.append(root);document.body.classList.add('identity-ending-playing');document.exitPointerLock?.();
    const pause=root.querySelector('[data-ige-pause]'),skip=root.querySelector('[data-ige-skip]');
    skip.onclick=()=>this.finish('skipped');pause.onclick=()=>this.togglePause();skip.focus();
    this.keyHandler=event=>{
      if(!this.active)return;
      if(event.code==='Tab'){
        event.preventDefault();(document.activeElement===skip&&!pause.disabled?pause:skip).focus();return;
      }
      if(['KeyE','Space','KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.code)){
        event.preventDefault();event.stopImmediatePropagation();
        if(event.code==='Space'&&!event.repeat&&this.status==='playing')this.togglePause();
      }
    };
    document.addEventListener('keydown',this.keyHandler,true);
    this.resize=()=>{if(!this.renderer)return;this.renderer.setSize(innerWidth,innerHeight);this.camera.aspect=innerWidth/innerHeight;this.camera.fov=THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(THREE.MathUtils.degToRad(26))*Math.max(1,1.2/this.camera.aspect)));this.camera.updateProjectionMatrix();};
    window.addEventListener('resize',this.resize);
    try{
      await Promise.all([preloadAssetNames(['workDesk','hospitalBed','officeChair']),preloadMaterialSurfaces(['wood','plaster','terrazzo'])]);
      if(!this.active||this.root!==root)return false;
      this.set=buildIdentityGoodEnding(result.identity);
      this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.25));
      this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=.85;
      this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
      this.camera=new THREE.PerspectiveCamera(52,innerWidth/innerHeight,.05,40);this.resize();
      this.renderer.domElement.setAttribute('aria-label',`${result.identity} 三維結局演出`);root.querySelector('.ige-stage').append(this.renderer.domElement);
      this.reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.status='playing';root.dataset.state='playing';pause.disabled=false;
      this.lastTime=performance.now();this.renderFrame();
      void this.audio.ensureRunning().then(ok=>{if(ok&&this.active&&!this.paused&&this.root===root)this.music=coda(this.audio,this.identity,this.elapsed);});
      const tick=now=>{
        if(!this.active||this.root!==root)return;
        const delta=Math.max(0,(now-this.lastTime)/1000);this.lastTime=now;
        if(!this.paused&&!document.hidden)this.elapsed=Math.min(24,this.elapsed+delta);
        this.renderFrame();
        if(this.elapsed>=24){this.finish('complete');return;}
        this.frame=requestAnimationFrame(tick);
      };
      this.frame=requestAnimationFrame(tick);return true;
    }catch(error){
      if(!this.active||this.root!==root)return false;
      this.status='failed';root.dataset.state='failed';this.error=String(error);pause.disabled=true;
      root.querySelector('.ige-caption h1').textContent='動畫未能載入';root.querySelector('.ige-caption p').textContent='交班結果已保存。返回結局後可以重看，不必重新提交。';
      skip.textContent='返回已保存的結局';console.warn('[ending-cg] playback unavailable',error);return false;
    }
  }
  renderFrame(){
    if(!this.renderer)return;
    const index=Math.min(2,Math.floor(this.elapsed/8)),beat=this.set.shots[index],p=this.reducedMotion?.5:(this.elapsed-index*8)/8;
    this.camera.position.fromArray(beat.from).lerp(new THREE.Vector3(...beat.to),p);this.camera.lookAt(...beat.look);
    this.set.update(this.reducedMotion?index*8+4:this.elapsed);
    this.renderer.render(this.set.scene,this.camera);this.frameCount++;
    if(index!==this.lastShot){
      this.lastShot=index;this.root.dataset.shot=String(index);
      this.root.querySelector('.ige-caption small').textContent=`${index+1} / 3`;
      this.root.querySelector('.ige-caption h1').textContent=beat.title;
      this.root.querySelector('.ige-caption p').textContent=beat.line;
    }
    this.root.querySelector('.ige-progress i').style.width=`${this.elapsed/24*100}%`;
    if(this.music)this.music.gain.gain.setTargetAtTime(this.audio.isMuted||document.hidden?0:.10,this.audio.ctx.currentTime,.1);
  }
  togglePause(){
    if(this.status!=='playing')return;
    this.paused=!this.paused;this.root.querySelector('[data-ige-pause]').textContent=this.paused?'繼續播放':'暫停';
    this.music?.stop();this.music=null;
    if(!this.paused)this.music=coda(this.audio,this.identity,this.elapsed);
  }
  finish(reason){
    if(!this.active)return;
    this.active=false;this.status=reason;cancelAnimationFrame(this.frame);this.music?.stop();this.music=null;
    document.removeEventListener('keydown',this.keyHandler,true);window.removeEventListener('resize',this.resize);
    if(this.set){disposeZoneArt(this.set.scene);this.set=null;}
    this.renderer?.dispose();this.renderer=null;this.root?.remove();this.root=null;document.body.classList.remove('identity-ending-playing');
    const done=this.onComplete;this.onComplete=null;done?.(reason);
    document.querySelector('.identity-loop-panel .identity-ending-replay')?.focus();
  }
}
