// Timeout is a failure, never readiness; late completion cannot commit arrival.
// The first visit downloads the shared PBR textures from Pages. Give a cold
// connection more time than an in-game move, which normally reuses the cache.
export const OPENING_LOAD_TIMEOUT_MS = 60000;
export function withLoadDeadline(load, timeoutMs = 20000) {
  let timer;
  return Promise.race([Promise.resolve().then(load), new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('必要資料載入逾時')), timeoutMs);
  })]).finally(() => clearTimeout(timer));
}
