export const CASE_CLUES = Object.freeze(['paper','relay','no_air','air_flow']);
export function freshSideCase() { return { visits:0, clues:[], power:false, damper:false, outcome:'pending', revisions:0 }; }
export function restoreSideCase(saved) {
  const data=freshSideCase();if(!saved)return data;
  data.visits=Number.isFinite(saved.visits)?Math.max(0,Math.floor(saved.visits)):0;
  data.clues=Array.isArray(saved.clues)?[...new Set(saved.clues.filter(c=>CASE_CLUES.includes(c)))]:[];
  data.power=saved.power===true;data.damper=saved.damper===true;
  data.outcome=['archive','verify'].includes(saved.outcome)?saved.outcome:'pending';
  data.revisions=Number.isFinite(saved.revisions)?Math.max(0,Math.floor(saved.revisions)):0;
  return data;
}
export function hasCaseEvidence(data) { return data.clues.includes('paper') || (data.clues.includes('relay') && data.clues.some(c=>['no_air','air_flow'].includes(c))); }
export function caseReaction(identity,outcome) {
  const voices={
    LI:['「驗收單不等於現場通過。先把兩件事分開。」','「原件留下了。未確認的部分也要寫清楚。」','「現在有氣流；這只能證明這段測試回路。」'],
    ZHANG:['「那年所有人都說完成了，風口卻一直很安靜。」','「你留下了那張單，至少這次沒有把空白塗掉。」','「紙條動了。這次我可以說，我看到了。」'],
    ZHOU:['「完成章比風聲早了一步。時間不能代替結果。」','「這份紀錄先停在這裡，不急著填上答案。」','「同一個風口，這次的結果不同。把前後都留著。」'],
    CHEN:['「先看接點，再看風口。手熟悉不代表紀錄正確。」','「回路關好了，原件還在。不要替它補上名字。」','「手記得怎麼做，紙條才告訴我們有沒有做到。」']
  };
  return (voices[identity]||voices.LI)[outcome==='verify'?2:outcome==='archive'?1:0];
}
