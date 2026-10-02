# DutyNight local art provenance

## Original furniture
All GLBs in `public/assets/models/` were authored specifically for DutyNight by the reproducible offline `scripts/build-art-assets.mjs` generator. They contain rounded mesh edges, separate physical components, legs/supports/handles, and metric dimensions. They are original design approximations, not scans or replicas of a named hospital. GLTFExporter writes glTF 2.0 binary; no runtime procedural furniture generation or external fetch is used. No third-party model copyright is imported. The project owner may use these generated original assets under the project license.

| Asset key | Actual W × H × D metres | Origin |
|---|---|---|
| officeChair | .605 × 1.004 × .568 | floor centre; front +Z |
| workDesk | 1.405 × .751 × .725 | floor centre; front +Z |
| storageCabinet | .900 × 1.800 × .509 | floor centre; doors +Z |
| hospitalBed | .992 × .990 × 2.135 | floor centre; pillow −Z |
| bench | 1.590 × .815 × .513 | floor centre; front +Z |
| printer | .480 × .348 × .530 | bottom centre; tray +Z |
| plant | .811 × 1.300 × .417 | planter bottom centre |

These are reusable mid-detail assets. They do not independently establish photorealism or VISUAL_LOCK. Placement, lighting and reference comparison remain required.

## PBR maps
Downloaded 2026-09-17 from ambientCG API verified download URLs. All retained maps are 2048 × 2048 pixels, albedo + OpenGL normal + roughness. Source JPGs were losslessly decoded and re-encoded at JPEG quality 90 / 4:4:4 using Sharp to reduce delivery size; no resize. Texture licenses apply to the downloaded maps and derived encoding.

