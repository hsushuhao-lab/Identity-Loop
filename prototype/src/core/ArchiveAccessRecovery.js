// Rebuild only a recorded, completed B2 physical award; never infer it from seed.
export function restoreEarnedArchiveAccess(gameState, run) {
  if (!run || run.runEnded || !['LI', 'ZHANG'].includes(run.currentIdentity) ||
      !run.completedStoryModules?.includes('B2') ||
      run.evidence?.['route:B2:1']?.milestone !== 'B2') return false;
  gameState.setFlag('ARCHIVE_ACCESS_KEY', true);
  return true;
}
