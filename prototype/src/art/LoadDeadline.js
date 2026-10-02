// Timeout is a failure, never readiness; late completion cannot commit arrival.
export function withLoadDeadline(load, timeoutMs = 20000) {
  let timer;
  return Promise.race([Promise.resolve().then(load), new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('必要資料載入逾時')), timeoutMs);
  })]).finally(() => clearTimeout(timer));
}
