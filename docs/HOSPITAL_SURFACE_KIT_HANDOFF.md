# Hospital surface kit handoff

Base: `bfa960a0bbf2410c7c40c931e2a8b1aee1f40593`, isolated branch `feat/hospital-surface-kit`.
Owner integration is required: normal `index.html` / `main.js` do not import this optional pass yet.
No owner worktree files, main/world files, story, identity, floor maps, colliders, NPCs or runtime state were changed.

## Files

- `prototype/src/art/HospitalSurfaceKit.js`: PBR finish copies, original procedural detail atlas, merged shallow relief, optional overhead color finish and reversible cleanup.
- `prototype/scripts/test-hospital-surface-kit.mjs`: ownership, zero-draw mode, merged geometry, rollback, light preservation and zone teardown checks.
- `prototype/scripts/capture-hospital-surface-kit.mjs`: production-built import into the actual baseline 4F game, fixed-camera comparison, mobile budgets and gameplay-state invariance.
- `docs/HOSPITAL_SURFACE_KIT_HANDOFF.md`: this integration/QA note.

## Owner integration

Use after PBR readiness and `batchStaticWardBeds(zone)` succeeds. Waiting avoids cloning unfinished material maps or breaking bed batching reuse. Keep installation on the zone instance, once per load. The function itself is idempotent for the same zone root; its first options remain in effect until disposal.

```js
import { installHospitalSurfaceKit, finishHospitalLighting } from '../art/HospitalSurfaceKit.js';
import { isMaterialSurfaceReady } from '../art/MaterialRegistry.js';

// Suggested hook in owner update/readiness flow; no core patch is included here.
if (this.activeZoneId === 'first_campus_4f' &&
    zone.staticBedBatchComplete &&
    isMaterialSurfaceReady('plaster') && isMaterialSurfaceReady('terrazzo')) {
  zone.hospitalSurfaceKit ??= installHospitalSurfaceKit(zone, {
    zoneId: 'first_campus_4f',
    equipment: false
  });
}
```

`equipment:false` is the default and recommended with owner's phase3 `HospitalAtmosphere.js`: this pass leaves its screens, phone labels, wheelchair details, lights and staff visuals alone. It adds wall vents, sockets and kickplates, and clones only named registry materials. Existing albedo/normal/roughness maps and UV repeats stay attached to the original borrowed textures. No registry material is modified.

`zone.hospitalSurfaceKit.dispose()` restores original material references and frees its owned atlas, geometry and material copies. Existing `disposeZoneArt(zone.zoneGroup)` also works: this pass chains the root's existing `userData.disposeArt` hook and runs cleanup before child resource traversal. Explicit cleanup is useful if the owner has a different teardown implementation. Discard the zone handle when unloading.

Optional lighting is a separate owner choice:

```js
// At each owner refresh: dispose the previous finish BEFORE baseline refresh.
this.surfaceLightFinish?.dispose();
// existing applyZoneLighting(...) / phase refresh here
this.surfaceLightFinish = this.activeZoneId === 'first_campus_4f'
  ? finishHospitalLighting(this.lightingGroup) : null;
```

It only cools existing `RectAreaLight` panel colors to `0xe6eeec`. Intensities, reading/task point lights, emergency lights, phases and shadow settings remain under owner control. It adds no lights. Supplying `lightingGroup` to installation applies this once instead; refreshing the baseline lighting later requires the separate refresh hook above.

Other options:

- `panels:false`: material-only path, zero added draw calls and no atlas allocation.
- `equipment:true`: adds anonymous perforated relief on the existing terminal rear and phone side. No UI text or new interaction. Two more local meshes (maximum total 3 draws / 144 triangles). Default off to avoid phase3 duplication.
- `panels:[{position:[x,y,z],size:[width,height,depth],yaw,tile}]`: explicit zone-local decoration for an owner-authored annex. Set the corresponding `zoneId`; automatic 4F anchors are rejected elsewhere. Tiles 0/1/2/3 are vent/socket/kickplate/perforation. Coordinates are visual anchors only; owner must place them on existing solid wall segments.
- `handle.stats`: changed mesh count, material variants, theoretical extra draws/triangles, atlas estimate, light and shadow-caster counts.

## Art and cost

The original 512×512 canvas atlas is generated synchronously from authored shapes, screws, louvres and deterministic scratches. It contains no names, codes, evidence or text. No external image, remote request or new stock asset is needed. The QA output saves the actual bound canvas as `detail-atlas.png`.

The default 10 shallow wall panels are merged into one opaque single-material geometry: 1 draw, 120 triangles, no new shadow casters or lights. Atlas cost is 1 MiB RGBA, approximately 1.33 MiB including mipmaps; this is an estimate, not measured GPU memory. Texture count increases by one. No postprocess is added. The pass is compatible with the existing Performance mode (pixel ratio 1 and shadows disabled).

## Verified QA

Commands from `prototype`:

```sh
node scripts/test-hospital-surface-kit.mjs
npm run build
npm run test:hospital
node scripts/test-static-ward-beds.mjs
node scripts/capture-hospital-surface-kit.mjs <absolute-output-directory>
```

All passed. The capture builds the optional module into a separate production QA bundle under ignored `prototype/qa-results/hospital-surface-kit-build`; it does not modify normal main/world entrypoints. Browser: headless Chromium / SwiftShader, touch emulation, DPR 1, Performance mode, story checkpoint M2 on baseline 4F. Cameras and simulation are fixed per before/after pair. Six existing overhead panels receive the optional light-color finish in these comparisons.

| Fixed view | Draw calls before → after | Triangles before → after |
| --- | --- | --- |
| Landscape corridor, 844×390 | 254 → 255 | 105,463 → 105,583 |
| Landscape equipment, 844×390 | 677 → 678 | 194,125 → 194,245 |
| Portrait corridor, 390×844 | 135 → 136 | 92,157 → 92,277 |

Each view remains below baseline budgets of 900 draws / 700,000 triangles. PBR copies reuse existing maps (30 material variants); warm renderer texture counts increase by 1 and return to baseline on disposal. Geometry counters, draw calls and triangles also return to baseline. Identity/hospital snapshots, collider bounds and interactable IDs are unchanged; no browser page/resource errors occurred. Opt-in equipment reports 3 meshes / 144 triangles. These are render-complexity checks, not FPS measurements; no physical handset was tested.

Evidence on this machine: `C:/Users/Asher/Documents/game/2026-10-02/task-3/qa-evidence/hospital-surface-kit/`:

- `landscape-corridor-before.png`, `landscape-corridor-after.png`
- `landscape-equipment-before.png`, `landscape-equipment-after.png`
- `portrait-corridor-before.png`, `portrait-corridor-after.png`
- `*-restored.png`, `detail-atlas.png`, `result.json` with build hash, cameras and counters

Visual inspection confirms the vents and sockets are visible against the existing corridor wall, grounded in shallow relief; the hospital wall/metal palette and overhead pools are cooler. Existing room plaques, doors, equipment screens and controls remain visible. This is a targeted surface/detail pass; the owner's phase3 provides broader environment and interaction expansion.

No push, merge or deployment was performed. The owner must cherry-pick this commit and insert the optional readiness/light hooks to ship it.
