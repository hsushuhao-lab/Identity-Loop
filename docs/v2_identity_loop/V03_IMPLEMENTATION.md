# Identity routes v0.3 implementation

Documentation snapshot: 2026-09-28. Browser acceptance and deployment verification are **PENDING**. This document describes the inspected implementation; it is not a browser or release PASS.

## Source and route order

The narrative authority is [FOUR_ROUTES_V03_SOURCE.md](FOUR_ROUTES_V03_SOURCE.md). Runtime definitions are [IdentityRoutes.js](../../prototype/src/story/IdentityRoutes.js), [IdentityRouteScenes.js](../../prototype/src/story/IdentityRouteScenes.js), [IdentityRouteDirector.js](../../prototype/src/story/IdentityRouteDirector.js), and [IdentityPrivacy.js](../../prototype/src/story/IdentityPrivacy.js).

M1 through M9 are reusable story modules, not a universal chronological counter. Internal seed identifiers below are developer references, not player-facing identity labels.

| Internal route | Ordered steps before the shared ending sequence |
| --- | --- |
| `ZHANG` | `ZHANG_OPEN_4F` → M2 → M1 → M4 → `ZHANG_SECOND_CAMPUS_SECURITY` → M5 → `ZHANG_6F_FORESHADOW` → M3 |
| `LI` | M1 → M2 → M3 → M4 → M5 |
| `ZHOU` | `ZHOU_OPEN_8F` → M4 → M5 → M1 → `ZHOU_1F_PHOTO` → `ZHOU_SECURITY_TALK` → M3 → M2 → `ZHOU_2117_RETURN` |
| `CHEN` | `CHEN_OPEN_SKYBRIDGE` → M4 → M5 → M1 → M2 → M3 |

Every row then continues **M6 → M7 → B2 → M8 → M9**, exactly as defined in the source route tables.

- The patient-first route opens at the first-campus 4F nursing station at 16:50, visits the second-campus 1F guard desk for black coffee and visitor records, and sees a floor-indicator anomaly before the later real Phantom 6F arrival. The foreshadow scene says the elevator does not open; its current host location is the first-campus 8F lift.
- The procedure-first route starts at 3F/316 and alone retains the standard module order.
- The investigation route starts at the 8F historical corridor, inspects a group photo, takes the urgent 504B call, later inspects the distinct 1F reflection photo and talks to the guard, delays ward rounds, then returns to 3F at 21:17.
- The transfer route starts at the skybridge midpoint, answers the 504B call before handover, returns across the bridge, and encounters the physical 409-A destination after reading the transfer form.

## State and scene execution

[IdentityManager.js](../../prototype/src/core/IdentityManager.js) stores a zero-based `runSave.currentRouteStep` cursor and explicit `completedStoryModules`. The `manager.currentRouteStep` getter resolves the active step ID. `currentMilestone` is a compatibility projection, not an independent progression counter. Completing M2 on the patient-first route does not complete M1. Unfinished pre-v0.3 saves restart their preserved identity at the route opening rather than inferring completed modules from the former milestone order.

The director prepares the destination, loads the configured zone/spawn, and presents each scene as inspectable beats. A live `identity_route_event` mesh and panel actions lead through inspection, dialogue, rereading, and review. Only the final reviewed beat advances the route. Scene locations include actual 403/408C beds, 504B, 316 legacy review, and second-campus 2F CCTV before the skybridge. Photo beats display both a textured scene plane and an inspected panel image.

M7 presents the guard key, conflicting manual/monitor evidence, and the B-Panel choice. The wrong 1 → 3 → 4 action displays a warning without advancing; the reviewed purple-backup action records the opening flag. B2 is one-way, retains `CURRENT SELF = CORRUPTED`, presents four anonymous roles and the fire record, and does not identify the player. M8 rejects the assigned patient identity and reviews route-specific evidence. M9 opens the four-candidate final handover; the manager rejects premature and duplicate commits. A correct choice records a GOOD_END; a wrong choice records WRONG_MEMORY_BAD_END without awarding one. These are inspected code paths, with integrated browser behavior still pending.

## Anonymous before M9

Before final M9 selection, player-facing dialogue, task text, evidence, photos, captions, and archive entries must not disclose target names, employee IDs, or the assigned seed. Familiar actions, role descriptions, locations, and photographic habits provide clues instead. The identity panel displays `未公開` even when constructed with its debug option. B2 lists anonymous roles; candidate names and employee IDs are reserved for the M9 selection interface and ending.

`IdentityPrivacy.js` applies `anonymousNarrative()` through `worldNarrative()` in the default route mode; explicit `?mode=linear` retains the previous narrative mode. The replacement patterns cover named characters, selected fragments, and numeric MED identifiers. This is presentation filtering, not proof that every rendered surface has been audited and not a security boundary around internal seed data. Full pre-M9 browser inspection, including world textures and both viewport sizes, remains pending.

See [ASSET_PROVENANCE_V03.md](ASSET_PROVENANCE_V03.md) for the two generated photos, their hashes, and the no-target-name constraint.

## Exact source baseline failures

Baseline: `2f23289b19ee3f8d979ee2c6bcf77639de35d8a6` (`exact2f23289`). The results below are the caller-provided exact-baseline findings; this documentation task did not rerun the old route or certify a fresh baseline run. The revision resolves locally, and the three named first-failure assertions were inspected in their test sources.

All entries are classified **PRE-EXISTING_BASELINE_FAILURE**. They concern inherited geometry, object registries, props, or old task-copy contracts, with no identity state logic impact attributed to them. This classification neither fixes the failures nor converts the affected suites to PASS.

| Invocation from baseline `prototype/` | Reported baseline result | Failure scope |
| --- | --- | --- |
| `node test_world_traversal_qa.js` | 144 pass / 11 fail | Ten screen orientations: first-campus 4F A–D plus duty screen, and second-campus 5F A–D plus duty screen; one missing `second_duty_room` registry entry. |
| `node test_screenshot_access_qa.js` | First failure: `sharps_container` | Missing expected clinical prop; only the first failure is reported here. |
| `node test_second_campus_environment_qa.js` | First failure: `Second2F_BridgeLobbyStand_1` | Missing expected scene object; only the first failure is reported here. |
| `node test_travel_ui_contract_qa.js` | First failure: old text `19:30 查看 408C 反映的敲牆聲` | Inherited literal task-copy expectation; only the first failure is reported here. |

## Validation and workflow status

- Four-route browser QA: **PENDING**. No local or public browser PASS is claimed here.
- Deployment and public build fingerprint: **PENDING**. Existing screenshots or earlier release reports do not certify this v0.3 revision.
- The manual `.github/workflows/story-browser-playthrough.yml` title is **Previous v0.1 Story Browser Playthrough**. It describes the previous browser scenario, not a dedicated Linear-mode run. Renaming its display title does not change its commands or qualify it as v0.3 acceptance.
- Relevant new checks are `node test_identity_routes_qa.js`, `node scripts/run-identity-qa.mjs`, and `node scripts/test-identity-routes-browser.mjs` from `prototype/`. Listing these invocations is not a claim that this documentation task executed them.