- [Terrazzo001](https://ambientcg.com/a/Terrazzo001), [2K source ZIP](https://ambientcg.com/get?file=Terrazzo001_2K-JPG.zip).
- [Wood051](https://ambientcg.com/a/Wood051), [2K source ZIP](https://ambientcg.com/get?file=Wood051_2K-JPG.zip).
- [Plastic010](https://ambientcg.com/a/Plastic010), [2K source ZIP](https://ambientcg.com/get?file=Plastic010_2K-JPG.zip). Clean polymer microstructure adapted for the painted coat and resilient sheet floor.
- [ambientCG license](https://docs.ambientcg.com/license/): **CC0 1.0 Universal**, allows copying, modification and redistribution including commercial use without permission.

Wood051 API dimension is 80 × 80 cm. Registry sets a .8 m repeat. Clean coating is calibrated to a .5 m repeat, vinyl to .35 m and terrazzo to a 2 × 2 m repeat for this project; appearance must be confirmed in close-up screenshots. PBR textures are local deterministic inputs; no random canvas textures. Surface clones cache dimensions and repeat, share image storage, and mark GPU resources `userData.sharedAsset=true` so zone cleanup does not invalidate cached assets.

## Runtime contract
- `getMaterials()` is synchronous and safe in Node without DOM/network.
- `materialForSurface(name,width,height)` caches physical scale variants.
- Await `preloadMaterials()` and `preloadAssets()` before creating browser scenes. Failures propagate with useful messages.
- `instantiateAsset(name)` clones objects sharing geometry/materials, or returns null before preload (headless engineering QA).
- All original GeometryFactory aliases retained, plus `lightWarm`.
- `scripts/verify-art-assets.mjs` checks GLB container structure and SHA-256 files offline. Runtime/browser rendering is a separate QA gate.

## Act 1 wall correction

The first browser comparison rejected PaintedPlaster017: its visible cracking read as building decay. It was removed from the registry and delivery assets. Candidate PaintedPlaster004 and Poly Haven white_plaster_02 were also rejected after image inspection for streaking/pitting; neither is delivered. Plastic010 was visually inspected as a smooth fine polymer surface. Hospital wall and ceiling coatings use uniform ivory pigment (material baseColor, no scanned albedo) with its fine normal/roughness maps at reduced normal strength .035. The resilient sheet floor uses the full Plastic010 PBR set at .35 m repeat and .045 normal strength. This is an adaptation of a CC0 polymer material, not a claim of scanned hospital vinyl or hospital wall paint. Lobby terrazzo remains separate. Final visual approval still requires in-scene screenshots.

## Outdoor ground correction (2026-09-18)

The terrainGrass and pathGravel registry materials now use dedicated outdoor CC0 PBR sets rather than plain green and indoor terrazzo. Both source color swatches were viewed before selection: Ground037 has moss/grass mixed with earth, small roots and natural debris; Asphalt033 is a fine-grained continuous matte surface without road markings or large damage. Both are 2048 × 2048 color, OpenGL normal and roughness maps, re-encoded JPEG quality 90 / 4:4:4 with no resize. Registry repeats are calibrated to 2 × 2 m; physical geometry variants should use materialForSurface for their actual width/length. Asset-integrity JSON records delivered bytes and SHA-256.

- [Ground037](https://ambientcg.com/a/Ground037), [2K source ZIP](https://ambientcg.com/get?file=Ground037_2K-JPG.zip), CC0 1.0.
- [Asphalt033](https://ambientcg.com/a/Asphalt033), [2K source ZIP](https://ambientcg.com/get?file=Asphalt033_2K-JPG.zip), CC0 1.0.
- Same official [ambientCG license](https://docs.ambientcg.com/license/) as the indoor source sets.

No interior registry material was changed for this outdoor correction. These scans are material sources, not a claim that the fictional hospital was scanned. Scene placement, UV scale, vegetation and lighting remain independently reviewed.

## Photographic foliage collections (2026-09-18)

Two original Poly Haven glTF 2.0 collections and their 2K maps are included without re-encoding. Every downloaded file was checked against the MD5 value returned by its official API; the local integrity manifest adds SHA-256 for all dependencies. Total added payload: **8,615,723 bytes**. These are not claimed to be Taiwanese native species.

- [Shrub 02](https://polyhaven.com/a/shrub_02), Rico Cilliers; [official file manifest](https://api.polyhaven.com/files/shrub_02). Four variants; 4,992,385 bytes including separate alpha PNG.
- [Fern 02](https://polyhaven.com/a/fern_02), Rico Cilliers (modeling), Rob Tuytel (scanning); [official file manifest](https://api.polyhaven.com/files/fern_02). Four variants; 3,623,338 bytes including separate alpha PNG.
- [Poly Haven CC0 license](https://polyhaven.com/license) explicitly permits commercial use, modification, and redistribution with a project. All maps and binary geometry here are licensed assets, not protected website preview renders.

The official glTF files set alphaMode MASK but reference JPG diffuse maps. The registry attaches the official separate alpha PNG via alphaMap, alphaTest=.5, DoubleSide and flipY=false; the source files themselves are unchanged. The PNG is linear data, not sRGB. This avoids opaque rectangular leaf cards. The registry loads each collection once, reuses its materials/textures, and caches normalized variants; each clone retains shared geometry/material/texture markers. No topology or collision data is supplied by these decorative models.

Each variant is metre-scale with horizontal bounding-box centre at x=z=0 and its lowest vertex at y=0. Access via instantiateAsset(key), with userData.dimensions=[width,height,depth]; aliases shrub/fern select variant a. Four source variants are not all placed together.

| Key | Width × height × depth (metres) |
|---|---|
| shrub_a | 1.636 × 2.158 × 1.832 |
| shrub_b | 2.063 × 1.954 × 1.821 |
| shrub_c | 2.483 × 2.382 × 2.536 |
| shrub_d | 1.613 × 1.947 × 1.817 |
| fern_a | .552 × .287 × .613 |
| fern_b | .990 × .428 × .894 |
| fern_c | .874 × .349 × .765 |
| fern_d | .573 × .213 × .593 |

Validation: offline geometry/dependency checks parse both complete four-variant collections and hash all files. An isolated real Chrome preload on port 4175 loaded all eight normalized variants, confirmed alphaMap/alphaTest/flipY, every material texture shared marker, minimum y=0 and horizontal centering. It did not occupy the main 4173 preview. This is a loader/integration check; final landscape appearance is assessed separately after placement.

## Genuine campus tree derivative (2026-09-18)

`campusTree.glb` derives from [Poly Haven Island Tree 02](https://polyhaven.com/a/island_tree_02), CC0, by Rico Cilliers (cleanup/processing) and Rob Tuytel (scanning/processing). Its source manifest is [official API](https://api.polyhaven.com/files/island_tree_02). The unmodified glTF, geometry, 2K textures, leaf alpha PNG and source MD5/SHA-256 records are retained locally under `.visual-work/tree-source/`; `scripts/campus-tree-provenance.json` records the redistribution artifact and source hashes in the repository.

The original is a genuine branched broadleaf tree with an integral trunk and canopy, not shrub geometry placed on a procedural trunk. It is a coastal tree source; no Taiwan-native species identification is claimed.

- Source geometry: **1,072,213 triangles**.
- Derived geometry: **136,564 triangles (12.7366%)**, meshoptimizer simplify target .13 and relative error .008, with glTF Transform weld/dedup/prune.
- Delivered GLB: **16,433,736 bytes**; SHA-256 `58ec0d84132ea3531a8c767da26ebf73fdfb7807d1c3624a367830db5c462e1d`.
- Plain GLB geometry, no Draco/meshopt runtime extension or added project dependency. The tools reside in isolated `.visual-work/tree-tools/`.
- 2K maps preserved in resolution; JPEG encoding quality88/4:4:4. Official leaf alpha is packed into the embedded diffuse PNG, keeping the existing texture transform and MASK material.
- Runtime key `campusTree`; normalized dimensions **4.207745 × 3.406225 × 4.070432 m**, horizontal bounding-box centre at x=z=0, lowest point y=0. Its original trunk is included; do not add another trunk.

A real Chrome render on isolated port4175 compared the original source and derivative at identical camera/light settings. Both showed a complete canopy; the derivative preserved the overall outline and branch structure. Screenshots are retained in `.visual-work/tree-review/original.png` and `derived.png`; runtime report records zero page errors, exact normalized dimensions and minY0. Due to double-sided material passes, renderer triangle submissions were 1,786,957 original versus 229,480 derivative, both 4 draws. Use a modest number of trees and separately assess whole-scene performance; this isolated asset check is not VISUAL_LOCK.

## Painted clinical surfaces (2026-10-02 local quality increment)

[PaintedPlaster017](https://ambientcg.com/view?id=PaintedPlaster017), [official 1K JPG download](https://ambientcg.com/get?file=PaintedPlaster017_1K-JPG.zip), CC0 1.0 Universal. Official asset page/API identifies **surface / height-field photogrammetry**. Three locally served channels only: albedo, OpenGL normal, roughness. The original 1024 x 512 aspect and dimensions are preserved, re-encoded at JPEG quality88 / 4:4:4 using Pillow. Retained source archive/API evidence is in the local environment QA folder; checked-in `scripts/plaster-provenance.json` records archive, original-channel and shipped-channel SHA-256 hashes.

API physical dimensions are unspecified (zero). The **1 x .5 metre repeat is project calibration**, preserving the 2:1 aspect; do not claim measured scan dimensions. Normal strength .065 represents a painted finish, without displacement/tessellation. Plastic010 remains the vinyl floor coating; it is no longer reused as painted plaster. This replaces the old 2K plaster GPU allocation with three 1024 x 512 images. Estimated RGBA + mipmaps per triplet: 8 MiB versus 64 MiB, excluding browser/driver compression and cached variants. Added transfer bytes: 476,648.

Box/rounded-box finish UVs follow physical metres on door faces; cached plane repeats are untouched. Z-oriented wall lengths now use the long dimension instead of wall thickness. Fixed nursing desks/chairs receive one merged, 64 x 64 RGBA (16 KiB) transparent floor-contact approximation; no extra lights, shadow maps or postprocessing passes. This is stationary contact shading, not physically traced dynamic shadows. Existing practical directions, intensity, exposure, story profiles and mobile quality presets remain the comparison conditions.
