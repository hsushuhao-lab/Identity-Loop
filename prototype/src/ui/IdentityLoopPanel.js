import { B2_ARCHIVE_IDENTITIES, B2_FIRE_MEMORY } from '../story/IdentityLoopFireMemory.js';
import { getGoodEnding, getM9Candidates, WRONG_MEMORY_LINES } from '../story/IdentityLoopEndings.js';
import { getVisibleEvidence } from '../story/IdentityLoopEvidence.js';
import { ROUTE_STEPS } from '../story/IdentityRoutes.js';


export class IdentityLoopPanel{
  constructor(manager,{debug=false,onNewRun=()=>{}}={}){this.manager=manager;this.debug=debug;this.onNewRun=onNewRun;this.root=document.getElementById('identity-loop-panel');this.onCommit=null;}
  start(){this.manager.restoreOrStartRun();this.root?.classList.remove('visible','archive-open','m9-open','ending-open');this.render();}
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
    this.root.classList.add('visible','archive-open');
    const body=this.root.querySelector('[data-identity-detail]');
    if(body){body.replaceChildren();const heading=document.createElement('h3');heading.textContent='B2 / IDENTITY ARCHIVE';body.append(heading);const p=document.createElement('p');p.textContent='CURRENT SELF = CORRUPTED｜客觀檔案已恢復，當前身分仍未判定。';body.append(p);const list=document.createElement('ul');for(const item of B2_ARCHIVE_IDENTITIES){const li=document.createElement('li');li.textContent=`封存人員｜${item.role}｜姓名與員編待最終核對`;list.append(li);}body.append(list);const fire=document.createElement('p');fire.className='identity-loop-fire-memory';fire.textContent=B2_FIRE_MEMORY.join(' · ');body.append(fire);}
    this.render();
  }
  openM9({onCommit}={}){
    if(!this.root)return;
    if(this.manager.runSave.runEnded)return;
    this.onCommit=onCommit;this.root.classList.add('visible','m9-open');
    this.root.classList.remove('archive-open');
    this.root.querySelector('[data-identity-detail]').textContent='最後交班不再替你列答案。請手動輸入你認為屬於這一輪記憶的姓名與員編；有效身分一旦正式提交就不能更改。';
    this.root.scrollTop=0;
    const choices=this.root.querySelector('[data-identity-choices]');
    choices.replaceChildren();

    const form=document.createElement('div');form.className='identity-entry-form';
    const name=document.createElement('input');name.type='text';name.autocomplete='off';name.placeholder='姓名，例如：張守恆';name.setAttribute('aria-label','姓名');
    const employeeId=document.createElement('input');employeeId.type='text';employeeId.autocomplete='off';employeeId.placeholder='員編，例如：MED-870409';employeeId.setAttribute('aria-label','員編');
    const status=document.createElement('div');status.className='identity-entry-status';status.setAttribute('aria-live','polite');
    const submit=document.createElement('button');submit.type='button';submit.className='identity-entry-submit';submit.textContent='這是我的名字';

    const normalize=value=>String(value||'').trim().toUpperCase().replace(/－|—/g,'-');
    submit.addEventListener('click',()=>{
      const typedName=String(name.value||'').trim();
      const typedId=normalize(employeeId.value);
      const candidate=getM9Candidates().find(item=>item.name===typedName&&normalize(item.employeeId)===typedId);
      if(!candidate){
        status.textContent='查無相符的人事資料，或姓名與員編不屬於同一筆紀錄。請重新核對。';
        return;
      }
      status.textContent='IDENTITY RECORD MATCHED｜正式提交中…';
      this.commit(candidate.identity);
    });
    for(const input of [name,employeeId])input.addEventListener('keydown',event=>{if(event.key==='Enter')submit.click();});
    form.append(name,employeeId,submit,status);
    choices.append(form);
    this.render();
  }
  commit(identity){const result=this.manager.commitM9(identity);if(!result.ok)return result;this.root?.classList.remove('m9-open');this.root?.querySelector('[data-identity-choices]')?.replaceChildren();this.render();this.showEnding(result);this.onCommit?.(result);return result;}
  showEnding(result){
    if(!this.root)return;
    this.root.classList.add('visible','ending-open');
    const body=this.root.querySelector('[data-identity-detail]');body.replaceChildren();
    const title=document.createElement('h3');title.textContent=result.type==='GOOD_END'?getGoodEnding(result.identity).title:'WRONG MEMORY';body.append(title);
    const lines=result.type==='GOOD_END'?getGoodEnding(result.identity).lines:WRONG_MEMORY_LINES;for(const line of lines){const p=document.createElement('p');p.textContent=line;body.append(p);}
    const button=document.createElement('button');button.type='button';button.className='identity-loop-new-run';button.textContent='開始新的夜班';button.addEventListener('click',()=>this.newRun());body.append(button);
  }
  newRun(){this.root?.classList.remove('visible','ending-open','archive-open','m9-open');this.root?.querySelector('[data-identity-detail]')?.replaceChildren();this.root?.querySelector('[data-identity-choices]')?.replaceChildren();this.manager.startNewRun();this.render();this.onNewRun();}
}
