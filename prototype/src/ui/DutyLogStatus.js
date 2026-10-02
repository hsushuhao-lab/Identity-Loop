// Presentation only. Completion comes from GameState, never from the log UI.
export function renderDutyLogStatus(modal, { signed = false, itemsCollected = false } = {}) {
  const row = modal?.querySelector('.log-table tbody tr');
  const signature = row?.querySelector('.signature-font');
  const status = row?.querySelector('.status-tag');
  const items = row?.querySelectorAll('td')[4];
  const button = modal?.querySelector('#btn-sign-log');
  if (signature) signature.textContent = signed ? '值班醫師（已簽）' : '值班醫師（待簽）';
  if (status) status.textContent = signed ? '已完成簽到' : '簽章就緒';
  if (items) items.textContent = itemsCollected ? '4F 值班室鑰匙與感應卡（已領取）' : '4F 值班室（待自 316 值班櫃領取）';
  if (button) {
    button.disabled = signed;
    button.textContent = signed ? '已完成簽署' : '✍️ 簽名並加蓋值班到勤章';
  }
}
