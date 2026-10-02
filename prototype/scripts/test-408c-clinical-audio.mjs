import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

// Git's Windows checkout may use CRLF; handler boundaries are authored with LF.
const source=readFileSync(new URL('../src/main.js',import.meta.url),'utf8').replace(/\r\n/g,'\n');
const between=(start,end)=>{
  const a=source.indexOf(start),b=source.indexOf(end,a+start.length);
  assert(a>=0&&b>a,'production handler boundaries must exist: '+start);
  return source.slice(a+start.length,b);
};

const assessment=between("} else if(action==='NORMAL_EVENT'){","} else if(action==='ER_ASSESS'){");
const knockHelper=between("function trigger409PostSealKnock(){","\n}\n\nuiManager.setBed33Handlers({");
const seal=between("} else if (interactable.type === 'bed33_409_sealed') {","} else if (interactable.type === 'bed33_assignment') {");
const duty409=between("if(interactable.doorId==='room_409'){","if(interactable.doorId==='3F_ADMIN_OFFICE_DOOR')");
const ghostCall=between("}else if(callKind==='ER_GHOST_0033'){","}else return;");

assert(!assessment.includes('playBed33KnockPattern'),'408C bedside assessment must stay clinically ambiguous');
assert(seal.includes('trigger409PostSealKnock()'),'sealed 409 inspection must trigger the dedicated knock helper');
assert(duty409.includes('trigger409PostSealKnock()'),'physical 409 door inspection must trigger the same dedicated knock helper');
assert(!ghostCall.includes('playBed33KnockPattern'),'post-21:17 / 00:33 phone sequence must never play the 409 wall-knock pattern');

const flags=new Map(),tasks=new Set(['P1_4F_REPORT']);
const knocks=[],timers=[];let lines;
const furious=[];
const context={
  identityLoopMode:false,identityManager:{currentIdentity:'LI'},
  gameState:{
    isTaskComplete:id=>tasks.has(id),
    getFlag:id=>flags.get(id),
    setFlag:(id,value)=>flags.set(id,value)
  },
  dutyEvents:{complete:id=>tasks.add(id)},
  interactable:{},
  registerBed33Clue(){},
  worldRouter:{activeZoneId:'first_campus_4f',activeZoneInstance:{setDutyDoorClosed(){}}},
  controller:{},
  soundManager:{
    ensureRunning:async()=>true,
    playBed33KnockPattern:volume=>knocks.push(volume),
    playFuriousWallKnockPattern:volume=>furious.push(volume)
  },
  uiManager:{
    showDialogue:value=>{lines=value;},
    updateTasks(){},
    openArchiveDocument(){},
    showSubtitle(){}
  },
  setTimeout:fn=>{timers.push(fn);return timers.length;}
};
vm.createContext(context);
vm.runInContext(`globalThis.trigger409PostSealKnock=function(){${knockHelper}}`,context);

const run=body=>vm.runInContext(`(function(){${body}})()`,context);
const flushTimers=async()=>{
  for(const timer of timers.splice(0))await timer();
};

run(seal);await flushTimers();
assert.equal(knocks.length,0,'visiting sealed 409 before 408C assessment must not play the pattern');

run(assessment);await flushTimers();
assert.equal(knocks.length,0,'clinical assessment must not confirm the reported sound audibly');
assert.equal(lines.length,6);
for(const text of ['人說話','其他人','水管','環境聲音','不能下結論'])assert(lines.some(line=>line.text.includes(text)));

run(seal);await flushTimers();
assert.deepEqual(knocks,[.16],'the only objective wall knock must occur while checking sealed 409 after assessment');

run(seal);await flushTimers();
assert.equal(knocks.length,1,'repeat 409 inspection must not replay the reveal');

context.worldRouter.activeZoneId='first_campus_3f';
flags.delete('KNOCK_408C_POST_SEAL_PLAYED');
tasks.add('P1_NORMAL_EVENT_DONE');
context.trigger409PostSealKnock();
await flushTimers();
assert.equal(knocks.length,1,'a delayed 409 timer must not follow the player into another floor/21:17 sequence');

context.identityLoopMode=true;context.worldRouter.activeZoneId='first_campus_4f';
flags.delete('KNOCK_408C_POST_SEAL_PLAYED');context.trigger409PostSealKnock();await flushTimers();
assert.deepEqual(furious,[.16],'Li uses the irregular burst, not the legacy numeric pattern');
assert.equal(knocks.length,1);
console.log('PASS: legacy clinical ambiguity retained; post-seal Li dispatches irregular knocking, other routes retain the original pattern');
