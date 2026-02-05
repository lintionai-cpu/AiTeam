export function renderAccount(el, account) {
  if (!account) return;
  el.innerHTML = `
    <div>Balance: <b>${Number(account.balance).toFixed(2)} ${account.currency || ''}</b></div>
    <div>Login ID: <b>${account.loginid || '-'}</b></div>
  `;
}

function listToHtml(items, mapper) {
  return items.slice().reverse().slice(0, 120).map(mapper).join('');
}

export function renderLogs({ signalsEl, activeTradesEl, historyEl, signals, activeTrades, history }) {
  signalsEl.innerHTML = listToHtml(signals, (s) => `<div>[${new Date(s.ts).toLocaleTimeString()}] <b>${s.market}</b> ${s.strategyId} → ${s.side} (${Math.round(s.confidence * 100)}%)</div>`);
  activeTradesEl.innerHTML = listToHtml(activeTrades, (t) => `<div>${t.contract_id || '-'} | ${t.underlying || '-'} | ${t.contract_type || '-'} | ${t.status || '-'}</div>`);
  historyEl.innerHTML = listToHtml(history, (h) => `<div>${h.transaction_time || '-'} | ${h.action_type || '-'} | ${h.amount || '-'}</div>`);
}
