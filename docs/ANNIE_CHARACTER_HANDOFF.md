# Annie character redesign

Base `d2e5302e2f197235305432b41ceb0d9df95299e3`; isolated branch `feat/annie-character-redesign`.

## Asset and story contract

The asset is a real Three.js `Group` of indexed `BufferGeometry` meshes, original materials/textures and a transform rig. It is generated locally from this module with no model download, image request, new dependency or software install. The design retains the adult 1.65 m CPR training mannequin, dark short wig, pale synthetic face, white coat and muted scrubs. There are anatomical sockets/nose/cheeks/chin, fixed painted eyes, brows and lips, tapered fingers with nails, folded lapels, V-neck scrubs, pockets, continuous sleeves and trousers, a closed stool cushion and feathered ground contact shadow. Joints are covered by clothing.

Existing three states remain `STORAGE_STATIC`, `BRIDGE_MANIFEST`, `FLOOR6_CPR`. Storage has **no breathing, blinking or spontaneous motion**. Bridge has the existing slight upper-body/head offset with bounded secondary head yaw. CPR retains the 110/min period, 0–1 compression and 4 cm body travel used by the patient animation. No encounter trigger, name, inscription, credential, aggression, identity answer or story flag is added. Existing stethoscope evidence remains in the old dedicated prop factory.

## API and owner patch suggestions

```js
import {
  createAnnieCharacter, updateAnnieCharacter, disposeAnnieCharacter,
  inspectAnnieCharacter
} from './AnnieCharacter.js';

const annie = createAnnieCharacter(parent, {
  state: 'STORAGE_STATIC', position: [0,0,0], rotationY: 0,
  cuffColor: null, contactShadow: true, posture: 'seated'
});
updateAnnieCharacter(annie, deltaSeconds);
// Existing disposeZoneArt(parent) also releases this asset exactly once.
disposeAnnieCharacter(annie);
```

Owner can delegate **only** `createAnnieArt(parent, options)` and `updateAnnieArt(root, delta)` in `AnnieArt.js` to these new functions. Keep `ANNIE_STATES`, `ANNIE_ART_TOKENS`, `createZhangStethoscopeProp` and inscription/privacy code in the existing file. This preserves direct scene imports and the `AnnieMannequin.js` transitional exports. No core patch is included in this commit.

The new module also exports `createAnnieArt` / `updateAnnieArt` / `ANNIE_STATES` aliases. `materials` is accepted for call compatibility; character materials are instance-owned. `Annie_Head`, `Annie_Stool`, `Annie_Cuff_-1`, `Annie_Cuff_1`, `Annie_Rig_UpperBody`, `Annie_HandStack_Bottom`, `Annie_HandStack_Top` and `userData.rig.compression` remain available. The 5F code can keep cloning/tinting cuffs blue; teardown tracks those clones as well.

**3F teaching cart needs the flat presentation option:** its existing call creates `STORAGE_STATIC` and then rotates the whole root by `Math.PI/2` around Z. Add `posture:'standing', contactShadow:false` to that specific create call so the transported body is straight and a floor shadow is not rotated onto the cart. A hidden empty `Annie_Stool` anchor is retained for the existing stage code. Existing root rotations, positions, later head turns and visibility remain owner-controlled. Other storage/cameo calls keep the seated default. Existing geometry colliders/interactable lists are not changed by this module.

Factory returns a root with the same character ID/metadata. `disposeAnnieCharacter` is idempotent and releases geometry, material copies and textures. Its root `disposeArt` hook integrates with existing `disposeZoneArt`; owned resource flags prevent double disposal. Caller must drive updates only while an encounter is active, as in the existing scenes. The delta API accepts finite nonnegative seconds and caps a single tick at 0.1 s.

## Budget and provenance

| State | Meshes / maximum main-pass draws | Triangles | Attribute + index buffer bytes |
| --- | ---: | ---: | ---: |
| Seated storage | 22 | 23,894 | 744,576 |
| Bridge / CPR | 20 | 23,524 | about 731,000 |

All geometry is indexed and merged per material/rig parent. Budget gates are ≤24 meshes, ≤28,000 triangles and ≤1 MiB geometry buffers per actor. Three original 128² RGBA textures use 196,608 bytes before mipmaps (about 256 KiB including mipmaps). Texture count includes cloth grain, synthetic surface grain and feathered contact shadow. These are data-buffer estimates, not measured total driver/GPU allocation. No light or shadow map is added. Actor meshes can use the existing owner's shadow quality setting.

All geometry, hair silhouettes, cloth patterns, facial surfaces and textures are authored procedurally in `AnnieCharacter.js` for this project. No third-party artwork/model was incorporated. The existing Three.js dependency and its license remain unchanged. Source module is the reproducible asset; runtime animation uses the returned rig. No binary model download is needed.

## QA and evidence

From `prototype`:

```sh
node scripts/test-annie-character.mjs
npm run build
npm run test:identity
node scripts/capture-annie-character.mjs <output-directory>
```

Passed: finite geometry and normals, named anchors, original texture budget, all three states, adult proportions, still storage pose, bounded bridge animation, CPR compression, 3F cart presentation, independent cuffs, existing 5F cuff clone cleanup, exact once resource release, production build and the existing 35-test identity QA suite. Normal build retains the optional module as an unconnected deliverable; owner must delegate the art factory to activate it. The production QA build imports the module independently without changing main/world/story files. Existing Vite large-chunk warning remains on the baseline game bundle.

The browser harness renders in real d2e5302 5F storage, skybridge and phantom 6F scenes with explicit QA poses, fixed cameras/time and paused simulation. Before/after storage views verify identity/hospital snapshots and interactable IDs stay unchanged. It checks budget reduction and captures real bridge/CPR motion with different frame hashes. Storage/closeup captures hide only the crosshair and interaction-prompt overlay for inspection. The mobile page starts in a fresh 390×844 touch context; CSS viewport is confirmed 390×844, Performance mode / DPR 1.

| Real 5F view | Draws before → after | Triangles before → after |
| --- | --- | --- |
| Seated overview | 131 → 88 | 149,607 → 28,045 |
| Face closeup | 70 → 63 | 43,843 → 21,481 |

Legacy seated actor alone: 63 meshes / 145,360 triangles; new actor: 22 meshes / 23,894 triangles. Fresh mobile seated frame: 60 draws / 25,499 triangles, below existing 900 / 700,000 scene budgets. Browser QA is headless Chromium / SwiftShader. No physical-device FPS acceptance is claimed.

Evidence directory: `C:/Users/Asher/Documents/game/2026-10-02/task-3/qa-evidence/annie-character/`.

- `game-seated-before.png`, `game-seated-after.png`
- `game-face-before.png`, `game-face-after.png`
- `mobile-seated.png`
- `bridge_manifest-rest.png`, `bridge_manifest-motion.png`
- `floor6_cpr-rest.png`, `floor6_cpr-motion.png`
- `result.json`: production QA bundle SHA256, exact counters, mobile viewport and compression/head transforms

Files in this commit: the character module, `scripts/test-annie-character.mjs`, `scripts/capture-annie-character.mjs`, this handoff. No original Annie file, main/world/story file or owner worktree was edited. No push, merge or deploy was performed.
