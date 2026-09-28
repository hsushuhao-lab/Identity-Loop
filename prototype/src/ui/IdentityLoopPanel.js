import { B2_ARCHIVE_IDENTITIES, B2_FIRE_MEMORY } from '../story/IdentityLoopFireMemory.js';
import { getGoodEnding, getM9Candidates, WRONG_MEMORY_LINES } from '../story/IdentityLoopEndings.js';
import { getVisibleEvidence } from '../story/IdentityLoopEvidence.js';
import { ROUTE_STEPS } from '../story/IdentityRoutes.js';


export class IdentityLoopPanel{
  constructor(manager,{debug=false,onNewRun=()=>{}}={}){this.manager=manager;this.debug=debug;this.onNewRun=onNewRun;this.root=document.getElementById('identity-loop-panel');this.onCommit=null;}
  start(){this.manager.restoreOrStartRun();this.root?.classList.add('visible');this.render();}
  render(){
    if(!this.root)return;
    const {runSave,metaSave}=this.manager;
    const milestone=this.root.querySelector('[data-identity-milestone]');
    if(milestone)milestone.textContent=ROUTE_STEPS[this.manager.currentRouteStep]?.label||'夜班結束';
    const seed=this.root.querySelector('[data-identity-seed]');
    if(seed)seed.textContent='未公開';
    const progress=this.root.querySelector('[data-identity-progress]');
    if(progress)progress.textContent=`記憶 ${runSave.completedStoryModules?.length||0} · Good Ends ${metaSave.completedGoodEnds.length}/4`;
    const evidence=this.root.querySelector('[data-identity-evidence]');
    if(evidence)evidence.replaceChildren(...Object.values(runSave.evidence).map(item=>{const li=document.createElement('li');li.textContent=item.visibleText;return li;}));
  }
  syncMilestone(milestone){this.manager.advanceMilestone(milestone);this.render();}
  recordEvidence(id){const evidence=getVisibleEvidence().find(item=>item.id===id);if(evidence)this.manager.recordEvidence(evidence);this.render();}
  openB2Archive(){
    if(!this.root)return;
    this.root.classList.add('archive-open');
    const body=this.root.querySelector('[data-identity-detail]');
    if(body){body.replaceChildren();const heading=document.createElement('h3');heading.textContent='B2 / IDENTITY ARCHIVE';body.append(heading);const p=document.createElement('p');p.textContent='CURRENT SELF = CORRUPTED｜客觀檔案已恢復，當前身分仍未判定。';body.append(p);const list=document.createElement('ul');for(const item of B2_ARCHIVE_IDENTITIES){const li=document.createElement('li');li.textContent=`封存人員｜${item.role}｜姓名與員編待最終核對`;list.append(li);}body.append(list);const fire=document.createElement('p');fire.className='identity-loop-fire-memory';fire.textContent=B2_FIRE_MEMORY.join(' · ');body.append(fire);}
    this.render();
  }
  openM9({onCommit}={}){
    if(!this.root)return;
    if(this.manager.runSave.runEnded)return;
    this.onCommit=onCommit;this.root.classList.add('m9-open');
    this.root.classList.remove('archive-open');
    this.root.querySelector('[data-identity-detail]').textContent='核對你的夜班記憶，選擇自己的身分。每輪只能正式提交一次。';
    this.root.scrollTop=0;
    const choices=this.root.querySelector('[data-identity-choices]');choices.replaceChildren();
    for(const candidate of getM9Candidates()){const button=document.createElement('button');button.type='button';button.className='identity-choice';button.textContent=`${candidate.name}｜${candidate.employeeId}`;button.addEventListener('click',()=>this.commit(candidate.identity));choices.append(button);}
    this.render();
  }
  commit(identity){const result=this.manager.commitM9(identity);if(!result.ok)return result;this.root?.classList.remove('m9-open');this.root?.querySelector('[data-identity-choices]')?.replaceChildren();this.render();this.showEnding(result);this.onCommit?.(result);return result;}
  showEnding(result){
    if(!this.root)return;
    this.root.classList.add('ending-open');
    const body=this.root.querySelector('[data-identity-detail]');body.replaceChildren();
    const title=document.createElement('h3');title.textContent=result.type==='GOOD_END'?getGoodEnding(result.identity).title:'WRONG MEMORY';body.append(title);
    const lines=result.type==='GOOD_END'?getGoodEnding(result.identity).lines:WRONG_MEMORY_LINES;for(const line of lines){const p=document.createElement('p');p.textContent=line;body.append(p);}
    const button=document.createElement('button');button.type='button';button.className='identity-loop-new-run';button.textContent='開始新的夜班';button.addEventListener('click',()=>this.newRun());body.append(button);
  }
  newRun(){this.root?.classList.remove('ending-open','archive-open','m9-open');this.root?.querySelector('[data-identity-detail]')?.replaceChildren();this.root?.querySelector('[data-identity-choices]')?.replaceChildren();this.manager.startNewRun();this.render();this.onNewRun();}
}
