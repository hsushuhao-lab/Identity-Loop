import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
const base=process.argv[2]||'https://hsushuhao-lab.github.io/Identy-Loop/';
const expected=process.env.GITHUB_SHA;
assert(expected,'GITHUB_SHA is required; do not verify against an unspecified release');
await mkdir('qa-results',{recursive:true});
let observed=null,lastError=null;
for(let attempt=1;attempt<=30;attempt++){
 try{
  const url=new URL('build-info.json',base);url.searchParams.set('verify',`${expected}-${attempt}`);
  const response=await fetch(url,{cache:'no-store',signal:AbortSignal.timeout(15000)});
  assert(response.ok,`HTTP ${response.status}`);observed=await response.json();
  if(observed.commit===expected){
   const page=await fetch(base+'?verify='+expected,{cache:'no-store',signal:AbortSignal.timeout(15000)});assert(page.ok);
   const html=await page.text(),entry=html.match(/<script[^>]+src="([^"]+)"/);
   assert(entry,'No production module script found');
   const module=await fetch(new URL(entry[1],base),{signal:AbortSignal.timeout(15000)});assert(module.ok,'Production module unavailable');
   assert((await module.text()).length>1000,'Production module is empty');
   const result={verdict:'PASS',expected,observed,attempt,url:base,verifiedAt:new Date().toISOString()};
   await writeFile('qa-results/live-build.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));process.exit(0);
  }
  lastError=`Expected ${expected}, observed ${observed.commit}`;
 }catch(e){lastError=e.message;}
 console.log(`Pages propagation check ${attempt}: ${lastError}`);
 if(attempt<30)await new Promise(r=>setTimeout(r,5000));
}
await writeFile('qa-results/live-build.json',JSON.stringify({verdict:'FAIL',expected,observed,error:lastError},null,2));
throw Error('Live Pages fingerprint not verified: '+lastError);
