# DutyNight visual and interaction contract

## Authority

The current authority is [`docs/20260925_v2_upgrade/README.md`](docs/20260925_v2_upgrade/README.md), including its fixed M1–M9 walkthrough, enclosed-world rules, V2 art direction, Annie identity, and screenshot/release gates. This file summarizes the presentation rules for implementation. Historical Act 1 and M1–M9 documents do not define current scope. In particular, old statements that Bed 33 or 6F were not implemented must never be used to remove current story content.

The player is an on-call physician in a fictional Taiwanese psychiatric hospital. The fixed story moves from an ordinary shift through 409A/Bed 33, 21:17, 00:33, 316 identity evidence, the second campus, Annie and its two routes, elevator-only 6F, 02:17/B2, identity takeover, and the real 316 handoff. Preserve the established story; improve the production quality and horror progression around it.

## Material and signage

Use aged warm ivory paint, institutional sage wall protection, subdued clinical vinyl, terrazzo public corridors, dark stained wood doors, brushed stainless steel, aluminum frames, acoustic ceiling grids, and textured privacy glass. Use local PBR color, normal, and roughness maps through `MaterialRegistry` with consistent real-world UV scale. Avoid mirror floors, flat hero furniture, global teal/green grading, and theatrical orange/blue light.

Use Traditional Chinese system sans-serif with restrained English secondary text. Mount signs and notices physically with backing, supports, and plausible placement. Generated text and labels inside concept images are not story canon. Remove only the duty-room bathroom's external washroom plaque; retain the actual bathroom and its internal fixtures. No decorative wall clocks in key story spaces.

## Spatial composition and set dressing

The production world is indoor-only. The enclosed skybridge is the only inter-campus route in either direction. Hillside and ecology source modules can remain for historical geometry tests, but production routes, choices, tasks, and selectors must not lead outdoors. 6F is reachable only through the story elevator hijack and never appears as an ordinary floor or pre-event task.

Build believable room shells, door frames, baseboards, wall rails, ceiling grids, notices, and furniture silhouettes before small props. Dress work areas with plausible whiteboards, acrylic notices, logbooks, binders, pens, tissues, lamps, phones, printers, carts, and clinical supplies. Every prop must rest on a surface or a mount. Keep door swings, desk/chair pullout, and patient circulation clear. Put the 4F duty desk, chair, and extension phone beside the bed; maintain at least 0.8m of clear circulation. Fix geometry and camera defects directly; never hide them with fog, darkness, or props.

4F has exactly 32 official beds, 401A–408D. Room 409 is sealed and has no census bed; 409A exists as the anomalous Bed 33 story clue, not an ordinary physical or census bed. M4 remains a calm, ordinary occupied consult; the pre-filled internal transfer is its horror clue. Keep the hospital visually ordinary early, then use localized lighting and composition to increase unease.

## Annie

Annie is the same late-1990s CPR training mannequin in static storage, the bridge manifestation, and the 6F CPR scene. Build it through one shared model with explicit states. It is not a living woman, doctor, physician ghost, deceased clinician, or aggressor. Zhang owns the white coat and stethoscope; the mannequin is a vessel for memory. At 6F, show the CPR training action rather than a chase.

## Lighting progression

- 17:00–20:40: warm-neutral practicals, readable ivory and sage, modest window contribution, normal hospital ambience.
- 21:17: reduce ambient fill to about 0.22, keep fluorescent pools localized, leave corridor ends deep, and use small emergency-green spill.
- 00:33–02:00: reduce ambient fill to about 0.08, with stronger contrast, legible clinical objects, reflections, and warm phone/desk islands.
- 6F/B2: practicals, near-black periphery, localized dirty green/cyan emergency light and archival tungsten; preserve navigable geometry.

The horror profile uses about 0.04 ambient fill. These values are hemisphere-light intensity tokens, not exposure settings; practical lights must keep interaction targets readable while peripheral geometry falls into shadow.

Use bounded local lights and stable exposure. Keep material detail visible in highlights. Do not apply a global haunted-house wash or use lighting to conceal collisions and clipping.

## UI and QA

Keep the existing HUD and HIS implementation tokens unless a concrete V2 readability issue requires a targeted change: HUD background `rgba(24,31,28,.65)`, text `#f3f1e9`, sage `#b4c7b8`, border `#658b76`; 12px body/14px location, 8px/12px padding, 16px screen margin, 288px task width. HIS title `#355342`, header `#e1e8e3`, table heading `#cfdbd3`, 13px operational type, 2px corners. Small-screen HIS scrolls while keeping its footer accessible.

Production labels contain no debug/milestone metadata. Screenshot timeouts, missing files, browser errors, and off-frame QA anchors are hard failures. Follow `docs/20260925_v2_upgrade/QA_V2.md` for the exact local/public screenshot and release contract; state-machine tests alone cannot establish visual acceptance.

## Identy Loop V2 extension

The V2 identity surface is a restrained clinical evidence console layered over the existing world. It uses the existing HUD tokens plus `identity-loop-panel` tokens: translucent hospital surface `rgba(18,24,21,.88)`, sage text `#b4c7b8`, ivory text `#f3f1e9`, archive accent `#f2d6a3`, 12px operational type, 15px serif section heading, 6px radius, and 10px blur. The reusable primitives are the milestone header, evidence list, B2 archive detail, M9 choice button, and ending card; states are hidden seed, archive-open, M9-open, and ending-open. The panel is real DOM, responsive at desktop and narrow widths, and its buttons remain keyboard-focusable.
