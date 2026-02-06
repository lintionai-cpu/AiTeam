export class RiskManager {
  canTrade(state, symbol) {
    const { risk } = state.settings;
    if (!risk.enabled) return { ok: true };
    if (state.safety.emergencyStop || risk.paused) return { ok: false, reason: 'Paused by safety controls' };
    if (state.account.sessionPnl <= -Math.abs(risk.drawdownCap)) return { ok: false, reason: 'Drawdown cap reached' };
    if (state.account.losses >= risk.maxConsecutiveLosses) return { ok: false, reason: 'Consecutive loss cap reached' };
    if (state.activeTrades.length >= risk.maxOpenTrades) return { ok: false, reason: 'Max open trades reached' };
    const market = state.markets[symbol];
    if (market?.volatility && market.volatility > risk.volatilityLimit) return { ok: false, reason: 'Volatility filter active' };
    return { ok: true };
  }
}

export class MartingaleManager {
  nextStake(settings, wonLast) {
    const m = settings.martingale;
    if (!m.enabled) return settings.stake;
    if (wonLast) {
      m.currentStep = 0;
      return m.baseStake;
    }
    m.currentStep = Math.min(m.currentStep + 1, m.maxSteps);
    return Math.min(m.baseStake * (m.multiplier ** m.currentStep), m.hardCap);
  }
}
