# Annie continuous-topology asset handoff

Independent branch `feat/realistic-annie-asset`, based on `539eb70`. This branch
adds an optional real GLB character and verified local 5F playable art fixture.
No existing scene, story, runtime, identity, floor map, main file or package file
is modified. Owner's task-2 worktree and its uncommitted work were only read.
No push, merge, release or deployment was performed.

## Delivered appearance and identity

Adult CPR training mannequin, nominal anatomy height 1.65 m. Generic continuous
MakeHuman anatomy replaces the assembled procedural face, hands and body. The
asset has modeled eyelids, lips, nose, ears, five fingers, short wig cards,
tailored collar/lapels/sleeves, pale vinyl PBR surface, unbranded coat, scrub
trousers and the existing faded blue cuffs. It has no new name badge, inscription,
blood, living-person skin SSS, breathing, blinking, dialogue, clue or NPC AI.

`STORAGE_STATIC` stays completely still, seated on a small stool.
`BRIDGE_MANIFEST` stands with overlapped hands and a restrained skeletal head
turn. `FLOOR6_CPR` uses a planted adult stance at this bed height, torso lean and
110/min bounded compression; feet do not animate through the floor. All state
changes and encounter triggers remain the owner's existing responsibility.
The source is modeled anatomy, not a scan/likeness of a person and not a copy of
a commercial manufacturer's branded CPR product.

All upstream mesh, morph, rig, weight, skin, eye, wig, clothing texture and UV
data used here are CC0 and can be modified and redistributed with a public repo.
Full terms are in `prototype/public/assets/characters/annie/LICENSE-CC0.txt`;
publisher URLs, source authors and exact adaptations are in `PROVENANCE.md`.
Source and output hashes are in `manifest.json`. MakeHuman's separate code
GPL/AGPL license does not apply to its explicitly CC0 graphical assets. No
upstream code/application was executed or included in this branch.

## Files

- `prototype/src/art/AnnieAsset.js`: loader/cache, synchronous prefetched factory,
  skeletal poses, bounded animation, inspection and instance/cache cleanup.
- `prototype/scripts/fetch-annie-sources.py`: hash-checked official CC0 data fetch.
- `prototype/scripts/build-annie-asset.py`: original OBJ/fitting/weight/PBR/GLB converter.
- `prototype/scripts/optimize-annie-asset.mjs`: isolated build-time cloth/footwear simplification.
- `prototype/scripts/test-annie-asset.mjs`: GLB structure, normalized weights,
  budgets, embedded textures, hashes and license assertions.
- `prototype/scripts/capture-annie-asset.mjs`: production-built before/after,
  identical-light assertions, motion, mobile/load and 13 lifecycle checks.
- `prototype/scripts/preview-annie-asset.mjs`: interactive localhost 5F fixture,
  with `--smoke` validation and clean process shutdown.
- `prototype/public/assets/characters/annie/annie-trainer.glb`: self-contained runtime asset.
- Same asset directory: `vinyl-base.jpg`, `vinyl-normal.png`, `vinyl-orm.jpg`,
  `wig-base.png`, `wig-normal.jpg`, `eyes-base.jpg`, `coat-base.jpg`,
  `coat-normal.jpg`, `scrubs-normal.jpg`, `shoes-base.jpg`: texture authoring sources.
- Same directory: `vinyl-uv.png`, `coat-uv.png`, `scrubs-uv.png`: exact 1024² UV wire guides.
- Same directory: `manifest.json`, `PROVENANCE.md`, `LICENSE-CC0.txt`.
- `docs/ANNIE_ASSET_HANDOFF.md`, `docs/ANNIE_ASSET_QA.json`: handoff and saved verification.

Only the GLB loads at runtime. Separate JPG/PNG authoring files and UV guides
are not extra requests. Base color is sRGB; normals and packed roughness are
linear. UV guides use top-left image origin and preserve the exported GLB's UV
islands exactly. Use these islands for future cloth/vinyl painting rather than a
2D character cutout. Full-resolution source input ZIPs (~307 MB) are local build
inputs under ignored `.visual-work`; they are not runtime downloads or commits.

## API

```js
import {
  preloadAnnieAsset, createAnnieAsset, updateAnnieAsset,
  disposeAnnieAsset, clearAnnieAssetCache, inspectAnnieAsset
} from './art/AnnieAsset.js';

await preloadAnnieAsset(); // do this in the owner's zone-art readiness barrier
const annie = createAnnieAsset(zoneGroup, {
  state: 'STORAGE_STATIC', position: [61, 0, 1], rotationY: Math.PI / 2
});
await annie.userData.ready;
updateAnnieAsset(annie, delta);
// Normal zone disposal calls the supplied userData.disposeArt hook.
// Or: disposeAnnieAsset(annie);
// At final application teardown only: clearAnnieAssetCache();
```

With a completed prefetch, `createAnnieAsset` populates rig/anchors synchronously,
so existing zone constructors can access them immediately. Without a prefetch,
the root is returned immediately with an awaitable `userData.ready`; preserve a
fallback until ready. Fetch errors reject readiness and clear the failed cache
entry. Explicit cache teardown is refused while loading or while instances exist.

Options: `state`, `position`, `rotationY`, `posture:'standing'` for the existing
3F lying-cart transform, `stool:false`, optional custom `url`. The default URL
respects Vite BASE_URL. No separate GLTF loader manager is required.

