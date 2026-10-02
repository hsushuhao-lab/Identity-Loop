# Local quality cycle: M1 recovery and clinical surfaces

Release baseline: `539eb70`. This increment is local; no merge, push or deployment is authorized for this cycle.

## Verified defects and completion gates

| Priority | Defect | Gate |
| --- | --- | --- |
| P1 | Reload during M1 discards signed log, HIS submission, locker/key progress | Four Seeds retain actual transactions and access; unperformed calls remain pending; journal entries survive; old/new runs cannot fabricate progress |
| P1 | Credential hotspot is buried in an opaque desk body | Supported, collision-free standing approach and unobstructed ray; actual E/touch handler retrieves the card |
| P2 | Painted wall uses the vinyl polymer material; Z wall repeat uses thickness; door grain stretches | Correct local PBR trio, color spaces, image aspect and metric UVs; fixed-camera comparison under identical exposure and practical lighting |
| P2 | Fixed station furniture lacks floor contact | One merged soft contact approximation; explicit ownership/disposal; mobile scene remains within budget |
| Pending | Independent touch worker changes and continuous-route QA | Integrate only when delivered, review conflicts, rerun relevant production browser checks |

## M1 save contract

The existing identity save gains a versioned, run/identity-scoped `m1HandoffCheckpoint`. Only actual spare-key/door, credentials, locker and handoff flags and their five task transactions are captured. Deduplicated writes occur in GameState transaction listeners, including before the HIS delivery animation finishes. They do not save arbitrary player location, hospital state or every line of dialogue.

Restoration happens before 3F scene construction, so the door, hidden spare key, unlocked locker and physical key visibility use the real flags. Entry narration is skipped only with this run's actual `route:M1:0` record. A completed transaction not yet consumed by the director re-enters its ordinary completed binding: it produces the earned journal entry without another player action. Li and Zhang still perform their different calls; Zhou and Chen finish through the existing key-completion path. Chapter completion clears the partial checkpoint. New runs reset it; stale seed/identity/schema or inconsistent prerequisites are rejected. Old saves restart the chapter safely.

B2 one-way access, M9 irreversible identity/employee pair, route order, endings and anonymous early identity presentation are unchanged. The settings note accurately names the limited M1 saving coverage.

The credential drawer now has a visible front and handle at the desk edge. Its interaction volume is outside the solid desk, without removing the desk collider or allowing through-wall aiming.

## Environment increment

`PaintedPlaster017` is an ambientCG CC0 material identified by its official page/API as surface/height-field photogrammetry. Its albedo/OpenGL-normal/roughness maps are local 1024x512 JPEGs, original aspect preserved. `prototype/scripts/plaster-provenance.json` records the download and source/delivery hashes. The 1x.5m repeat is project calibration; official physical dimensions are unspecified. Plastic010 remains the vinyl finish.

Three shipped channels add 476,648 bytes. Plaster texture RGBA+mipmap estimate decreases from 64MiB to 8MiB per trio; this is an estimate, not a device memory benchmark. There are no new light sources, shadow maps or postprocessing passes. Fixed furniture contact is a 64x64 RGBA approximation in one merged draw; it is not a traced or dynamic shadow. Zone teardown releases it once without disposing borrowed registry maps.

Metric rounded-box UVs correct the door grain scale without changing geometry/collision. Z walls use visible length instead of thickness. Finish colors/roughness preserve ordinary warm clinical lighting. Exposure and practical light direction/intensity remain unchanged. The first procedural stucco trial was rejected after image inspection; only the final photographed paint material is shipped.

## Evidence and limits

Evidence is retained in the task workspace's `qa-evidence/quality-cycle` and `qa-evidence/environment-refinement` folders. The latter's `comparison-manifest.json` records the identical cameras, exposure, presets, original PNG hashes and unchanged main/lighting source hashes. The before views use the released 4F visual code; early M1-only changes do not affect those views.

Fixed station frame: desktop Quality 530→531 draws, 255721→255739 submitted triangles; mobile Performance 291→292 draws, 128111→128129 triangles. Corridor resource counts stay unchanged: mobile 167 draws/93941 triangles. Scene budgets pass. These frozen software-rendered fixtures validate resource/interaction behavior; they are not physical-phone FPS measurements.

The full photorealistic target remains open: characters, some devices/furniture, room glass and dynamic shadows still need dedicated art work. This increment addresses specific environment defects; it does not certify indie-release readiness, four continuous human playthroughs, offline/PWA lifecycle or real Android/iOS performance. Independent touch/character workers remain separate integration inputs. No EEG/WCAP data was accessed.

## Repeatable local checks

- `npm run test:identity` (includes M1 storage recovery and all route/B2/M9 checks).
- Fast structural script list from `.github/workflows/deploy-pages.yml` (includes metric PBR and M1 recovery).
- `npm run build`, then `node scripts/test-m1-recovery-browser.mjs <evidence-dir>`.
- `node scripts/test-environment-refinement-browser.mjs <evidence-dir>` for final PBR/channel/resource checks.
- `npm run test:mobile` and `npm run test:exploration:browser` for controls and the independent hospital excursion.
- `node scripts/verify-art-assets.mjs` to verify/hash retained assets; `node scripts/check-asset-budget.mjs` for the transfer budget.

Do not rebuild while production browser checks run against the same dist. Publish only after a new approval in the parent workflow.

## Completed local validation

Runtime implementation/build SHA: `43aafde80eae6c1774128290f89199d9d63f862b`. All following checks passed on that production bundle; the subsequent QA-only commit strengthens the physical restoration assertions and accounts for the added contact draw without changing runtime code.

| Check | Result |
| --- | --- |
| Identity/storage/B2/M9 scripts | 36 PASS |
| Fast deployment structural scripts | 35 PASS |
| M1 actual E/UI/touch + reload | 33 checkpoints PASS; all four Seeds; out-of-order HIS, pending call, earned journal, real door/collider/locker/key states |
| Desktop/mobile hospital controls | 17 PASS |
| Hospital annex and independent ledger | 15 PASS |
| Fixed-camera PBR/channel/budget views | 4 PASS |
| Asset parsing/hash and transfer budget | PASS; 72,113,051 runtime asset bytes |
| Production build | PASS; existing large-chunk warning remains (main 1,034.14kB / 372.37kB gzip) |

Browser reports contain no page errors or failed runtime resource responses. Screenshots use actual production-world rendering. The ordinary mobile gestures and story panels were tested in browser emulation; physical phones remain an external gate.
