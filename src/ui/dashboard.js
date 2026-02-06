import { badge } from './templates.js';

export class DashboardUI {
  constructor(store) {
    this.store = store;
    this.pending = false;
  }

  mount() {
    this.cache();
    this.store.events.on('state', (state) => this.renderBatched(state));
  }

  cache() {
    this.el = {
      status: document.getElementById('connectionStatus'),
      latency: document.getElementById('latency'),
      balance: document.getElementById('balance'),
      equity: document.getElementById('equity'),
      pnl: document.getElementById('sessionPnl'),
      activeTrades: document.getElementById('activeTrades'),
      tradeHistory: document.getElementById('tradeHistory'),
      scanner: document.getElementById('scannerGrid')
    };
  }

  renderBatched(state) {
    if (this.pending) return;
    this.pending = true;
    requestAnimationFrame(() => {
      this.pending = false;
      this.render(state);
    });
  }

  render(state) {
    this.el.status.textContent = state.connection.status;
    this.el.latency.textContent = `${state.connection.latencyMs ?? '--'} ms`;
    this.el.balance.textContent = `$${state.account.balance.toFixed(2)}`;
    this.el.equity.textContent = `$${state.account.equity.toFixed(2)}`;
    this.el.pnl.textContent = `$${state.account.sessionPnl.toFixed(2)}`;

    this.el.activeTrades.innerHTML = state.activeTrades.slice(0, 8).map((t) => `
      <div class="p-3 rounded-lg bg-slate-900/70 border border-slate-700 flex justify-between">
        <div><p class="text-sm font-medium">${t.symbol}</p><p class="text-xs text-slate-400">${t.strategy}</p></div>
        <div class="text-right">${badge(t.contractType === 'CALL' ? 'BUY' : 'SELL')}<p class="text-xs text-slate-400">$${t.amount}</p></div>
      </div>
    `).join('') || '<p class="text-slate-400 text-sm">No active trades.</p>';

    this.el.tradeHistory.innerHTML = state.tradeHistory.slice(0, 10).map((t) => `
      <tr class="border-b border-slate-800"><td class="p-2">${t.symbol}</td><td class="p-2">${t.strategy}</td><td class="p-2">${badge(t.side)}</td><td class="p-2">${t.pnl.toFixed(2)}</td></tr>
    `).join('');

    this.el.scanner.innerHTML = Object.values(state.scanner).map((x) => `
      <div class="rounded-lg p-3 bg-slate-900/60 border border-slate-700">
        <div class="flex justify-between text-sm"><span>${x.symbol} ${x.timeframe / 60}m</span>${badge(x.side)}</div>
        <p class="text-xs text-slate-400 mt-1">${x.strategy} · confidence ${(x.score * 100).toFixed(0)}%</p>
      </div>
    `).join('');
  }
}
