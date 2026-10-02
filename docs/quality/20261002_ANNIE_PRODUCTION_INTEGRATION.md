# Annie production integration — local candidate

The optional GLB sample from `da033ab` is now used by the existing shared trainer
factory. Existing encounter IDs, early anonymity, four Seed event differences,
cart stage transforms, blue cuffs and practical lighting remain at their original
sites. This increment does not change story routes, B2 access or M9 submission.

## Asset and distribution

Generic adult CPR mannequin: continuous anatomy, 53 bones, eight character meshes,
32,696 triangles, 1,709,500-byte self-contained GLB. The seated stool adds one mesh
and 192 triangles. One GLB network request carries embedded PBR images; separate
authoring maps/UV guides are shipped files but are not extra runtime requests.
Instances share source geometry/textures and own cloned skeletons/materials.

The full retained CC0 text was read, and the official core asset policy, pinned
asset license, system-asset table and Margaret Toigo suit table were independently
checked on 2026-10-02. They permit modified graphical asset redistribution. The
separate MakeHuman/MPFB application code license is not applied to these explicitly
CC0 graphical inputs; no upstream application/code is redistributed. Sources,
authors, hashes and full terms remain in the character's PROVENANCE/manifest/license.

- https://static.makehumancommunity.org/about/license.html
- https://static.makehumancommunity.org/assets/assetpacks/makehuman_system_assets.html
- https://static.makehumancommunity.org/assets/assetpacks/suits01.html
- https://github.com/makehumancommunity/mpfb2/blob/afb9f530a7c2741dedb8df0ebae2e0b183caec21/LICENSE.ASSETS.md

## Readiness and fallback

3F, skybridge, second-campus 5F and phantom 6F preload the cached detail before
their synchronous constructors. First-campus 8F also preloads for its existing
sixth-floor elevator glimpse. Unrelated zones do not request this character.
Character loading is bounded to 12 seconds within the established zone barrier;
failure/timeout keeps the original procedural teaching mannequin playable. A late
request can improve a future factory but cannot replace an already-visible actor,
reparent skin bones or change encounter visibility. Failure clears the GLB cache
entry so a subsequent prefetch can recover. Essential hospital assets retain their
existing retry/cancel/deadline rules.

The shared wrapper dispatches by owned asset resources, not the generic
`assetVersion` field also used by the fallback. The GLB bones stay in their skin
hierarchy. The existing practical light and its parameters are preserved; cleanup
composes the model hook with exactly-once shadow disposal. Borrowed source maps and
geometry stay alive for other instances. Cache teardown is only for final app
cleanup, after every instance is released.

## Poses and physical contact

Storage stays static. Existing 3F cart lying/standing stages use the original root
transforms and named anchors. Bridge motion remains bounded and the ordinary route
visibility gate remains authoritative. CPR uses a construction-time two-link arm
reach around the current patient chest plane, with stacked wrists and planted feet;
bounded spine compression retains the existing 110/min signal and patient response.
The sample's elevated wrists were corrected after actual 6F image inspection.

## Verification

`test-annie-integrated-poses.mjs` parses the real GLB geometry/rig offline (browser
texture decoding is checked separately), exercises three poses, contact, static
storage, planted feet, bounded motion and instance-owned cleanup.
`test-annie-load-fallback.mjs` proves failure/retry/deadline and stable late-load
fallback behavior. `test-annie-integration-browser.mjs` checks actual production
factories in 3F cart/patrol, 5F storage, bridge and 6F; real E/touch document access;
PBR/rig budgets, cuffs, unchanged identity state, failure/recovery and owned cleanup.
Hidden encounter visibility is recorded before any controlled art-view reveal.

Run `npm run test:character`, `npm run test:identity`, the deployment structural
suite, build, then `npm run test:character:browser -- <evidence-dir>`. Evidence lives
in task-2 `qa-evidence/annie-integration`. Comparison originals from the independent
same-camera/light sample are retained under `qa-evidence/annie-comparisons`; these
are marked as art fixtures, separately from production integration screenshots.

Touch-dialogue recovery and truthful duty-log display were cherry-picked from
independent QA. M9 deferral callbacks are integrated. Real desktop E and native touch now defer,
walk through the archive door to the roster, return, reopen and submit once. A missing
synthesized touch click after joystick movement is recovered after 60 ms; a guard
prevents the released gesture from selecting a newly opened modal answer. The
settings layer stays beneath document modals so close buttons remain reachable. This candidate has
not been pushed or published. Physical-phone FPS, thermal behavior/PWA lifecycle,
uninterrupted four-Seed ending navigation and full photorealism remain open.
