# Identity v0.3 photo provenance

Recorded 2026-09-28. The main agent generated these two fictional archival-style photos with the built-in **imagegen** tool on 2026-09-28: `history-group.png` in invocation `exec-f38364e8-f894-4adb-bc70-f0739d927e92`, and `history-reflection.png` in invocation `exec-b55ddda3-7136-4683-9733-c892af88ec5e`. They are generated game art, not recovered historical photographs. The original generation prompts and precise times were not provided to this documentation task.

The existing files were read directly, their PNG headers and hashes measured, and both images visually inspected. No images were generated, altered, or replaced by this documentation task.

Asset directory: `prototype/public/assets/identity-v03/` (served as `public/assets/identity-v03/` within the prototype project).

| File | Scene use | Format / dimensions | Bytes | SHA-256 |
| --- | --- | --- | ---: | --- |
| `history-group.png` | `history_group_1998`: 8F historical corridor group photo | PNG / 1536 × 1024 | 2,242,061 | `e10b816c73a8d9cc3b353cce63b6ebffe6dcb3a1be2c8f904c3a55562b9843b3` |
| `history-reflection.png` | `guard_reflection_1998`: first-campus 1F equipment/guard reflection photo | PNG / 1536 × 1024 | 2,299,519 | `d6d9487759668ed17f5e00d7307673f2d7e74c46b786775478288a387cf71eff` |

[IdentityRouteScenes.js](../../prototype/src/story/IdentityRouteScenes.js) assigns the photo IDs to the opening group-photo beat and later reflection-photo beat. [IdentityRouteDirector.js](../../prototype/src/story/IdentityRouteDirector.js) maps them to the filenames above and prefixes runtime URLs with `import.meta.env.BASE_URL`. The same files supply a scene texture and the inspected panel image.

## Anonymous visual contract

Neither photo carries visible target names or readable employee IDs in the inspected images. Filenames, photo IDs, and the director's alternative text contain no target names. Captions and pre-M9 dialogue must retain that anonymity; do not add named portraits, identity labels, or a statement revealing which candidate is the current player.

The group image shows an aged hospital staff group portrait without a visible photographer. The second image shows people at an equipment cabinet, with a partial camera/hand/wrist reflection in glass rather than an identified photographer. The narrative calls for photographic habit and wristwatch clues; this inspection does not certify a readable watch brand or every small visual detail requested by the source narrative.

## Verification boundary

File existence, non-empty PNG data, dimensions, SHA-256 values, and the static visual observations above were checked locally. In-game photo loading, aspect ratio, visibility, pre-M9 anonymity across all rendered surfaces, mobile layout, and deployed asset delivery are **PENDING browser/deployment validation**. No runtime, visual-release, or public deployment PASS is claimed.
