import { chromium } from 'playwright';
import { build, preview } from 'vite';
import { mkdir, writeFile, readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('..', import.meta.url));
const out = resolve(process.argv[2] || root + '/qa-results/hospital-surface-kit');
await mkdir(out, { recursive: true });
// A production-built QA entry injects the import without editing main/world files.
const outDir = root + '/qa-results/hospital-surface-kit-build';
await build({ root, base: './', build: { outDir, emptyOutDir: true }, plugins: [{
  name: 'surface-kit-qa-import', transformIndexHtml: { order: 'pre', handler(html) {
    return html.replace('</head>', `<script type="module">import * as surfaceKit from '/src/art/HospitalSurfaceKit.js';window.__hospitalSurfaceAPI=surfaceKit;</script></head>`);
  } }
}] });
const server = await preview({ root, build: { outDir }, preview: { host: '127.0.0.1', port: 4203, strictPort: true } });
const files = await readdir(outDir + '/assets');
const js = await readFile(outDir + '/assets/' + files.find(f => /^index-.*\.js$/.test(f)), 'utf8');
const loop = js.match(/function (\w+)\(\)\{requestAnimationFrame\(\1\)/)?.[1]; assert(loop);
const report = { base: 'bfa960a0bbf2410c7c40c931e2a8b1aee1f40593', bundleSHA256: createHash('sha256').update(js).digest('hex'),
  method: 'Production-built optional module in the actual 4F game scene. Fixed cameras, time, quality mode and RAF; SwiftShader headless Chromium at mobile viewports. On-demand render counters only; no physical-device FPS claim.',
  errors: [], views: [], checks: [] };
const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
let page;
try {
  const context = await browser.newContext({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
  page = await context.newPage();
  page.on('pageerror', e => report.errors.push(e.message));
  page.on('response', r => { if (r.status() >= 400) report.errors.push(r.status() + ' ' + r.url()); });
  page.on('requestfailed', r => report.errors.push(r.url() + ': ' + r.failure()?.errorText));
  await page.addInitScript(name => {
    localStorage.setItem('IdentityLoop_Quality_v1', 'performance');
    const raf = requestAnimationFrame.bind(window);
    window.requestAnimationFrame = fn => { if (fn.name === name) { window.__surfaceFrame = fn; return 0; } return raf(fn); };
  }, loop);
  await page.goto('http://127.0.0.1:4203/?qa=story&identity=LI', { timeout: 120000 });
  await page.waitForFunction(() => window.__storyQA?.identityRouteDirector && !window.__storyQA.identityRouteDirector.busy && window.__hospitalSurfaceAPI, null, { timeout: 120000 });
  await page.evaluate(async () => {
    const q = window.__storyQA, m = q.identityManager, d = q.identityRouteDirector;
    q.uiManager.closeAllTransientOverlays(); q.uiManager.dialogueSequence = null; d.removeInteractionTarget();
    m.runSave.currentRouteStep = m.route.indexOf('M2'); m.runSave.currentMilestone = 'M2'; m.save(); d.busy = false;
    await d.loadCurrentStep({ forceLoad: true }); q.controller.enabled = true;
  });
  await page.waitForFunction(() => { const q = window.__storyQA; q.worldRouter.update(.01); return q.worldRouter.activeZoneInstance.staticBedBatchComplete; }, null, { timeout: 120000 });
  const capture = async name => {
    const stats = await page.evaluate(async () => {
      await new Promise(requestAnimationFrame);
      const q = window.__storyQA; q.qualitySettings.lastRender = 0;
      // Render directly through the real composer; keep the simulation frozen.
      q.qualitySettings.render(performance.now());
      const { p95FrameMs, sampledFrames, ...stats } = q.qualitySettings.snapshot();
      return { ...stats, rendererMemory: { ...q.qualitySettings.renderer.info.memory } };
    });
    await page.screenshot({ path: `${out}/${name}.png` });
    return stats;
  };
  const frozen = await page.evaluate(() => {
    const q = window.__storyQA, z = q.worldRouter.activeZoneInstance;
    return { identity: q.identityManager.snapshot(), hospital: q.hospitalSimulation.snapshot(),
      collision: z.colliders.map(b => [b.min.toArray(), b.max.toArray()]), interactables: z.interactables.map(o => o.userData.id) };
  });
  const cameras = [
    { name: 'landscape-corridor', viewport: { width: 844, height: 390 }, position: [5, 1.7, -8.3], target: [6.879, 1.5, -6.6] },
    { name: 'landscape-equipment', viewport: { width: 844, height: 390 }, position: [3.5, 1.7, -1.1], target: [3.05, .95, -2.4] },
    { name: 'portrait-corridor', viewport: { width: 390, height: 844 }, position: [5, 1.7, -8.3], target: [6.879, 1.5, -6.6] }
  ];
  for (const view of cameras) {
    await page.setViewportSize(view.viewport);
    await page.evaluate(view => {
      const q = window.__storyQA; q.controller.teleport(...view.position); q.lookAt(view.target);
    }, view);
    // Warm baseline uploads and compilation before sampling memory/calls.
    await capture(view.name + '-before');
    const before = await capture(view.name + '-before');
    const kitStats = await page.evaluate(() => {
      const q = window.__storyQA;
      window.__surfaceHandle = window.__hospitalSurfaceAPI.installHospitalSurfaceKit(q.worldRouter.activeZoneInstance, { lightingGroup: q.worldRouter.lightingGroup });
      return window.__surfaceHandle.stats;
    });
    assert.equal(kitStats.finishedOverheads, 6, 'existing 4F overheads receive optional color finish');
    if (view === cameras[0]) {
      const atlas = await page.evaluate(() => window.__storyQA.worldRouter.activeZoneInstance.zoneGroup
        .getObjectByName('HospitalSurfaceKit_MergedRelief').material.map.image.toDataURL('image/png').split(',')[1]);
      await writeFile(out + '/detail-atlas.png', Buffer.from(atlas, 'base64'));
    }
    await capture(view.name + '-after');
    const after = await capture(view.name + '-after');
    assert(after.drawCalls - before.drawCalls <= 1, 'default kit adds at most one visible draw');
    assert(after.triangles - before.triangles <= 120, 'relief geometry budget');
    assert(after.withinSceneBudget); assert.equal(after.pixelRatio, 1); assert.equal(kitStats.addedLights, 0);
    const beforeHash = createHash('sha256').update(await readFile(`${out}/${view.name}-before.png`)).digest('hex');
    const afterHash = createHash('sha256').update(await readFile(`${out}/${view.name}-after.png`)).digest('hex');
    assert.notEqual(beforeHash, afterHash, 'visual change must reach the real rendered scene');
    const detailGeometry = await page.evaluate(() => {
      const z = window.__storyQA.worldRouter.activeZoneInstance;
      return z.zoneGroup.getObjectByName('HospitalSurfaceKit_MergedRelief').geometry.attributes.position.count;
    });
    assert.equal(detailGeometry, 360);
    report.views.push({ ...view, before, after, delta: { drawCalls: after.drawCalls - before.drawCalls,
      triangles: after.triangles - before.triangles, textures: after.rendererMemory.textures - before.rendererMemory.textures },
      kitStats, screenshots: [view.name + '-before.png', view.name + '-after.png'] });
    await page.evaluate(() => window.__surfaceHandle.dispose());
    const restored = await capture(view.name + '-restored');
    assert.equal(restored.drawCalls, before.drawCalls); assert.equal(restored.triangles, before.triangles);
    assert.equal(restored.rendererMemory.textures, before.rendererMemory.textures);
  }
  const afterState = await page.evaluate(() => {
    const q = window.__storyQA, z = q.worldRouter.activeZoneInstance;
    return { identity: q.identityManager.snapshot(), hospital: q.hospitalSimulation.snapshot(),
      collision: z.colliders.map(b => [b.min.toArray(), b.max.toArray()]), interactables: z.interactables.map(o => o.userData.id) };
  });
  assert.deepEqual(afterState, frozen);
  report.checks.push('gameplay snapshots, colliders and interactable IDs unchanged', 'draw/triangle budgets', 'material/atlas restoration', 'landscape + portrait real production renders');
  // Explicit opt-in equipment relief is validated separately, then removed.
  const optIn = await page.evaluate(() => {
    const z = window.__storyQA.worldRouter.activeZoneInstance;
    const h = window.__hospitalSurfaceAPI.installHospitalSurfaceKit(z, { equipment: true });
    const result = h.stats; h.dispose(); return result;
  });
  assert.equal(optIn.addedDrawCalls, 3); report.equipmentOptIn = optIn;
  assert.deepEqual(report.errors, []); report.verdict = 'PASS';
} catch (error) {
  report.verdict = 'FAIL'; report.failure = error.stack; process.exitCode = 1;
  if (page) await page.screenshot({ path: out + '/failure.png' }).catch(() => {});
  console.error(error);
} finally {
  await writeFile(out + '/result.json', JSON.stringify(report, null, 2));
  await browser.close(); await new Promise(r => server.httpServer.close(r));
  console.log('SURFACE_KIT_RESULT', report.verdict, out);
}
