# Annie adult CPR trainer — asset provenance

Retrieved 2026-10-02. Generic modeled anatomy adapted into a synthetic training
mannequin; not a scan of a real person, a commercial brand model, or a new story
character. All shipped upstream graphical data is CC0. No payment, login or new
paid license was used; no downloaded upstream application was executed.

| Input | Publisher / author | License / evidence |
| --- | --- | --- |
| hm08 continuous basemesh, adult female morph targets, game-engine 53-bone rig and weights | MakeHuman Community; Data Collection AB, Joel Palmius, Jonas Hauquier named in source headers | CC0; [official asset policy](https://static.makehumancommunity.org/about/license.html), [core data reuse](https://static.makehumancommunity.org/mpfb/faq/build_other_chargen.html), pinned [asset license](https://github.com/makehumancommunity/mpfb2/blob/afb9f530a7c2741dedb8df0ebae2e0b183caec21/LICENSE.ASSETS.md) |
| short02 mesh/texture/normal, low-poly eyes/grey texture, middleage_asian_female skin, female_casualsuit01 mesh/normal, shoes01 mesh/texture | MakeHuman system assets | CC0; [publisher's per-asset license table](https://static.makehumancommunity.org/assets/assetpacks/makehuman_system_assets.html); source OBJ/MHCLO/MHMAT headers explicitly record 2020 CC0 release |
| toigo_female_suit (fem_suit.obj, fitting data, fabric bump) | Margaret Toigo (MRT in source) | CC0; [publisher's per-asset table](https://static.makehumancommunity.org/assets/assetpacks/suits01.html), fitting file begins `author MRT`, `license CC0` |

Core asset revision: `afb9f530a7c2741dedb8df0ebae2e0b183caec21`.
Official data archives:

- https://files2.makehumancommunity.org/asset_packs/makehuman_system_assets/makehuman_system_assets_cc0.zip
- https://files2.makehumancommunity.org/asset_packs/suits01/suits01_cc0.zip

Full CC0 text is preserved as `LICENSE-CC0.txt`. `manifest.json` preserves source
SHA-256 hashes (including original archives), output texture hashes, model hash,
geometry counts, source revision and optimization recipe. Source software has a
separate GPL/AGPL license; its code is neither imported nor redistributed here.
The converter reads data with a small original implementation. Public format
behavior was checked against official documentation/source without executing it.

Original adaptations: fit a generic adult shape to 1.65 m; retain continuous
anatomical face/ears/five fingers; remove covered anatomy; fit a short synthetic
wig; recolor skin detail into matte gray-ivory vinyl; derive restrained normal and
roughness maps; recolor and lengthen unbranded tailored coat panels; add subtle
cloth folds; remove source skirt and covered inner blouse; make scrubs/footwear
neutral; transfer normalized skin weights; author trainer poses and bounded
motion. No blood, logo, inscription, person name or new identity clue is added.

Build tools: existing Python/Pillow/NumPy and isolated official glTF Transform
4.5.0 + meshoptimizer 1.1.1. Only cloth and footwear simplify; face/fingers keep
their source topology. Output is core glTF 2.0 with embedded PBR images; no runtime
decoder, new package, NPC AI or shader extension is required.

Runtime downloads only `annie-trainer.glb`. Separate JPG/PNG files are texture
authoring sources; `*-uv.png` are exact 1024² UV wire guides, not runtime loads.
Their image origin is top-left; exported glTF UVs match these guides. Retain the
UV guides' island placement when painting. Skin/coat/scrubs are 1024² UV guides;
base color is sRGB, normals/roughness are linear. Do not replace the model with a
2D character image or bake lighting into an albedo texture.
