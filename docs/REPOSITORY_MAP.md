# Repository Map — Current Source Only

**Authoritative branch:** `main` (repository default/mainline)

## Active runtime

- `prototype/src/main.js` — interaction routing, story integration, production runtime
- `prototype/src/core/` — transient and persistent state
- `prototype/src/story/` — current narrative, characters, memory/cinematic directors
- `prototype/src/world/` — current hospital zones and routing
- `prototype/src/art/` — PBR, models, Art Pass assets, loading/readiness
- `prototype/src/audio/` — Web Audio
- `prototype/src/ui/` — UI/dialogue/archive/finale
- `prototype/public/` — production runtime assets
- `prototype/scripts/` — browser QA and deployment verification
- `prototype/test_*.js` — structural regression contracts

## Current design authority

- `docs/ART_STYLE_LOCK.md`
- `docs/CHARACTER_BIBLE_V3.md`
- `docs/20260925_v2_upgrade/`
- `docs/20260926_narrative_v2_2/`
- `docs/20260926_loading_performance/`
- `docs/20260927_character_identity/`
- `docs/20260927_three_act_presentation/`
- `docs/story/`

## Not authoritative

Do not copy implementation from:
- non-default branches
- old Act 1 packages
- old UE5 skeletons
- committed build output
- old screenshots / comparison galleries
- hash-specific QA evidence
- chat summaries when they conflict with current `master`

Historical material remains recoverable through Git history and merged PR history; it should not be restored to the working tree unless explicitly requested.
