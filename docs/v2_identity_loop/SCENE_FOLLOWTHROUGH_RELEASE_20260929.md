# Scene follow-through repair — 2026-09-29

This maintenance note contains scene and route information; it is not the spoiler-free player introduction.

## Source and scope

Base main: `0b55a2326b35c4f28ce9c785dff9e449f64f1e2a` (README-only successor of published runtime `deb97bfe85dd0830ea82958ff6ca5bd2d559c1e2`). The 312 runtime/source/test files recovered for the local workspace were independently matched against Git blob hashes from this baseline. The separate DutyNight reference was read at `a88e9549676b7e57b3e51293e2e5209a393857ea`; that repository was not modified.

Candidate patch SHA-256: `86f9d2bedab6f3616fa9778cb3a7d312f98141b5a96f4cf7775c1f1d9dcb79dc`. The final verification additionally corrects browser-test fixture camera synchronization, reaches the bed form through its real nursing/bedside prerequisites, and aims the storage mannequin at its torso rather than its floor-level transform origin. These test adjustments do not bypass production decision or door handlers.

Only the 18 tested source/test blobs and this note are promoted. Temporary patch payloads, verification workflows, helper scripts, dependencies, generated builds and screenshots are excluded from main.

## Player-facing changes

1. The safe completion path of the 409 form now leads to **協助確認工作車上的藥品與器材** on all four seeds. The target is the existing physical medication cart, not a synthetic interaction in empty space. Each seed retains its own dialogue. Existing incorrect approval consequences are unchanged; the repair does not convert a bad choice into safe progression. The former optional M2 cameo is folded into this cart beat when its seed condition applies.
2. The physical sixth-floor elevator preview is owned by the actual ascent to first-campus 8F and finishes before the 8F scene is loaded. An unrelated second-campus access flag no longer blocks it, and an old incorrectly timed preview flag cannot suppress this correctly timed ascent. The landing dialogue does not replay the film. Later M6 memory films are retained.
3. Second-campus 5F's entry storage room contains a seated training mannequin with locally cloned blue cuff materials. Opening the storage door is possible before formal handoff; the addition does not globally recolor other mannequins or reveal a name.
4. The second-campus 5F duty bathroom has a closed privacy door, manually opened/closed by E without an extra key or story condition. Existing shower/toilet/basin bounds and supported access are preserved.
5. The second-campus 1F guard visitor log has a legible cover and three nonempty, neutral pages. Re-reading works. It remains a different physical book from the old photo album and does not falsely complete the album task.
6. Bridge objectives/dialogue no longer announce forced camera movement or mouse loss of control. The in-world visual event and existing decision rules remain.
7. The first-campus 2F escape/stair door is moved to the opposite east-side wall and seated against it, consistent with the existing stair travel metadata. Other floor door positions remain unchanged.
8. The first-campus 2F approach before the ER contains a wall-mounted photograph from the existing shared image set and a potted plant clear of the walking route. No new binary image is introduced.
9. The observation-bay poster is moved to a separate return wall, away from the headwall equipment. Numbered bed plaques identify beds 01–04.
10. All four routes' ER assessment activates the patient parent group as well as its physical interaction target. Tasks direct the player to observation bed 01. The cause was a legacy visibility condition hiding the parent while the route director enabled only its child. The later empty-registration event stays empty; no patient is fabricated for that event.

Route arrays and lengths are unchanged: Li 17, Zhang 16, Zhou 16, Chen 15. This patch adds a required interaction inside M2, not an extra route step. Existing save namespaces, final identity submission rules, B2 rules, BGM and other binary art are unchanged.

## Verification evidence

Successful GitHub Actions run: `36571565089`, job `109416584752`, finished 2026-09-29 13:05 UTC. Tested source commit: `9bb34e70ca7cd4600939a9717763c49a1cfcea2f` on the temporary verification branch.

Artifact `11036190608`, ZIP SHA-256 `b9530dc0d21039fba2549e3789495532435cfab5c55d77e93c15a72840450e4b`. All 18 tested source/test blobs were independently compared with the local reviewed files and matched exactly.

- 28/28 Identity suites, including ten new functional checks: PASS.
- The unchanged 26 additional production gate commands, asset budget and production build: PASS.
- New production-bundle scene browser suite: 16/16 PASS (four assessments, four form-to-cart continuations, storage mannequin, bathroom door, visitor book, ER/stair surroundings, four ascent previews).
- Prior clinical production-bundle browser suite: 12/12 PASS, including safe/badge/phone and Li ward-to-rest progression.
- First-campus bathroom WebGL/keyboard regression: PASS.
- Existing Li/Zhou M6 viewers: 4/4 PASS.
- All four successful browser result files record no page errors. The scene, clinical and first-bathroom HTTP resource error lists are empty.

The ten new local functional regressions failed against the unmodified baseline and passed after repair. They use actual production GLB models, Three.js geometry, raycasts and collision support with canvas labels stubbed in Node. They are distinct from rendered browser checks.

Two earlier browser verification attempts failed at test-fixture issues (stale camera after direct physics walking; jumping to the form without its clinical prerequisites). Both failures remain in Actions history. The final suite walks from the lift through the real ER doors for the Zhang assessment, performs the preceding nursing/408C/409 interactions before the form on all four routes, and uses actual E events and UI actions at tested objects.

## Validation boundary

Browser validation starts from seeded route checkpoints and supported standing fixtures. The main WebGL render loop is sampled on demand to keep CI practical; the production event/collision/raycast handlers and film animation are exercised. This is not four unassisted opening-to-ending playthroughs, a frame-rate/loading benchmark, a certification of every mid-event refresh, or a phone-device certification. A timestamped animation screenshot may miss the short film even when its DOM lifecycle and pre-arrival ordering pass; those assertions are not a frame-by-frame visual-quality judgement.

The large JavaScript bundle warning remains. Runtime binary asset budget remains 71,635,026 bytes. These source changes do not claim to solve the unrelated broad `sharps_container` check or the user's future visual-quality preferences.

Pages deployment and public fingerprint/live interaction results must be verified separately after promotion; successful candidate checks alone do not establish publication.
