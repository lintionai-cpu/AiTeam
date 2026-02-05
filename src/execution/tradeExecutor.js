export class TradeExecutor {
  constructor(client, riskManager, martingale, getSettings) {
    this.client = client;
    this.riskManager = riskManager;
    this.martingale = martingale;
    this.getSettings = getSettings;
    this.lastSignalKey = null;
    this.lastSignalTs = 0;
  }

  async execute(signal) {
    const settings = this.getSettings();
    if (!this.riskManager.canTrade()) return { skipped: true, reason: 'Risk halt active' };
    if (settings.executedTrades >= settings.runCount) return { skipped: true, reason: 'Run count reached' };

    const signalKey = `${signal.strategyId}:${signal.market}:${signal.side}:${Math.floor(signal.ts / 1000)}`;
    if (this.lastSignalKey === signalKey && Date.now() - this.lastSignalTs < 1200) return { skipped: true, reason: 'Debounced duplicate signal' };
    this.lastSignalKey = signalKey;
    this.lastSignalTs = Date.now();

    const stake = this.martingale.nextStake(settings.stake);
    const payload = {
      buy: 1,
      price: stake,
      parameters: {
        amount: stake,
        basis: 'stake',
        contract_type: signal.side === 'BUY' ? 'CALL' : 'PUT',
        currency: 'USD',
        duration: Number(settings.duration),
        duration_unit: settings.durationUnit,
        symbol: signal.market,
      },
    };

    try {
      const order = await this.client.send(payload, { track: true });
      return { ok: true, order };
    } catch (error) {
      return { ok: false, error: error.message || 'Order failed' };
    }
  }

  resetTradingState() {
    this.lastSignalKey = null;
    this.lastSignalTs = 0;
  }
}
