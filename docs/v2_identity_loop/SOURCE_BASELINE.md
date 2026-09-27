# Identy Loop source baseline

- source repository: `https://github.com/hsushuhao-lab/DutyNight.git`
- source branch: `master`
- source SHA: `2f23289b19ee3f8d979ee2c6bcf77639de35d8a6`
- clone date: `2026-09-28`
- production runtime: `prototype/`
- engine: Three.js + Vite
- build: `cd prototype && npm ci && npm run build`
- inherited Pages workflow: `.github/workflows/deploy-pages.yml`, changed for `main` and the `Identy-Loop` Pages URL
- inherited QA: Node regression scripts under `prototype/test_*.js` and `prototype/scripts/`

The source checkout is retained separately under `work/Identy-Loop-source/` for auditability. This repository has no write remote to `DutyNight`.
