# Current Source of Truth

This file exists to prevent stale branches, old design packets, screenshots, and QA output from being reused as current implementation guidance.

## Single active line

The repository's default branch is **`main`** (verified through GitHub on 2026-10-02). Treat it as the active/mainline source; authorized feature work is integrated there after validation.

Any other branch is non-authoritative, even if its name contains `feat/`, `fix/`, `release/`, or a newer-looking date.

## Production implementation

The game shipped to GitHub Pages is built exclusively from:

`prototype/`

The old Unreal/Act-1 skeleton and handoff packages were removed from the active tree. They remain available in Git history if provenance is ever needed.

## Narrative authority

Use current production code first:

- `prototype/src/story/CharacterBible.js`
- `prototype/src/story/NarrativeV22.js`
- `prototype/src/main.js`

Then use current design locks:

- `docs/ART_STYLE_LOCK.md`
- `docs/CHARACTER_BIBLE_V3.md`
- `docs/20260926_narrative_v2_2/DUTYNIGHT_NARRATIVE_DESIGN_FREEZE_V2_2.md`
- `docs/20260925_v2_upgrade/`

Generated artwork is visual reference only; names, IDs, roles, and story facts come from runtime canon.

## QA authority

The latest successful GitHub Actions run is the QA authority.

Generated screenshots and playthrough evidence belong in workflow artifacts, not permanent source folders. This avoids agents reviewing obsolete screenshots as if they represented the current build.

## Agent rule

Before editing:

1. fetch `master`
2. record current SHA
3. read current production files
4. do not inspect stale branches for implementation unless explicitly asked for historical recovery
5. after merge, discard the temporary branch

No new long-lived development branch should be treated as a second source of truth.
