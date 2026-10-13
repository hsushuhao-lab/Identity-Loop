# Echo survey playable increment — 2026-10-13

Base: published `6396be5253b1a007f95f353cd58b09b563efa791`. The increment reuses 4F's equipment corner and the existing optional service annex. It adds one anonymous adult night technician, a real equipment bench, three independent physical stations, a borrowed recorder, a reusable isolation plug and an optional three-observation receipt. No extra floor, paid asset, external license acceptance or identity answer is introduced.

## Player experience

Find the 4F survey box, enter the existing annex through the storage room and talk to its technician. West paper, east relay and north duct stations can be explored in any order. Borrowing and recording use explicit buttons. The recorder never runs out; all observed descriptions can be reread in its notebook. Three observations suffice to file the receipt, even if the player never retransmits a signal. Existing storage access remains governed by the mainline; it is not bypassed.

Each station can contribute exactly one confirmed retransmission. A cancelable confirmation explains the persistent effect. Walking, elapsed time, opening a panel, rereading and repeat clicks never advance mutation. Three authored levels change a clearly labeled **local test clock**, persistent duplicated-paper traces, contradictory relay labels and a spatial return pattern. The canonical story clock and original vent/relay test state stay unchanged. The technician has different responses at each level and after filing. Returning to 4F exposes the receipt and, at level three, a combined paper/relay/air echo.

After two observations the technician offers a reusable plug. It can isolate one retransmitted station, be removed or moved to another. Accumulated traces remain; effective audible intensity drops by one. The physical loaned tools disappear from the equipment bench and the inserted plug appears at its station. Neither tool is consumed. Panels always offer closing, and annex panels also offer direct return to 4F. Return closes the panel before capturing the movement state, preserving restored controls.

## Persistence and boundaries

`IdentityLoop_Optional_EchoSurvey_v1:<encoded runSeed>` is independent of hospital and identity saves. Validated, canonical station sets and a three-station maximum survive reload and repeated zone rebuilds. Old saves with no key start with empty survey data. Unknown versions/run keys, malformed JSON, duplicate/unknown stations and invalid plug placement cannot fabricate a completed survey. A new run uses a fresh key. Blocked storage keeps the active session playable and shows a truthful warning that reloading loses its survey.

No IdentityManager, mainline evidence, door permission, absolute time or ending writes exist in the survey model. The host gates optional entry around dialogue, modal, travel, emergency and ending states. Mainline updates pause while its panel/annex is active. B2/M9 never receive survey props. Reloading inside the annex returns to the existing saved mainline zone while preserving survey data.

The technician reuses the project's procedural clinical-character geometry with distinct workwear, a radio, head tracking and a short interaction pose. Existing licensed work-desk/material resources are reused. Geometry, labels, local clock hands, status LEDs and paper traces are installed in actual zones, not left as unused assets. No extra scene light or postprocessing pass is added. Spatial Web Audio uses one bounded burst of at most three sources; paper rustle, relay clicks and filtered duct breath use distinct procedural synthesis. One small noise buffer is reused per context. Hidden/muted pages and zone disposal stop sources; ambient bursts do not overlap or run over dialogue, settings or modals. Explicit recordings may finish their brief sound while the instrument panel is open.

The annex also receives a finite-height fallback when its asynchronous desk instance is empty, matching the existing release's desk-safety contract.

## Validation

`npm run test:echo` contains six state tests and four acoustic resource/lifecycle tests. All six station orders, passive completion, unique-choice caps, replay, filter relocation, reload, old/corrupt/future saves, loop isolation, failed storage, spatial coordinates, distinct sound types, source bounds, context replacement and disposal are checked.

`npm run test:echo:browser` contains eleven production-bundle integration checks: all four identities' passive optional completion, native E/touch/DOM interaction, actual supported NPC/station approaches, canceling borrowing/retransmission, three authored stages, reusable tool transfer, real WebAudio playback/end, panel return/control restoration, one actor after rebuild, real reload with the same seed, legacy hospital data without an echo key, 4F budgets and exclusion from B2. An explicit M2/KEY_PICKUP checkpoint and standing/camera fixtures are used; main rendering is sampled. This is assisted integration, not an unassisted playthrough or physical-device acceptance.

Local regression also passes 87 floorplan/story suites, the existing 15-check annex/ledger suite (including supported continuous walks), 17-check mobile/equipment suite, 10-check tap/fullscreen suite, 10-check B2 exit/recovery suite and two-check M9 deferral suite. The ordinary entry and full four-good-endings plus wrong-ending verification remain required for the exact published commit. CI retains its repaired on-demand render driver and original game update loop. No player FPS setting changes are delivered. No lint/TypeScript project is configured; changed JavaScript is syntax checked and production built.

## Cost comparison

Same local build configuration against `6396be5`: main module grows from **1,050,093 to 1,069,504 bytes** (+19,411, approximately 1.85%); gzip grows from **377,727 to 384,825 bytes** (+7,098). Runtime asset files remain exactly **74,463,816 bytes**, with no additional downloadable model, texture or audio file.

The same supported 4F terminal approach in Performance mode, DPR 1, sampled at 390×844 / 844×390, changes draw calls from **281 / 676** to **295 / 698**, and triangles from **113,667 / 194,221** to **115,951 / 199,353**. Both remain within the original 900-call / 700,000-triangle budget. The sampled annex north view is 66 calls / 7,523 triangles. These are view-specific software-browser measurements, not phone FPS, end-to-end load latency or a worst-case claim. Hidden objects and other viewpoints differ. Original 30/30/60 FPS targets and raster presets are unchanged.

Windows local QA uses Node 24.18.0, Playwright 1.63.0 and Chromium/SwiftShader for fixtures; ordinary production smoke uses installed Chrome 154. Hosted CI uses Ubuntu, Node 22 and Chromium. Physical iPhone/Android performance, haptics and subjective sound quality remain unverified. The existing large-bundle warning remains. This is a completed small authored increment toward higher quality, not a claim of AAA production scale.

Local ignored evidence: `prototype/qa-results/echo-release/`. Exact-commit CI, Pages and public reports must be linked in the final handoff. Build success alone is not publication.
