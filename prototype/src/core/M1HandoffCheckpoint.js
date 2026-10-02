// A small transaction checkpoint, not a snapshot of the hospital or arbitrary dialogue.
export const M1_FLAGS = Object.freeze(['FOUND_316_SPARE_KEY', 'OPENED_316', 'HIS_CREDENTIALS', 'LOCKER_OPENED', 'M1_HANDOFF_CHOICE_RESOLVED']);
export const M1_TASKS = Object.freeze(['DUTY_LOG', 'HIS_CREDENTIALS_FOUND', 'E_HANDOFF', 'LOCKER_OPENED', 'KEY_PICKUP']);

export function validateM1Checkpoint(value, run) {
  if (!value || value.version !== 1 || value.runSeed !== run.runSeed ||
      value.identity !== run.currentIdentity || run.runEnded) return null;
  const flags = Object.fromEntries(M1_FLAGS.filter(key => value.flags?.[key] === true).map(key => [key, true]));
  const tasks = M1_TASKS.filter(key => Array.isArray(value.tasks) && value.tasks.includes(key));
  // Reject inconsistent transactions rather than invent their prerequisites.
  if ((flags.OPENED_316 && !flags.FOUND_316_SPARE_KEY) ||
      (tasks.includes('E_HANDOFF') && !flags.HIS_CREDENTIALS) ||
      (tasks.includes('HIS_CREDENTIALS_FOUND') && !flags.HIS_CREDENTIALS) ||
      (tasks.includes('LOCKER_OPENED') && !flags.LOCKER_OPENED) ||
      (tasks.includes('KEY_PICKUP') && !flags.LOCKER_OPENED)) return null;
  return { version: 1, runSeed: run.runSeed, identity: run.currentIdentity, flags, tasks };
}

export function captureM1Checkpoint(gameState, run) {
  return validateM1Checkpoint({ version: 1, runSeed: run.runSeed, identity: run.currentIdentity,
    flags: Object.fromEntries(M1_FLAGS.map(key => [key, gameState.getFlag(key) === true])),
    tasks: M1_TASKS.filter(key => gameState.isTaskComplete(key)) }, run);
}

export function restoreM1Checkpoint(gameState, checkpoint, run) {
  const saved = validateM1Checkpoint(checkpoint, run);
  if (!saved) return false;
  for (const [key, value] of Object.entries(saved.flags)) gameState.setFlag(key, value);
  for (const task of saved.tasks) if (!gameState.isTaskComplete(task)) gameState.markTaskComplete(task);
  return true;
}

export function firstPendingM1Beat(gameState, run, beatCount) {
  // The entry thought is skipped only if the player actually reviewed it in this run.
  if (!run.evidence?.['route:M1:0'] || !gameState.getFlag('OPENED_316')) return 0;
  const done = [true, gameState.isTaskComplete('DUTY_LOG'), gameState.getFlag('HIS_CREDENTIALS'),
    gameState.isTaskComplete('E_HANDOFF'), gameState.getFlag('LOCKER_OPENED'), gameState.isTaskComplete('KEY_PICKUP')];
  for (let index = 1; index < done.length; index++) {
    // A transaction may have saved immediately before the director consumed it.
    // Re-enter its completed binding so the normal update writes the earned journal
    // entry. It needs no repeated player action and cannot consume the pending call.
    if (!done[index] || !run.evidence?.[`route:M1:${index}`]) return index;
  }
  // Li/Zhang must still answer their different calls. Zhou/Chen have no extra call:
  // their completed key transaction is consumed normally by the existing update path.
  return Math.min(6, beatCount - 1);
}
