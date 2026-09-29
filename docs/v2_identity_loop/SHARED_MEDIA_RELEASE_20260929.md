# Shared media repair — 2026-09-29

## Scope and source

Baseline: `87f9e5cf13bd4c60d1dd15fac09115c01f2f5c7c`.
Four-seed production-build validation: GitHub Actions run `36505908545`, repair source `a807b498ac844d5f9a49b3628d8329bebc51604d`.
Only the tested runtime/test blobs were promoted; temporary patch files and workflow are not production dependencies. No new binary art assets were added.

This release unifies shared archival media in Identity Loop: albums, wall photographs, gallery, CCTV/memory presentation, poster readers and second-campus duty-room photographs. It is not a rebuild of all hospital geometry, characters or every game cutscene.

## Implemented

- Replace legacy album captions with photographic observations plus four distinct seed readings. Ten reviewed existing photographs have 40 distinct seed reactions. Twelve album definitions use real image pages rather than text-only documents; legacy frame counts remain unchanged and no repeated padding pages are introduced.
- Preserve source sequences, sequence references and callback timing. Separate safe presentation data from the original narrative data. Linear-mode narrative data is not rewritten.
- Share a matte archival presentation and restrained photographic/CCTV treatment. Preserve 3:4 atlas crops, 3:2 source images and poster proportions; use contain rather than stretching. Do not draw cartoon people over identity-mode evidence imagery.
- Separate overlapping second-campus 2F photo/frame, first-campus 3F photo/poster and second-campus 5F photo/poster mounts. Clear the 3F archive bookshelf, fix two backwards-facing posters, move the 4F photo inside its wall boundary and move the B2 photo away from the cabinet.
- Replace remaining second-campus duty-room silhouette fallback photographs in Identity Loop with the same reviewed photographic surfaces; face them into the room and support optional E-key reading.
- Optional media reading does not change story flags or advance the seed. Required Zhang guard-album/gallery completion is granted only at the matching route step after every image page has loaded and been visited.
- Early personnel-roster inspection has a neutral locked message, not identity answers. The seven canonical candidates remain available at the appropriate late evidence step. Poster UI does not label clues TRUE/FALSE. Remove the exposed `張 Seed` M6 objective wording.

## Verification

Each of LI, ZHOU, ZHANG and CHEN:

- 13 scene fixtures, 51 real E-key shared-media interactions, 68 image/subtitle pages.
- 255 geometric samples with a valid supported standing position and the actual player collision radius; no accepted clicks through opaque geometry. Five samples on each face, with the tabletop album using repeated center probes.
- Narrow viewport album pagination and the early/late roster gate passed.
- Zero recorded page/resource errors and warnings in the successful final records.

Totals: 52 scene loads, 204 E-key reads, 272 image/subtitle pages, 1,020 geometry samples. Existing Li/Zhou M6 production-handler/viewer integration passed all four desktop/narrow cases. Identity suites: 21/21; unchanged production structural gate and build passed.

Caveat: the first final LI run failed its narrow-viewport horizontal-overflow assertion after all 51 desktop interactions. An unchanged-source rerun passed, including M6. The cause of that isolated failure has not been established; it is retained in the external evidence bundle and must not be described as a diagnosed/fixed CSS bug.

These are seeded scene/interaction fixtures, not four physical full-route playthroughs, exhaustive mobile-device coverage or a loading-performance benchmark. Forced scene placement does not make B1 or other optional areas mandatory on every route.

## Repeat

From `prototype`, with locked dependencies and the Playwright Chromium browser installed:

```sh
npm run test:identity
npm run build
MEDIA_ROUTE=LI node scripts/test-shared-media-browser.mjs qa-results/shared-media-LI
MEDIA_ROUTE=ZHOU node scripts/test-shared-media-browser.mjs qa-results/shared-media-ZHOU
MEDIA_ROUTE=ZHANG node scripts/test-shared-media-browser.mjs qa-results/shared-media-ZHANG
MEDIA_ROUTE=CHEN node scripts/test-shared-media-browser.mjs qa-results/shared-media-CHEN
node scripts/test-identity-m6-cg-browser.mjs qa-results/identity-m6-cg
```

The renderer is sampled on demand for software-GPU CI; geometry, event handling and production readers are not replaced with UI mocks. Pages deployment/fingerprint verification is a separate release check.
