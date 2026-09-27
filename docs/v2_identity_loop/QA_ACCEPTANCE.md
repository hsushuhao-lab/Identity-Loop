# V2 QA acceptance

## Structural

- `IdentityManager` persists one seed, uses the independent storage namespace, supports a shuffle bag, one-way B2, one-shot M9, four good ends, wrong-memory bad ends, and M10 unlock.
- M1–M8 identity dialogue contains no conclusive self-identification.
- M5 is skybridge-only and B2 cannot be re-entered after exit.
- Existing Three.js/Vite build and inherited route regressions remain runnable.

## Browser

- Open the production build with `?mode=identity-loop`.
- Verify the identity panel shows the shared route, current milestone, evidence, B2 lock, and M9 four-choice handover.
- Exercise a forced QA seed through `?qa=story&identity=ZHANG` (the forced seed is a test hook only).
- Capture the initial world, identity panel, B2 archive, M9 choices, good end, and wrong-memory end at desktop and narrow viewports.

## Deployment

Build and deploy only from `main` to `https://hsushuhao-lab.github.io/Identy-Loop/`. Public verification must compare the runtime fingerprint to the exact deployed commit SHA.
