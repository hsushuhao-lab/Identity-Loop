# M9 evidence deferral input recovery

On the actual ZHOU desktop route, clicking “暫不提交，回 3F 文史館查證” closed the final terminal but left `controller.enabled=false`. Neither normal W input nor a canvas click restored movement. The run had not ended and no dialogue or modal remained. Evidence: `../../qa-evidence/zhou-latest-continuation/input-session.json`, actions 611–634; `ZHOU-desktop-m9-defer-controller-disabled.png`.

The independent UI change adds `openM9({onCommit,onDefer})` and clears the panel before invoking `onDefer`. It never submits a choice. Duplicate or stale deferral events cannot invoke recovery after an ending. `resumeM9WorldInput` keeps input disabled when a dialogue is active or the run has ended.

Necessary integration patch: both existing `openM9` call sites (the normal final terminal in `src/main.js` and the route interaction in `src/story/IdentityRouteDirector.js`) pass this guarded recovery callback. These changes are isolated in a separate commit for review. They only restore UI control; identity, save, gates, story and single submission logic are unchanged.

Validation: `node scripts/test-m9-defer-recovery.mjs` covers unchanged snapshot on deferral, four identity pairs remaining submitable once, rejection of a second submission, stale events, and active-dialogue/ended-run guards. Actual normal-render browser continuation is recorded separately from these unit fixtures. The source before repair is 539eb70 plus DutyLogStatus and TouchControls fixes; source after repair adds the UI API and integration commits. Public 539eb70 alone does not contain any of these candidate fixes.