Preserved anchors: `Annie_Head`, `Annie_Rig_UpperBody`, `Annie_Stool`,
`Annie_HandStack_Bottom`, `Annie_HandStack_Top`, `Annie_Cuff_-1`, `Annie_Cuff_1`.
Cuff meshes have independently cloned materials; the current 5F
`cuff.material = cuff.material.clone(); cuff.material.color.set(0x4c6880)` remains
supported and its copies are disposed. `root.userData.rig.compression` is the
existing 6F signal. Head/hand/upper-body anchors are actual skeletal bones.

Owner integration suggestions (not applied here):

1. Gate character zones on `preloadAnnieAsset()`.
2. Delegate `AnnieArt.createAnnieArt` to `createAnnieAsset` and its update to
   `updateAnnieAsset`; retain the original practical light and its target/tokens.
3. Remove the old wrapper's geometry/head/hand reparenting. Reparenting these
   skeletal anchors would alter the skin hierarchy. Root IDs/interactables,
   original narrative and existing head-turn calls stay at their current sites.
4. Compose the practical's shadow disposal with the asset's existing dispose hook.
5. Include the GLB in the owner's asset-integrity/provenance checks before a release.
   Recheck all actual encounter/cart transforms after this integration. The
   optional fixture is evidence for the art/rig, not completion of story QA.

This branch intentionally does not import the module from main/scene factories.
It is ready for owner review and selective integration.

## Verification and performance tradeoff

Final GLB SHA-256:
`eb07cfa1498963b5f2981325216df95c7014651c2f95d2e8fe7a942b52195f1e`.

Runtime GLB: 1,709,500 bytes, one request, core glTF 2.0, embedded PBR images, no
Draco/KTX/new runtime decoder. Eight character meshes / 32,696 triangles; with
stool, nine meshes / 32,888 triangles. 53 bones. Approximately 1.22 MB geometry
and 12.33 MiB RGBA texture storage including mipmaps; driver formats/overhead are
not measured. Ten texture images (skin base 1024², other maps 256–512²). Instances
share loaded geometry/textures and clone skeletons/materials. No lights added.
The old procedural asset uses less texture/geometry storage; this deliberately
spends that budget on natural topology and surface detail while reducing draws.

| View, identical camera/time/lights | Before scene draws / triangles | After scene draws / triangles |
| --- | ---: | ---: |
| 5F seated, 1100×850, DPR 1 | 88 / 29,145 | 75 / 37,039 |
| 5F face close view, same renderer | 63 / 22,581 | 57 / 35,659 |
| Fresh mobile 390×844, touch, DPR 1 | — | 47 / 34,493 |

Before is the actual integrated procedural character at `539eb70`. In after
views only its meshes are hidden; its original practical stays enabled. Camera,
scene, time and lights are identical; visible-light matrices/color/intensity are
asserted equal. Headless Chromium uses SwiftShader; no handset FPS is claimed.
The renderer's configured `targetFPS` field is a setting, not a measured result.

Desktop localhost cold-ready ~31 ms and warm instance ~2 ms in this run. Mobile
browser network emulation (5 Mbit/s downstream, 100 ms latency, no CPU throttle)
recorded ~10.37 s ready / ~11.28 s first rendered with 1,709,500 body bytes. These
are this browser/host's timings, not an actual phone or a bandwidth-only forecast.
Prefetching is necessary for a seamless entrance; do not hide this cost with a
claim of instant mobile loading. All captured views stay within existing scene
draw/triangle budgets. Skinning/driver/thermal costs still require device testing.

Passed commands from `prototype/`:

```text
python3 scripts/fetch-annie-sources.py ../.visual-work/annie-source
python3 scripts/build-annie-asset.py ../.visual-work/annie-source
node scripts/optimize-annie-asset.mjs ../.visual-work/annie-tools
node scripts/test-annie-asset.mjs
node scripts/capture-annie-asset.mjs ../../qa-evidence/annie-asset
node scripts/preview-annie-asset.mjs --smoke
npm run build
npm run test:character
npm run test:identity   # 35 tests PASS
```

Build's pre-existing >1000 kB main-bundle warning remains. This optional module
does not become a default character or add runtime packages in this branch.

Isolated offline tools can be recreated with:

```text
npm install --prefix ../.visual-work/annie-tools --offline --ignore-scripts --no-audit --no-fund @gltf-transform/core@4.5.0 @gltf-transform/functions@4.5.0 meshoptimizer@1.1.1
```

To play/review locally: `node scripts/preview-annie-asset.mjs`, open
`http://127.0.0.1:4238/?qa=story&identity=LI`; WASD/touch and existing 5F interaction
remain active. This local art fixture starts at the storage view. Ctrl+C stops it.
The final smoke check shut its server and browser down; no service is left running.

## Screenshots and resumption

Evidence directory:
`C:\Users\Asher\Documents\game\2026-10-02\task-3\qa-evidence\annie-asset`.

- `game-seated-before.png`, `game-seated-after.png` — same-camera full figure.
- `game-face-before.png`, `game-face-after.png` — same-camera close view.
- `mobile-seated.png` — 390×844 native mobile layout.
- `bridge_manifest-rest.png`, `bridge_manifest-motion.png` — overlapping hands and skeletal turn.
- `floor6_cpr-rest.png`, `floor6_cpr-motion.png` — planted stance and compression.
- `result.json` — saved verbatim in `docs/ANNIE_ASSET_QA.json`.
- `identity-test.log` — 35-test regression evidence.

All assets, source recipes, licenses and API are committed. Full source data and
installed offline tools remain in ignored `.visual-work`; the fetch script is
hash-checked for later resumption. Main integration and actual handset performance
are the remaining owner/device work; there is no blocked local implementation.
Do not deploy or claim release completion from this art fixture.
