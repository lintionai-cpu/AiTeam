import { log } from '../utils/logger.js';

export class TradeExecutor {
  constructor({ client, store, riskManager, martingaleManager }) {
    this.client = client;
    this.store = store;
    this.riskManager = riskManager;
    this.martingale = martingaleManager;
    this.cooldownBySymbol = new Map();
    this.cooldownMs = 15_000;
  }

  async execute(signal) {
    const state = this.store.getState();
    const now = Date.now();
    const cooldownUntil = this.cooldownBySymbol.get(signal.symbol) || 0;
    if (now < cooldownUntil) return { skipped: true, reason: 'Cooldown active' };

    const gate = this.riskManager.canTrade(state, signal.symbol);
    if (!gate.ok) return { skipped: true, reason: gate.reason };

    const wonLast = state.tradeHistory[0]?.pnl > 0;
    const stake = this.martingale.nextStake(state.settings, wonLast);
    const payload = {
      symbol: signal.symbol,
      contractType: signal.side === 'BUY' ? 'CALL' : 'PUT',
      amount: stake,
      duration: state.settings.duration.value,
      duration_unit: state.settings.duration.type[0],
      basis: 'stake'
    };

    this.cooldownBySymbol.set(signal.symbol, now + this.cooldownMs);
    if (state.settings.featureFlags.paperTrading) {
      const paper = {
        id: `paper-${now}`,
        ...payload,
        status: 'OPEN',
        openedAt: now,
        strategy: signal.strategy,
        score: signal.score
      };
      this.store.patch((s) => s.activeTrades.unshift(paper));
      log('info', 'paper trade opened', paper);
      return { paper: true };
    }

    const result = await this.client.placeTrade(payload);
    log('info', 'live trade placed', { result });
    return result;
  }
}
