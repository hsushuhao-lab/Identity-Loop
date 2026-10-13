import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {chromium} from 'playwright';

const base=process.argv[2]||'https://hsushuhao-lab.github.io/Identity-Loop/';
const out=process.argv[3]||'qa-results/public-release';
const expected=process.env.GITHUB_SHA;
assert(expected,'GITHUB_SHA must identify the release being verified');
await mkdir(out,{recursive:true});
const report={base,expected,method:'Public HTTPS production entry in fresh desktop and touch browser contexts; no QA query, chapter fixtures or world writes. Asset hashes are compared to this checkout.',assets:[],visits:[],errors:[]};
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const normalizeText=bytes=>Buffer.from(bytes.toString('utf8').replace(/\r\n/g,'\n'));
let browser;
try{
  const fingerprint=await fetch(new URL('build-info.json?verify='+expected,base),{signal:AbortSignal.timeout(30000)});
  assert(fingerprint.ok);report.build=await fingerprint.json();assert.equal(report.build.commit,expected);
  const manifest=JSON.parse(await readFile('public/assets/asset-integrity.json','utf8'));
  const pending=[...manifest.records];
  await Promise.all(Array.from({length:4},async()=>{
    while(pending.length){
      const record=pending.shift(),url=new URL('assets/'+record.file,base);
      let bytes;
      for(let attempt=1;attempt<=3;attempt++){
        try{
          const response=await fetch(url,{signal:AbortSignal.timeout(120000)});assert(response.ok,url.href);
          bytes=Buffer.from(await response.arrayBuffer());break;
        }catch(error){if(attempt===3)throw error;}
      }
      let compared=bytes,expectedBytes=record.bytes,expectedHash=record.sha256,comparison='exact-bytes';
      // Git's Windows checkout can use CRLF for JSON/glTF/license text, while
      // Pages builds on Linux use LF. Verify the manifest against either Git
      // line-ending representation, then compare canonical content. Binary
      // models, buffers and images must always match byte for byte.
      if(/\.(gltf|json|txt|md)$/.test(record.file)){
        const local=await readFile('public/assets/'+record.file),canonical=normalizeText(local);
        const variants=[local,canonical,Buffer.from(canonical.toString('utf8').replace(/\n/g,'\r\n'))];
        assert(variants.some(value=>value.length===record.bytes&&hash(value)===record.sha256),record.file+' source manifest');
        compared=normalizeText(bytes);expectedBytes=canonical.length;expectedHash=hash(canonical);comparison='utf8-lf';
      }
      assert.equal(compared.length,expectedBytes,record.file+' bytes');
      const sha256=hash(compared);assert.equal(sha256,expectedHash,record.file+' hash');
      report.assets.push({file:record.file,bytes:bytes.length,comparison,comparedBytes:compared.length,sha256});
    }
  }));
  browser=await chromium.launch({channel:process.env.RELEASE_BROWSER||'chrome',headless:true});
  report.browser=browser.version();report.platform=process.platform;
  for(const mobile of [false,true]){
    const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:900},isMobile:mobile,hasTouch:mobile});
    const page=await context.newPage();
    page.on('pageerror',error=>report.errors.push(error.message));
    page.on('console',message=>{if(message.type()==='error')report.errors.push(message.text());});
    page.on('response',response=>{if(response.status()>=400)report.errors.push(response.status()+' '+response.url());});
    page.on('requestfailed',request=>report.errors.push(request.url()+': '+request.failure()?.errorText));
    await page.goto(base,{waitUntil:'load',timeout:120000});
    await page.waitForFunction(()=>window.worldRouter?.activeZoneInstance&&window.worldRouter.controller.enabled&&!document.getElementById('asset-loading-mask'),null,{timeout:120000});
    assert.equal(await page.evaluate(()=>typeof window.__storyQA),'undefined');
    assert.equal(await page.locator('#debug-zone-selector,[data-route-action]').count(),0);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    if(mobile)await page.locator('#touch-objective').tap();
    const visit=await page.evaluate(()=>({zone:window.worldRouter.activeZoneId,enabled:window.worldRouter.controller.enabled,position:window.worldRouter.controller.position.toArray(),resources:performance.getEntriesByType('resource').map(r=>r.name).filter(n=>n.includes('/assets/'))}));
    assert(visit.position.every(Number.isFinite));
    await page.screenshot({path:`${out}/${mobile?'touch':'desktop'}-opening.png`});
    report.visits.push({mobile,...visit});await context.close();
  }
  assert.deepEqual(report.errors,[]);report.verdict='PASS';
}catch(error){report.verdict='FAIL';report.failure=error.stack;process.exitCode=1;console.error(error);}
finally{await browser?.close();report.verifiedAt=new Date().toISOString();await writeFile(out+'/result.json',JSON.stringify(report,null,2));}
console.log('PUBLIC_RELEASE',report.verdict,'assets',report.assets.length,'production visits',report.visits.length);
