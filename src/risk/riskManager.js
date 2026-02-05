export class RiskManager {
  constructor(settings) {
    this.settings = settings;
    this.state = {
      halted: false,
      consecutiveLosses: 0,
      peakBalance: 0,
      pnl: 0,
    };
  }

  updateSettings(next) {
    this.settings = { ...this.settings, ...next };
  }

  onBalance(balance) {
    this.state.peakBalance = Math.max(this.state.peakBalance, balance);
    const drawdownPct = this.state.peakBalance > 0 ? ((this.state.peakBalance - balance) / this.state.peakBalance) * 100 : 0;
    if (this.settings.enabled && (drawdownPct >= this.settings.maxDrawdownPct || balance <= this.settings.equityFloor || this.state.consecutiveLosses >= this.settings.maxConsecutiveLosses)) {
      this.state.halted = true;
    }
  }

  onTradeResult(profit) {
    this.state.pnl += profit;
    if (profit < 0) this.state.consecutiveLosses += 1;
    else this.state.consecutiveLosses = 0;
  }

  canTrade() {
    return !this.settings.enabled || !this.state.halted;
  }

  resetTradingState() {
    this.state.halted = false;
    this.state.consecutiveLosses = 0;
    this.state.pnl = 0;
  }
}
