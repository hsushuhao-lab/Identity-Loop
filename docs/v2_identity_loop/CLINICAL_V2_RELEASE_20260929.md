# Clinical v2 — approved interaction and duty-bathroom release

## Source provenance

Base main: `cfeadc3cc0c1c85dc5273126d04c410997f2b280`.
Approved v2 candidate patch SHA-256: `83f1b69e27549576ad498f85ca3424f90a21b97baca98b560b217945ed9a4466`.
Successful verification branch commit: `e026c8c82ab0198c8db34e0afe06814d6dd5d475`.
GitHub Actions run: `36557570136`, Clinical v2 release verification, SUCCESS, finished 2026-09-29 10:51 UTC.
Artifact `11029115800`, SHA-256 `4385d077d1acd75b045cba12d379572e9a5bfcbf3b84c7f805d3adbc9b1d4713`.

The 31 source/test blobs were independently checked against the extracted verified source using Git blob SHA-1. All matched. Of the approved candidate's original 30 files, 29 are unchanged. The only runtime follow-up is two guarded pointer-lock promise calls in main.js, preventing expected NotAllowedError rejections from becoming unhandled page errors. The additional file is the real first-campus bathroom browser test. No temporary compressed patch, verification workflow, node_modules or generated dist is promoted.

## Player-visible changes

- Second-campus 5F nurse-station interactions use the real workstation screen on all four routes, including matching prompts and computer sound.
- The shared treatment order is named 醫囑單 in principal interactions and route dialogue. Internal IDs and unrelated late-story room/bed evidence remain intact.
- Chen's safe has a hollow shell and hinged lid. Opening retires its enclosing interaction sensor; the badge is independently targetable and collectible. UI submissions are single-shot. Hidden parent geometry is not selectable.
- Second-campus 2F monitoring telephone sits on a separate physical four-legged table, without overlapping the computer hit target. The required call advances once; optional use on other seeds does not advance the route.
- First-campus 4F duty bathroom has a shower, toilet, basin, mirror and enclosure within its existing bounds. Second-campus 5F duty-room fixtures and furniture are repositioned around a shower/toilet/basin area. Both retain supported walking routes and fixture collisions.
- Li's M2 links 408C assessment, 409 sealed-door inspection, the order decision and return to the duty room. The real 409 knob also maps to the inspection. Li's local knock event and text are irregular, forceful impacts rather than the 4-pause-9 code; the other seeds' rhythm remains.
- The brief elevator glimpse uses a physical DutyNight-style door-seam shot, not a command to remember the frame or a duplicate explanatory slideshow. This is not a replacement of every M6 memory film.
- HospitalScore replaces the two fixed route tones with four motifs, phrase progression, six environment moods and ducking around calls/events. It is original synthesized audio, not a licensed recorded soundtrack, and musical satisfaction remains a listening judgement.

Route lengths and order remain Li 17 / Zhang 16 / Zhou 16 / Chen 15. No new binary art assets were added.

## Successful verification

- 27/27 Identity test suites; unchanged production structural gate; upper-room and default-door regressions; asset budget; production build: PASS.
- Clinical production-bundle browser checks: 12/12 PASS. Includes four nurse computers, wrong/correct safe code, badge E-key pickup and narrow inspection UI, following duty phone, second-campus bathroom movement, mandatory/optional CCTV phone, Li 408C-to-409-to-rest call, and physical glimpse cleanup.
- First-campus 4F bathroom: 7/7 geometry tests plus production-bundle WebGL/keyboard test PASS. Open/close/reopen via E, walk into shower and return, fixture presence, and 390px layout were checked.
- Existing Li/Zhou M6 viewers: 4/4 PASS (1280 automatic and 390 manual, six frames each).
- The three successful browser result files recorded zero page errors; clinical and bathroom resource-error lists were empty.
- 27 successful screenshots: 6 clinical, 5 first-campus bathroom, 16 M6.

## Verification boundary and retained caveats

The browser tests run real production-bundle handlers, raycasts and keyboard events from seeded checkpoints and supported standing fixtures. Main WebGL rendering is sampled on demand for CI. These are not four unassisted opening-to-ending playthroughs, a phone-device certification, or a loading-time benchmark. A same-session scene rebuild does not establish arbitrary mid-beat save restoration after F5.

The Vite large-chunk warning remains. Runtime asset budget at verification was 71,635,026 bytes. A broader local screenshot-access check previously reported the pre-existing sharps_container issue; it is not part of the unchanged release gate and was not silently repaired or counted as passing here. Earlier failed verification attempts remain in Actions history; the final bathroom-test fix refreshes the real ray target between key presses instead of bypassing the production door handler.

Pages deployment, public build fingerprint and any live-site smoke are separate post-promotion checks. Their job results, rather than this pre-deployment note, determine whether publication has completed.

## Reproduce

From prototype, with Node 22:

```sh
npm ci
npm run test:identity
npm run build
npx playwright install --with-deps chromium
node scripts/test-clinical-interactions-browser.mjs qa-results/clinical-v2/clinical
node scripts/test-first-duty-bathroom-browser.mjs qa-results/clinical-v2/first-bathroom
node scripts/test-identity-m6-cg-browser.mjs qa-results/clinical-v2/m6
```
