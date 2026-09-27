# Identy Loop《夜班迴廊 Version 2》

目前唯一正式執行版本是 **Three.js + Vite web game**，位於 `prototype/`。

> **Repository source of truth**
>
> - Default/mainline branch: `main`
> - Production runtime: `prototype/`
> - Production deploy: `.github/workflows/deploy-pages.yml`
> - Public build: https://hsushuhao-lab.github.io/Identy-Loop/
> - Historical UE5 / Act 1 handoff packages / old screenshots / old QA evidence are not part of the current working tree. If absolutely needed, recover them from Git history instead of restoring them to the active branch.

## Authority order

When code, old documents, screenshots, and chat history disagree, use this order:

1. `docs/v2_identity_loop/IDENTY_LOOP_MASTER_SPEC.md`
2. `prototype/src/story/IdentityLoop*.js`
3. `prototype/src/core/IdentityManager.js`
4. Current `main` production runtime under `prototype/src/`
5. Runtime canon:
   - `prototype/src/story/CharacterBible.js`
   - `prototype/src/story/NarrativeV22.js`
   - `prototype/src/main.js`
3. Current design locks:
   - `docs/ART_STYLE_LOCK.md`
   - `docs/CHARACTER_BIBLE_V3.md`
   - `docs/20260926_narrative_v2_2/`
   - `docs/20260925_v2_upgrade/`
6. Latest successful GitHub Actions run and its uploaded QA artifacts

> This repository is independent from `DutyNight`. `DutyNight` is the straight-line Version 1 project and must not be modified from this project.

Do **not** use stale feature/fix branches, old screenshot folders, archived Act 1 specs, or old generated build files as implementation authority.

## Current game structure

```
Identy-Loop/
├── prototype/                       # only active game runtime
│   ├── index.html
│   ├── package.json
│   ├── public/                      # production models, PBR textures, narrative art
│   ├── src/
│   │   ├── main.js                  # story/runtime integration
│   │   ├── core/                    # state + persistent memory
│   │   ├── story/                   # narrative, characters, cinematics
│   │   ├── world/                   # current hospital world/zones
│   │   ├── art/                     # material/model/art loading
│   │   ├── audio/                   # Web Audio
│   │   └── ui/
│   ├── scripts/                     # browser/runtime QA
│   └── test_*.js                    # structural regression gates
├── docs/                            # current design/source-of-truth docs only
├── .github/workflows/               # deploy + browser regression
├── DESIGN.md
└── run-prototype.cmd
```

## Run locally

```bash
cd prototype
npm ci
npm run dev
```

Production build:

```bash
cd prototype
npm run build
```

## QA and evidence policy

Do not commit generated browser screenshots, walkthrough captures, comparison folders, or one-off QA evidence back into the source tree.

The long browser regression uploads evidence as a GitHub Actions artifact:

- local/public M2–M9 playthrough
- material runtime audit
- cold/warm loading audit
- visual captures

Use those artifacts for review. The working tree should contain source code, production assets, current tests, and current design locks only.
